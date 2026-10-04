/**
 * Billing orchestration — the only place a payment becomes access.
 *
 * Three callers share this logic so they can never disagree:
 *   - `startCheckout`  (POST /api/billing/checkout) creates the payment row and
 *     the Razorpay order, or activates a 100%-discount checkout outright.
 *   - `confirmPayment` (POST /api/billing/verify AND the Razorpay webhook)
 *     turns a paid order into a subscription period.
 *   - the tenant console pages, which render `getStoreEntitlement`.
 *
 * Money never moves through a float here. Amounts are integer paise from the
 * plan row to the payment row; the only rounding is `Math.round` on a
 * percentage or a monthly MRR normalisation.
 *
 * Idempotency is deliberate and load-bearing. Razorpay delivers webhooks at
 * least once and out of order, and the browser callback races the webhook, so:
 *   - the period end is computed ONCE, at checkout, and stored on the payment
 *     (`periodEndsAt`). Replaying a confirmation writes the same timestamp
 *     rather than stacking a second period onto the first.
 *   - `recordRedemption` is keyed by order id, so a replay cannot consume a
 *     second slot of a limited coupon.
 */

import {
  addPeriod,
  deriveEntitlement,
  evaluateCoupon,
  priceBreakdown,
  PriceBreakdown,
  MIN_CHARGEABLE_INR,
} from "./billing";
import {
  createPaymentRecord,
  getCouponByCode,
  getPaymentByOrder,
  getPayments,
  getPlanConfig,
  recordRedemption,
  updatePayment,
} from "./billing-data";
import { DEFAULT_TRIAL_MINUTES } from "./plans";
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured } from "./razorpay";
import { cancelSubscription, getSubscriptions, upsertSubscription } from "./store";
import { Coupon, Payment, StoreEntitlement, Subscription } from "./types";

/** A refusal the route can render as-is. `status` is an HTTP status code. */
export class BillingError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "BillingError";
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The live subscription for a location.
 *
 * A store that churned and re-subscribed, or a database that predates the
 * one-row-per-store invariant, can hold more than one row. The live row (no
 * `endedAt`) wins; otherwise the newest row.
 */
export async function getStoreSubscription(storeId: string): Promise<Subscription | null> {
  const rows = await getSubscriptions([storeId]);
  if (rows.length === 0) return null;
  const live = rows.find((s) => !s.endedAt);
  if (live) return live;
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
}

/** What a location may do right now — the gate the menu API and the UI share. */
export async function getStoreEntitlement(storeId: string): Promise<StoreEntitlement> {
  const subscription = await getStoreSubscription(storeId);
  const plan = subscription ? await getPlanConfig(subscription.plan) : null;
  return deriveEntitlement(storeId, subscription, plan);
}

