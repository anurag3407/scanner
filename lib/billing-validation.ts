/**
 * Input validation for everything billing-related.
 *
 * Same contract as `lib/validation.ts`: a malformed field is *reported*, never
 * silently coerced, and only fields that are present and well-formed are
 * returned so a partial PATCH cannot wipe an untouched value.
 *
 * Money deserves the extra care. A price arrives from a form as rupees
 * ("999", "999.50") and is stored as integer paise, so the conversion happens
 * exactly once, here, by rounding rather than truncating — ₹999.50 must never
 * become ₹999.
 */

import {
  BillingPeriod,
  Coupon,
  CouponDiscountType,
  PlanConfig,
} from "./types";
import { MAX_TRIAL_MINUTES, MIN_TRIAL_MINUTES } from "./billing";
import { GST_RATE_PERCENT } from "./plans";
import { isValidGstin } from "./validation";

/** Upper bound on a plan price: ₹10,00,000 per period. */
export const MAX_PLAN_PRICE_RUPEES = 1_000_000;
/** Upper bound on a fixed-amount coupon: ₹10,00,000. */
export const MAX_COUPON_AMOUNT_RUPEES = 1_000_000;
const MAX_NAME = 60;
const MAX_TAGLINE = 160;
const MAX_FEATURE = 200;
const MAX_FEATURES = 12;
const MAX_NOTE = 200;

const PLAN_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const COUPON_CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

/** True for a value shaped like a server-minted store id. */
export function isStoreId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

/**
 * Rupees (number or numeric string, possibly with a currency symbol) to integer
 * paise. Returns null for anything that is not a finite, non-negative amount,
 * so a garbage price can never become ₹0 by accident.
 */
export function rupeesToPaise(value: unknown): number | null {
  let amount: number;
  if (typeof value === "number") {
    amount = value;
  } else if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    amount = Number(cleaned);
  } else {
    return null;
  }

  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

/** Normalizes a plan id: lowercase, and only characters a URL can carry. */
export function normalizePlanId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toLowerCase().replace(/\s+/g, "-");
  return PLAN_ID_PATTERN.test(id) ? id : null;
}

/** Normalizes a coupon code: uppercase, dashes for spaces, punctuation stripped. */
export function normalizeCouponCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9_-]/g, "");
  return COUPON_CODE_PATTERN.test(code) ? code : null;
}

function sanitizeFeatureList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    const line = String(item).replace(/\s+/g, " ").trim().slice(0, MAX_FEATURE);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= MAX_FEATURES) break;
  }
  return out;
}

function parseBillingPeriod(value: unknown): BillingPeriod | null {
  if (value === "monthly" || value === "annual") return value;
  return null;
}

function parseGstPercent(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return GST_RATE_PERCENT;
  const percent = Number(value);
  // 0 is legitimate (an exempt supply); 28 is the highest GST slab in India.
  if (!Number.isFinite(percent) || percent < 0 || percent > 28) return null;
  return Math.round(percent * 100) / 100;
}

function parsePositiveInt(value: unknown, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) return null;
  return parsed;
}

function parseOptionalIsoDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

export type PlanWriteResult =
  | { ok: true; value: Partial<PlanConfig> & { id: string } }
  | { ok: false; error: string };

/**
 * Validates a plan create/update.
 *
 * On create (`mode: "create"`) the required fields must be present. On update
 * only the supplied fields are validated and returned, so a price change from
 * the console cannot blank the tagline.
 */
