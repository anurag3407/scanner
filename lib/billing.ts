/**
 * The billing domain — pure functions only.
 *
 * Nothing here touches storage, the network or Razorpay. Every decision a
 * tenant's access depends on (is the trial live, is the period paid up, what
 * does a coupon do to the amount due, how many locations does the plan allow)
 * is computed here so it can be unit-tested without a database or a gateway,
 * and so the same arithmetic is used by the checkout route, the console and the
 * public pricing page.
 *
 * Money is integer paise throughout. A float rupee figure is only ever produced
 * for display, at the very edge.
 */

import {
  BillingPeriod,
  Coupon,
  PlanConfig,
  StoreEntitlement,
  Subscription,
} from "./types";
import { DEFAULT_TRIAL_MINUTES, PERIOD_DAYS } from "./plans";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Trial                                                                      */
/* -------------------------------------------------------------------------- */

/** A trial must not be so long that it is a free plan, nor zero-length. */
export const MIN_TRIAL_MINUTES = 5;
export const MAX_TRIAL_MINUTES = 60 * 24 * 30;

/**
 * The window a fresh trial runs for: `trialStartedAt` plus `trialMinutes`.
 *
 * Falls back to the default length when the stored value is missing or absurd,
 * so a hand-edited row can never grant a permanent free trial.
 */
export function trialWindow(
  trialStartedAt?: string,
  trialMinutes?: number
): { startsAt: string; endsAt: string } | undefined {
  if (!trialStartedAt) return undefined;
  const start = new Date(trialStartedAt);
  if (Number.isNaN(start.getTime())) return undefined;

  const minutes =
    Number.isFinite(trialMinutes) && Number(trialMinutes) > 0
      ? Math.min(Number(trialMinutes), MAX_TRIAL_MINUTES)
      : DEFAULT_TRIAL_MINUTES;

  return {
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + minutes * MINUTE_MS).toISOString(),
  };
}

/** Adds one billing period to a date, in whole days. */
export function addPeriod(from: Date, period: BillingPeriod): Date {
  const days = period === "annual" ? PERIOD_DAYS.annual : PERIOD_DAYS.monthly;
  return new Date(from.getTime() + days * DAY_MS);
}

/** Whole minutes between now and `iso`, floored at zero. */
export function minutesUntil(iso: string | undefined, now = Date.now()): number {
  if (!iso) return 0;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.ceil((at - now) / MINUTE_MS));
}

/** Whole days between now and `iso`, floored at zero. */
export function daysUntil(iso: string | undefined, now = Date.now()): number {
  if (!iso) return 0;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.ceil((at - now) / DAY_MS));
}

/* -------------------------------------------------------------------------- */
/* Pricing                                                                    */
/* -------------------------------------------------------------------------- */

export interface PriceBreakdown {
  /** Plan price for the period, in paise, before discount and tax. */
  grossInr: number;
  /** Discount applied, in paise. Never larger than `grossInr`. */
  discountInr: number;
  /** Amount the discount applies to: gross − discount. */
  netInr: number;
  /** GST charged on `netInr`, in paise. */
  taxInr: number;
  /** What the customer pays: net + tax, in paise. */
  totalInr: number;
  /** GST percent used, for the invoice and the UI. */
  gstPercent: number;
}

/**
 * Applies a coupon's discount to a price, in integer paise.
 *
 * Deliberately does NOT decide whether the coupon is *usable* — expiry,
 * eligibility and redemption limits belong to `evaluateCoupon`. This is the
 * arithmetic only, and it clamps so a ₹500 coupon on a ₹999 plan can never
 * produce a negative amount due (which would be a payment request for less
 * than zero, or a refund).
 */