export async function listPaymentsForStore(storeId: string): Promise<Payment[]> {
  return getPayments(storeId);
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                   */
/* -------------------------------------------------------------------------- */

export interface CheckoutSession {
  kind: "order" | "activated";
  payment: Payment;
  /** Present when `kind === "order"`: what the browser needs to open checkout. */
  razorpay?: {
    keyId: string;
    orderId: string;
    amountInr: number;
    currency: string;
    name: string;
    description: string;
  };
  breakdown: PriceBreakdown;
  coupon?: { code: string; discountInr: number };
  /** Present when `kind === "activated"`: the subscription now in force. */
  subscription?: Subscription;
  entitlement: StoreEntitlement;
}

/** The period end an order will grant, computed once so replays converge. */
function computePeriodEnd(existing: Subscription | null, period: "monthly" | "annual", now: Date): string {
  const nowMs = now.getTime();
  let baseMs = nowMs;

  if (existing && (existing.status === "active" || existing.status === "paused") && existing.currentPeriodEnd) {
    const existingEnd = new Date(existing.currentPeriodEnd).getTime();
    // Renewing early never loses paid-for days: stack onto the later date.
    if (!Number.isNaN(existingEnd) && existingEnd > nowMs) baseMs = existingEnd;
  }

  return addPeriod(new Date(baseMs), period).toISOString();
}

function descriptionFor(planName: string, period: "monthly" | "annual"): string {
  return period === "annual"
    ? `${planName} plan — annual subscription`
    : `${planName} plan — monthly subscription`;
}

/**
 * Starts a subscription purchase for one location.
 *
 * Returns either a Razorpay order to open in checkout, or (when a coupon
 * brings the total below what the gateway will accept) an immediate activation
 * with no gateway round-trip.
 */
export async function startCheckout(input: {
  storeId: string;
  planId: string;
  couponCode?: string;
  gstin?: string;
  actor?: string;
}): Promise<CheckoutSession> {
  const plan = await getPlanConfig(input.planId);
  if (!plan) throw new BillingError("That plan is no longer available.", 404);

  const existing = await getStoreSubscription(input.storeId);
  const isCurrentPlan = existing?.plan === plan.id;
  if (!plan.isActive && !isCurrentPlan) {
    throw new BillingError("That plan is no longer available.", 404);
  }

  const entitlementBefore = deriveEntitlement(input.storeId, existing, plan);

  // Coupons are evaluated, never trusted: an unusable code is reported with the
  // reason it failed instead of being silently ignored.
  let coupon: Coupon | null = null;
  if (input.couponCode) {
    coupon = await getCouponByCode(input.couponCode);
    const evaluation = evaluateCoupon(coupon, {
      storeId: input.storeId,
      planId: plan.id,
      grossInr: plan.priceInr,
    });
    if (!evaluation.usable) {
      throw new BillingError(evaluation.message || "That coupon cannot be used.", 400);
    }
  }

  const breakdown = priceBreakdown(plan, coupon);
  const now = new Date();
  const periodEndsAt = computePeriodEnd(existing, plan.period, now);
  const basePayment = {
    storeId: input.storeId,
    planId: plan.id,
    period: plan.period,
    grossInr: breakdown.grossInr,
    discountInr: breakdown.discountInr,
    taxInr: breakdown.taxInr,
    amountInr: breakdown.totalInr,
    couponCode: coupon?.code,
    gstin: input.gstin,
    signatureVerified: false,
    periodEndsAt,
  };

  /* ---- Free activation: a 100% coupon, or a genuinely free plan ---------- */

  if (breakdown.totalInr < MIN_CHARGEABLE_INR) {
    // Razorpay rejects orders below ₹1, so a fully discounted checkout is
    // recorded as a zero-amount activation rather than a ₹0 order.
    const syntheticOrderId = `free_${input.storeId}_${now.getTime()}`;
    const payment = await createPaymentRecord({
      ...basePayment,
      orderId: syntheticOrderId,
      status: "paid",
      confirmedVia: "checkout",
      paidAt: now.toISOString(),
    });

    if (coupon && payment.discountInr > 0) {
      await recordRedemption({
        couponId: coupon.id,
        code: coupon.code,
        storeId: input.storeId,
        planId: plan.id,
        orderId: payment.orderId,
        discountInr: payment.discountInr,
      });
    }

    const subscription = await activateSubscription({
      payment,
      existing,
      planName: plan.name,
      gstin: input.gstin,
    });

    return {
      kind: "activated",
      payment,
      breakdown,
      coupon: coupon ? { code: coupon.code, discountInr: payment.discountInr } : undefined,
      subscription,
      entitlement: await getStoreEntitlement(input.storeId),
    };
  }

  /* ---- Gateway order ----------------------------------------------------- */

  if (!isRazorpayConfigured()) {
    throw new BillingError(
      "Online payments are not configured yet. Ask the platform owner to record this subscription.",
      503
    );
  }

  const payment = await createPaymentRecord({
    ...basePayment,
    orderId: `pending_${input.storeId}_${now.getTime()}`,
    status: "created",
  });

  let order;
  try {
    order = await createRazorpayOrder({
      amountInr: payment.amountInr,
      receipt: payment.id,
      notes: {
        storeId: input.storeId,
        planId: plan.id,
        paymentId: payment.id,
        ...(coupon ? { couponCode: coupon.code } : {}),
      },
    });
  } catch (err) {
    await updatePayment(payment.orderId, {
      status: "failed",
      failureReason: err instanceof Error ? err.message : "order creation failed",
    });
    throw err;
  }

  // The Razorpay order id is the idempotency key the webhook will look up by.
  const stored = await updatePayment(payment.orderId, { orderId: order.id });
  const finalPayment = stored || { ...payment, orderId: order.id };

  return {
    kind: "order",
    payment: finalPayment,
    razorpay: {
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amountInr: order.amount || finalPayment.amountInr,
      currency: order.currency || "INR",
      name: "Credo",
      description: descriptionFor(plan.name, plan.period),
    },
    breakdown,
    coupon: coupon ? { code: coupon.code, discountInr: finalPayment.discountInr } : undefined,
    entitlement: entitlementBefore,
  };
}

/* -------------------------------------------------------------------------- */
/* Confirmation                                                               */
/* -------------------------------------------------------------------------- */

export interface ConfirmResult {
  payment: Payment | null;
  subscription: Subscription | null;
  entitlement: StoreEntitlement | null;
  /** True when this order had already been applied — the replay was ignored. */
  alreadyProcessed: boolean;
}

/**
 * Activates the subscription a paid order bought.
 *
 * Called by BOTH the browser callback (after signature verification) and the
 * webhook. Safe to call twice for the same order: the second call returns the
 * existing state and changes nothing.
 */
export async function confirmPayment(input: {
  orderId: string;
  paymentId?: string;
  signatureVerified: boolean;
  via: "checkout" | "webhook";
  gstin?: string;
}): Promise<ConfirmResult> {
  const payment = await getPaymentByOrder(input.orderId);
  if (!payment) {
    return { payment: null, subscription: null, entitlement: null, alreadyProcessed: false };
  }

  if (payment.status === "paid") {
    const subscription = await getStoreSubscription(payment.storeId);
    return {
      payment,
      subscription,
      entitlement: await getStoreEntitlement(payment.storeId),
      alreadyProcessed: true,
    };
  }

  const plan = await getPlanConfig(payment.planId);
  if (!plan) {
    await updatePayment(input.orderId, {
      status: "failed",
      failureReason: "The plan this order was for no longer exists",
    });
    throw new BillingError("The plan this order was for no longer exists.", 409);
  }

  const existing = await getStoreSubscription(payment.storeId);

  // The period end was fixed at checkout, so a replay cannot stack a second
  // period on top of the first.
  const periodEndsAt =
    payment.periodEndsAt || computePeriodEnd(existing, payment.period, new Date());

  const subscription = await activateSubscription({
    payment: { ...payment, periodEndsAt },
    existing,
    planName: plan.name,
    // Prefer what was captured at checkout: a webhook confirmation has no
    // browser payload to carry the buyer's GSTIN, and without it the tax
    // invoice cannot be issued.
    gstin: payment.gstin || input.gstin,
  });

  if (payment.couponCode && payment.discountInr > 0) {
    const coupon = await getCouponByCode(payment.couponCode);
    if (coupon) {
      await recordRedemption({
        couponId: coupon.id,
        code: coupon.code,
        storeId: payment.storeId,
        planId: payment.planId,
        orderId: payment.orderId,
        paymentId: input.paymentId || payment.paymentId,
        discountInr: payment.discountInr,
      });
    }
  }

  // Mark paid LAST: if the process dies between the subscription write and
  // this line, a retry re-runs activation, which writes the same period end.
  const updated =
    (await updatePayment(input.orderId, {
      status: "paid",
      paymentId: input.paymentId || payment.paymentId,
      signatureVerified: input.signatureVerified,
      confirmedVia: input.via,
      paidAt: new Date().toISOString(),
      failureReason: undefined,
    })) || payment;

  return {
    payment: updated,
    subscription,
    entitlement: await getStoreEntitlement(payment.storeId),
    alreadyProcessed: false,
  };
}

/** Records a failed attempt without touching the subscription. */
export async function failPayment(orderId: string, reason?: string): Promise<Payment | null> {
  const payment = await getPaymentByOrder(orderId);
  if (!payment || payment.status === "paid") return payment;

  return updatePayment(orderId, {
    status: "failed",
    failureReason: (reason || "payment failed").slice(0, 300),
  });
}

/* -------------------------------------------------------------------------- */
/* Subscription writes                                                        */
/* -------------------------------------------------------------------------- */

async function activateSubscription(input: {
  payment: Payment;
  existing: Subscription | null;
  planName: string;
  gstin?: string;
}): Promise<Subscription> {
  const { payment, existing } = input;
  const now = new Date().toISOString();

  // MRR is a monthly figure. An annual plan is normalised down so the revenue
  // summary does not report 12x the recurring amount. Tax is excluded — GST is
  // collected on the government's behalf, not revenue.
  const netInr = Math.max(0, payment.grossInr - payment.discountInr);
  const mrrInr = payment.period === "annual" ? Math.round(netInr / 12) : netInr;

  return upsertSubscription({
    id: existing?.id,
    storeId: payment.storeId,
    plan: payment.planId,
    status: "active",
    mrrInr,
    billingPeriod: payment.period,
    gstin: input.gstin || existing?.gstin,
    trialStartedAt: existing?.trialStartedAt,
    trialMinutes: existing?.trialMinutes,
    currentPeriodEnd: payment.periodEndsAt,
    startedAt: existing?.startedAt || now,
    endedAt: undefined,
    cancelReason: undefined,
  });
}

/**
 * Starts (or restarts) the free trial on a location.
 *
 * Called automatically when a location is created, and by a super admin to
 * grant an extension. The trial has no cron: `deriveEntitlement` computes it
 * from the clock, so it cannot fail to expire.
 */
export async function beginTrial(
  storeId: string,
  trialMinutes: number = DEFAULT_TRIAL_MINUTES
): Promise<Subscription> {
  const existing = await getStoreSubscription(storeId);
  const now = new Date().toISOString();

  return upsertSubscription({
    id: existing?.id,
    storeId,
    plan: existing?.plan || "solo",
    status: "trial",
    mrrInr: 0,
    billingPeriod: existing?.billingPeriod || "monthly",
    gstin: existing?.gstin,
    // Restarting the clock is the point of this call — an extension is a fresh
    // window, not an edit to an already-running one.
    trialStartedAt: now,
    trialMinutes,
    currentPeriodEnd: existing?.currentPeriodEnd,
    startedAt: existing?.startedAt || now,
    endedAt: undefined,
    cancelReason: undefined,
  });
}

/** Ends a location's subscription. Churn is recorded, never inferred. */
export async function cancelStoreSubscription(
  storeId: string,
  reason?: string
): Promise<Subscription | null> {
  return cancelSubscription(storeId, reason);
}