export function normalizePlanInput(
  body: Record<string, unknown>,
  mode: "create" | "update"
): PlanWriteResult {
  const value: Partial<PlanConfig> & { id?: string } = {};

  if (mode === "create" || body.id !== undefined) {
    const id = normalizePlanId(body.id);
    if (!id) {
      return { ok: false, error: "Plan id must be lowercase letters, digits, - or _ (max 40 chars)" };
    }
    value.id = id;
  }

  if (mode === "create" || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
    if (!name) return { ok: false, error: "Plan name is required" };
    value.name = name;
  }

  if (body.tagline !== undefined) {
    value.tagline = typeof body.tagline === "string" ? body.tagline.trim().slice(0, MAX_TAGLINE) : "";
  } else if (mode === "create") {
    value.tagline = "";
  }

  if (mode === "create" || body.priceRupees !== undefined || body.priceInr !== undefined) {
    // Accept either the display unit (rupees) or the stored unit (paise), but
    // never both in one payload — two sources for one amount is how prices drift.
    const hasRupees = body.priceRupees !== undefined && body.priceRupees !== null && body.priceRupees !== "";
    const hasPaise = body.priceInr !== undefined && body.priceInr !== null && body.priceInr !== "";

    if (hasRupees && hasPaise) {
      return { ok: false, error: "Send either priceRupees or priceInr, not both" };
    }

    if (hasPaise) {
      const paise = Number(body.priceInr);
      if (!Number.isInteger(paise) || paise < 0 || paise > MAX_PLAN_PRICE_RUPEES * 100) {
        return { ok: false, error: "priceInr must be a non-negative integer number of paise" };
      }
      value.priceInr = paise;
    } else if (hasRupees) {
      const paise = rupeesToPaise(body.priceRupees);
      if (paise === null || paise > MAX_PLAN_PRICE_RUPEES * 100) {
        return { ok: false, error: "Price must be a positive number of rupees" };
      }
      value.priceInr = paise;
    } else if (mode === "create") {
      return { ok: false, error: "A price is required" };
    }
  }

  if (body.period !== undefined || mode === "create") {
    const period = parseBillingPeriod(body.period ?? "monthly");
    if (!period) return { ok: false, error: "period must be monthly or annual" };
    value.period = period;
  }

  if (body.maxLocations !== undefined || mode === "create") {
    const maxLocations = parsePositiveInt(body.maxLocations ?? 1, 10_000);
    if (maxLocations === null) {
      return { ok: false, error: "maxLocations must be a positive whole number" };
    }
    value.maxLocations = maxLocations;
  }

  if (body.gstPercent !== undefined || mode === "create") {
    const gstPercent = parseGstPercent(body.gstPercent);
    if (gstPercent === null) return { ok: false, error: "gstPercent must be between 0 and 28" };
    value.gstPercent = gstPercent;
  }

  if (body.features !== undefined) {
    value.features = sanitizeFeatureList(body.features);
  } else if (mode === "create") {
    value.features = [];
  }

  if (body.featured !== undefined) {
    value.featured = body.featured === true || body.featured === "true";
  }

  if (body.isActive !== undefined) {
    value.isActive = body.isActive === true || body.isActive === "true";
  } else if (mode === "create") {
    value.isActive = true;
  }

  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1000) {
      return { ok: false, error: "sortOrder must be a whole number between 0 and 1000" };
    }
    value.sortOrder = sortOrder;
  }

  return { ok: true, value: value as Partial<PlanConfig> & { id: string } };
}

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

export type CouponWriteResult =
  | { ok: true; value: Partial<Coupon> & { code: string } }
  | { ok: false; error: string };

/**
 * Validates a coupon create/update.
 *
 * `timesRedeemed` is deliberately NOT writable from here: it is derived from
 * the redemption ledger, so letting an operator set it would make the
 * redemption limit a suggestion.
 */