export function applyDiscount(grossInr: number, coupon?: Coupon | null): number {
  const gross = Math.max(0, Math.round(grossInr));
  if (!coupon) return 0;

  if (coupon.discountType === "percent") {
    const percent = Math.min(100, Math.max(0, Number(coupon.discountValue) || 0));
    // Round to the nearest paise rather than truncating: a 10% coupon on ₹999
    // is ₹99.90, and truncation would quietly short the customer.
    return Math.min(gross, Math.round((gross * percent) / 100));
  }

  const amount = Math.max(0, Math.round(Number(coupon.discountValue) || 0));
  return Math.min(gross, amount);
}

/**
 * The full price breakdown for one billing period.
 *
 * GST is charged on the discounted amount, not the list price: a coupon is a
 * reduction in consideration, and taxing the pre-discount figure would overstate
 * both the tax and the customer's input credit.
 */
export function priceBreakdown(
  plan: Pick<PlanConfig, "priceInr" | "gstPercent">,
  coupon?: Coupon | null
): PriceBreakdown {
  const grossInr = Math.max(0, Math.round(Number(plan.priceInr) || 0));
  const discountInr = applyDiscount(grossInr, coupon);
  const netInr = grossInr - discountInr;
  const gstPercent = Math.min(28, Math.max(0, Number(plan.gstPercent) || 0));
  const taxInr = Math.round((netInr * gstPercent) / 100);

  return {
    grossInr,
    discountInr,
    netInr,
    taxInr,
    totalInr: netInr + taxInr,
    gstPercent,
  };
}

/**
 * The smallest charge Razorpay will accept. An order below this is rejected by
 * the gateway, so a 100%-off coupon must be handled as a zero-amount
 * activation rather than by creating a ₹0 order.
 */
export const MIN_CHARGEABLE_INR = 100; // ₹1.00

/* -------------------------------------------------------------------------- */
/* Coupon eligibility                                                         */
/* -------------------------------------------------------------------------- */

export type CouponRejection =
  | "not_found"
  | "inactive"
  | "expired"
  | "exhausted"
  | "wrong_plan"
  | "wrong_store";

export interface CouponEvaluation {
  usable: boolean;
  /** Present only when `usable` is false. */
  reason?: CouponRejection;
  /** Owner-facing explanation, safe to render. */
  message?: string;
  discountInr: number;
}

const REJECTION_MESSAGES: Record<CouponRejection, string> = {
  not_found: "That coupon code is not valid.",
  inactive: "That coupon has been withdrawn.",
  expired: "That coupon has expired.",
  exhausted: "That coupon has already been fully redeemed.",
  wrong_plan: "That coupon does not apply to this plan.",
  wrong_store: "That coupon does not apply to this location.",
};

/**
 * Decides whether a coupon may be used for a specific store + plan right now.
 *
 * `now` is injectable so expiry is testable without waiting for a clock. Every
 * rejection returns a reason, never a silent zero discount: an owner who typed
 * a valid-looking code deserves to know why it did not apply.
 */
export function evaluateCoupon(
  coupon: Coupon | null | undefined,
  context: { storeId: string; planId: string; grossInr: number },
  now: number = Date.now()
): CouponEvaluation {
  const reject = (reason: CouponRejection): CouponEvaluation => ({
    usable: false,
    reason,
    message: REJECTION_MESSAGES[reason],
    discountInr: 0,
  });

  if (!coupon) return reject("not_found");
  if (!coupon.isActive) return reject("inactive");

  if (coupon.expiresAt) {
    const expiry = new Date(coupon.expiresAt).getTime();
    if (Number.isNaN(expiry)) return reject("expired");
    if (expiry <= now) return reject("expired");
  }

  if (
    typeof coupon.maxRedemptions === "number" &&
    coupon.maxRedemptions >= 0 &&
    coupon.timesRedeemed >= coupon.maxRedemptions
  ) {
    return reject("exhausted");
  }

  if (coupon.planId && coupon.planId !== context.planId) return reject("wrong_plan");
  if (coupon.storeId && coupon.storeId !== context.storeId) return reject("wrong_store");

  const discountInr = applyDiscount(context.grossInr, coupon);
  if (discountInr <= 0) return reject("inactive");

  return { usable: true, discountInr };
}