export function normalizeCouponInput(
  body: Record<string, unknown>,
  mode: "create" | "update"
): CouponWriteResult {
  const value: Partial<Coupon> & { code?: string } = {};

  if (mode === "create" || body.code !== undefined) {
    const code = normalizeCouponCode(body.code);
    if (!code) {
      return { ok: false, error: "Coupon code must be 3-32 characters: A-Z, 0-9, - or _" };
    }
    value.code = code;
  }

  if (mode === "create" || body.discountType !== undefined) {
    const type = body.discountType === "amount" ? "amount" : body.discountType === "percent" ? "percent" : null;
    if (!type) return { ok: false, error: "discountType must be percent or amount" };
    value.discountType = type as CouponDiscountType;
  }

  if (mode === "create" || body.discountValue !== undefined) {
    const type = (value.discountType || (body.discountType as CouponDiscountType)) ?? "percent";
    if (type === "percent") {
      const percent = Number(body.discountValue);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
        return { ok: false, error: "A percentage discount must be greater than 0 and at most 100" };
      }
      value.discountValue = Math.round(percent * 100) / 100;
    } else {
      const paise = rupeesToPaise(body.discountValue);
      if (paise === null || paise <= 0 || paise > MAX_COUPON_AMOUNT_RUPEES * 100) {
        return { ok: false, error: "An amount discount must be a positive number of rupees" };
      }
      value.discountValue = paise;
    }
  }

  if (body.maxRedemptions !== undefined) {
    if (body.maxRedemptions === null || body.maxRedemptions === "") {
      value.maxRedemptions = undefined;
    } else {
      const max = parsePositiveInt(body.maxRedemptions, 1_000_000);
      if (body.maxRedemptions !== undefined && Number(body.maxRedemptions) === 0) {
        return { ok: false, error: "maxRedemptions must be at least 1, or left blank for unlimited" };
      }
      if (max === null) return { ok: false, error: "maxRedemptions must be a whole number" };
      value.maxRedemptions = max;
    }
  }

  if (body.expiresAt !== undefined) {
    const expiresAt = parseOptionalIsoDate(body.expiresAt);
    if (expiresAt === null) {
      return { ok: false, error: "expiresAt must be a valid date, or empty for no expiry" };
    }
    value.expiresAt = expiresAt;
  }

  if (body.planId !== undefined) {
    if (body.planId === null || body.planId === "") {
      value.planId = undefined;
    } else {
      const planId = normalizePlanId(body.planId);
      if (!planId) return { ok: false, error: "planId must be a valid plan id" };
      value.planId = planId;
    }
  }

  if (body.storeId !== undefined) {
    if (body.storeId === null || body.storeId === "") {
      value.storeId = undefined;
    } else if (!isStoreId(body.storeId)) {
      return { ok: false, error: "storeId must be a valid location id" };
    } else {
      value.storeId = body.storeId;
    }
  }

  if (body.isActive !== undefined) {
    value.isActive = body.isActive === true || body.isActive === "true";
  } else if (mode === "create") {
    value.isActive = true;
  }

  if (body.note !== undefined) {
    value.note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE) : undefined;
  }

  return { ok: true, value: value as Partial<Coupon> & { code: string } };
}

/* -------------------------------------------------------------------------- */
/* Trial                                                                      */
/* -------------------------------------------------------------------------- */

export type TrialResult =
  | { ok: true; trialMinutes: number }
  | { ok: false; error: string };

/** Validates a super-admin-set trial length, in minutes. */
export function normalizeTrialMinutes(value: unknown): TrialResult {
  const minutes = Number(value);
  if (!Number.isInteger(minutes) || minutes < MIN_TRIAL_MINUTES || minutes > MAX_TRIAL_MINUTES) {
    return {
      ok: false,
      error: `Trial length must be a whole number of minutes between ${MIN_TRIAL_MINUTES} and ${MAX_TRIAL_MINUTES}`,
    };
  }
  return { ok: true, trialMinutes: minutes };
}

/** Validates a checkout request: which location, which plan, which coupon. */
export function normalizeCheckoutInput(
  body: Record<string, unknown>
):
  | { ok: true; storeId: string; planId: string; couponCode?: string; gstin?: string }
  | { ok: false; error: string } {
  if (!isStoreId(body.storeId)) {
    return { ok: false, error: "A valid storeId is required" };
  }
  const planId = normalizePlanId(body.planId);
  if (!planId) {
    return { ok: false, error: "A valid planId is required" };
  }

  let couponCode: string | undefined;
  if (body.couponCode !== undefined && body.couponCode !== null && body.couponCode !== "") {
    const code = normalizeCouponCode(body.couponCode);
    if (!code) return { ok: false, error: "That coupon code is not valid." };
    couponCode = code;
  }

  // A GSTIN goes on the tax invoice, so an invalid one is refused up front
  // rather than printed and posted to a customer.
  let gstin: string | undefined;
  if (typeof body.gstin === "string" && body.gstin.trim()) {
    const candidate = body.gstin.trim().toUpperCase();
    if (!isValidGstin(candidate)) {
      return { ok: false, error: "GSTIN must be a valid 15-character GSTIN" };
    }
    gstin = candidate;
  }

  return { ok: true, storeId: body.storeId, planId, couponCode, gstin };
}