/* -------------------------------------------------------------------------- */
/* Entitlement                                                                */
/* -------------------------------------------------------------------------- */

/**
 * What a location may do right now, derived from its subscription and the clock.
 *
 * This is the function the menu gate calls. It is intentionally time-based
 * rather than flag-based: an elapsed trial or a lapsed period locks customisation
 * with no scheduled job involved, so a Worker that never runs cannot leave a
 * tenant in a state it did not pay for.
 *
 * A `paused` subscription keeps its access until `currentPeriodEnd` — pausing
 * means "do not renew", not "revoke the month already paid for".
 */
export function deriveEntitlement(
  storeId: string,
  subscription: Subscription | null | undefined,
  plan: Pick<PlanConfig, "name" | "maxLocations"> | null | undefined,
  now: number = Date.now()
): StoreEntitlement {
  const planName = plan?.name || subscription?.plan || "No plan";
  const maxLocations = Math.max(1, Number(plan?.maxLocations) || 1);

  const base: StoreEntitlement = {
    storeId,
    state: "none",
    entitled: false,
    planId: subscription?.plan || "",
    planName,
    maxLocations,
    trialMinutesRemaining: 0,
    daysRemaining: 0,
  };

  if (!subscription) {
    return { ...base, reason: "No subscription has been recorded for this location." };
  }

  const status = subscription.status;

  if (status === "lead") {
    return {
      ...base,
      state: "none",
      reason: "This location has not been subscribed yet. Pick a plan to customise the menu.",
    };
  }

  if (status === "trial") {
    const window = trialWindow(subscription.trialStartedAt, subscription.trialMinutes);
    if (!window) {
      return {
        ...base,
        state: "expired",
        reason: "The trial on this location has ended. Subscribe to keep editing the menu.",
      };
    }
    const remaining = minutesUntil(window.endsAt, now);
    if (remaining <= 0) {
      return {
        ...base,
        state: "expired",
        trialEndsAt: window.endsAt,
        reason: "The trial on this location has ended. Subscribe to keep editing the menu.",
      };
    }
    return {
      ...base,
      state: "trial",
      entitled: true,
      trialEndsAt: window.endsAt,
      trialMinutesRemaining: remaining,
    };
  }

  if (status === "churned") {
    return {
      ...base,
      state: "churned",
      reason: "This subscription was cancelled. Re-subscribe to edit the menu again.",
    };
  }

  // active | paused: access runs until the paid period ends.
  const periodEnd = subscription.currentPeriodEnd;
  const remainingDays = daysUntil(periodEnd, now);

  if (!periodEnd) {
    // A paid subscription with no period end would otherwise be access forever.
    // Treat it as lapsed and make the operator record the period.
    return {
      ...base,
      state: status === "paused" ? "paused" : "expired",
      reason: "This subscription has no paid period on record. Re-subscribe to restore access.",
    };
  }

  if (remainingDays <= 0) {
    return {
      ...base,
      state: "expired",
      currentPeriodEnd: periodEnd,
      reason: "The paid period has ended. Renew to keep editing the menu.",
    };
  }

  return {
    ...base,
    state: status === "paused" ? "paused" : "active",
    entitled: true,
    currentPeriodEnd: periodEnd,
    daysRemaining: remainingDays,
  };
}

/* -------------------------------------------------------------------------- */
/* Display helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Integer paise to a float rupee figure. Display only — never arithmetic.
 *
 * Negative paise clamp to zero: nothing in this product can cost less than
 * nothing, and "₹-1.00" on a pricing page is a bug the reader should never see.
 */
export const paiseToRupees = (paise: number): number =>
  Math.max(0, Math.round(Number(paise) || 0)) / 100;

/** Integer paise to a formatted INR string ("₹999.00"). */
export const formatInr = (paise: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));