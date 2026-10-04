import fs from "fs";
import os from "os";
import path from "path";
import {
  BillingPeriod,
  Coupon,
  CouponRedemption,
  Payment,
  PaymentStatus,
  PlanConfig,
} from "./types";
import { getSupabaseClient } from "./supabase";
import { PLANS, GST_RATE_PERCENT, PlanDefault } from "./plans";

/**
 * Data layer for the commercial tables: plan catalogue, coupons, coupon
 * redemptions and payments.
 *
 * Follows the same two-backend pattern as `lib/store.ts` — Supabase in
 * production, a local JSON file for development and tests — but lives in its
 * own file for the same reason `lib/menu.ts` does: `lib/store.ts` persists only
 * the keys it knows about, so sharing its file would let a store write silently
 * delete the billing records.
 *
 * The plan catalogue is **seeded on first read** from `lib/plans.ts`, which is
 * what makes prices super-admin controlled: the seed happens once, after which
 * the stored row wins. Re-seeding on every read would overwrite a price the
 * platform owner deliberately changed.
 */

interface BillingDataSchema {
  plans: PlanConfig[];
  coupons: Coupon[];
  redemptions: CouponRedemption[];
  payments: Payment[];
}

let memoryCache: BillingDataSchema | null = null;
let memoryCacheFile: string | null = null;

/** Test seam: drops the in-memory cache so tests always read from disk. */
export function invalidateBillingCache(): void {
  memoryCache = null;
  memoryCacheFile = null;
}

function getBillingDataFile(): string {
  if (process.env.BILLING_DATA_FILE) return process.env.BILLING_DATA_FILE;
  // Tests that do not point this elsewhere must still never write into the
  // repository (or share a file between concurrently running test files).
  if (process.env.NODE_ENV === "test") {
    return path.join(os.tmpdir(), `credo-billing-test-${process.pid}.json`);
  }
  return path.join(process.cwd(), ".data", "billing-data.json");
}

function emptyData(): BillingDataSchema {
  return { plans: [], coupons: [], redemptions: [], payments: [] };
}

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/** Forces an amount into a non-negative integer count of paise. */
function toPaise(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/* -------------------------------------------------------------------------- */
/* Row mapping                                                                */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToPlan(r: any): PlanConfig {
  const hasGst = r.gst_percent !== undefined && r.gst_percent !== null;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    tagline: String(r.tagline ?? ""),
    priceInr: toPaise(r.price_inr ?? r.priceInr),
    period: (r.period === "annual" ? "annual" : "monthly") as BillingPeriod,
    maxLocations: Math.max(1, Math.trunc(Number(r.max_locations ?? r.maxLocations) || 1)),
    features: toStringArray(r.features),
    featured: r.featured === true,
    // Fail closed on an unrecognized flag: a plan must be explicitly active.
    isActive: r.is_active !== false && r.isActive !== false,
    sortOrder: Math.trunc(Number(r.sort_order ?? r.sortOrder) || 0),
    gstPercent: hasGst
      ? Math.min(28, Math.max(0, Number(r.gst_percent ?? r.gstPercent) || 0))
      : GST_RATE_PERCENT,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    updatedAt: r.updated_at || r.updatedAt || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlanToRow(p: PlanConfig): any {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline || "",
    price_inr: toPaise(p.priceInr),
    period: p.period,
    max_locations: p.maxLocations,
    features: p.features || [],
    featured: p.featured === true,
    is_active: p.isActive !== false,
    sort_order: p.sortOrder || 0,
    gst_percent: p.gstPercent,
    created_at: p.createdAt,
    updated_at: p.updatedAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToCoupon(r: any): Coupon {
  const maxRedemptions = r.max_redemptions ?? r.maxRedemptions;
  return {
    id: String(r.id ?? ""),
    code: String(r.code ?? "").toUpperCase(),
    discountType:
      r.discount_type === "amount" || r.discountType === "amount" ? "amount" : "percent",
    discountValue: Math.max(0, Number(r.discount_value ?? r.discountValue) || 0),
    maxRedemptions:
      maxRedemptions === null || maxRedemptions === undefined
        ? undefined
        : Math.max(0, Math.trunc(Number(maxRedemptions) || 0)),
    // Deliberately not read from storage — `timesRedeemed` is derived from the
    // redemption ledger, so a hand-edited counter cannot bypass the limit.
    timesRedeemed: 0,
    expiresAt: r.expires_at || r.expiresAt || undefined,
    planId: r.plan_id || r.planId || undefined,
    storeId: r.store_id || r.storeId || undefined,
    isActive: r.is_active !== false && r.isActive !== false,
    note: r.note || undefined,
    createdBy: r.created_by || r.createdBy || undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    updatedAt: r.updated_at || r.updatedAt || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCouponToRow(c: Coupon): any {
  return {
    id: c.id,
    code: c.code.toUpperCase(),
    discount_type: c.discountType,
    discount_value: c.discountValue,
    max_redemptions: c.maxRedemptions ?? null,
    expires_at: c.expiresAt || null,
    plan_id: c.planId || null,
    store_id: c.storeId || null,
    is_active: c.isActive !== false,
    note: c.note || null,
    created_by: c.createdBy || undefined,
    created_at: c.createdAt,
    updated_at: c.updatedAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToRedemption(r: any): CouponRedemption {
  return {
    id: String(r.id ?? ""),
    couponId: r.coupon_id || r.couponId,
    code: String(r.code ?? "").toUpperCase(),
    storeId: r.store_id || r.storeId,
    planId: r.plan_id || r.planId,
    orderId: r.order_id || r.orderId,
    paymentId: r.payment_id || r.paymentId || undefined,
    discountInr: toPaise(r.discount_inr ?? r.discountInr),
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRedemptionToRow(r: CouponRedemption): any {
  return {
    id: r.id,
    coupon_id: r.couponId,
    code: r.code,
    store_id: r.storeId,
    plan_id: r.planId,
    order_id: r.orderId,
    payment_id: r.paymentId || null,
    discount_inr: r.discountInr,
    created_at: r.createdAt,
  };
}

const PAYMENT_STATUSES: PaymentStatus[] = ["created", "paid", "failed", "refunded"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToPayment(r: any): Payment {
  const rawStatus = String(r.status ?? "created");
  const via = r.confirmed_via || r.confirmedVia;
  return {
    id: String(r.id ?? ""),
    storeId: r.store_id || r.storeId,
    orderId: r.order_id || r.orderId,
    planId: r.plan_id || r.planId,
    period: (r.period === "annual" ? "annual" : "monthly") as BillingPeriod,
    grossInr: toPaise(r.gross_inr ?? r.grossInr),
    discountInr: toPaise(r.discount_inr ?? r.discountInr),
    taxInr: toPaise(r.tax_inr ?? r.taxInr),
    amountInr: toPaise(r.amount_inr ?? r.amountInr),
    couponCode: r.coupon_code || r.couponCode || undefined,
    gstin: r.gstin || undefined,
    status: (PAYMENT_STATUSES as string[]).includes(rawStatus)
      ? (rawStatus as PaymentStatus)
      : "created",
    paymentId: r.payment_id || r.paymentId || undefined,
    periodEndsAt: r.period_ends_at || r.periodEndsAt || undefined,
    signatureVerified: r.signature_verified === true || r.signatureVerified === true,
    confirmedVia: via === "checkout" || via === "webhook" ? via : undefined,
    failureReason: r.failure_reason || r.failureReason || undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    paidAt: r.paid_at || r.paidAt || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaymentToRow(p: Payment): any {
  return {
    id: p.id,
    store_id: p.storeId,
    order_id: p.orderId,
    plan_id: p.planId,
    period: p.period,
    gross_inr: p.grossInr,
    discount_inr: p.discountInr,
    tax_inr: p.taxInr,
    amount_inr: p.amountInr,
    coupon_code: p.couponCode || null,
    gstin: p.gstin || null,
    status: p.status,
    payment_id: p.paymentId || null,
    period_ends_at: p.periodEndsAt || null,
    signature_verified: p.signatureVerified,
    confirmed_via: p.confirmedVia || null,
    failure_reason: p.failureReason || null,
    created_at: p.createdAt,
    paid_at: p.paidAt || null,
  };
}

/* -------------------------------------------------------------------------- */
/* Local file backend                                                         */
/* -------------------------------------------------------------------------- */

function loadLocalData(): BillingDataSchema {
  const file = getBillingDataFile();
  if (memoryCache && memoryCacheFile === file) return memoryCache;

  try {
    const parsed = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf-8"));
    memoryCache = {
      plans: Array.isArray(parsed?.plans) ? parsed.plans : [],
      coupons: Array.isArray(parsed?.coupons) ? parsed.coupons : [],
      redemptions: Array.isArray(parsed?.redemptions) ? parsed.redemptions : [],
      payments: Array.isArray(parsed?.payments) ? parsed.payments : [],
    };
    memoryCacheFile = file;
    return memoryCache;
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
      console.error(`Failed to read local billing data file at ${file}`, err);
    }
  }

  memoryCache = emptyData();
  memoryCacheFile = file;
  return memoryCache;
}

function persistLocalData(data: BillingDataSchema) {
  try {
    const file = getBillingDataFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(/* turbopackIgnore: true */ file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(
      "Failed to persist local billing data. In serverless environments (Cloudflare Workers) configure Supabase so data is stored persistently.",
      err
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Plans                                                                      */
/* -------------------------------------------------------------------------- */

/** The catalogue a fresh install starts from, before any super-admin edit. */
export function defaultPlanConfigs(): PlanConfig[] {
  const now = new Date().toISOString();
  return PLANS.map((plan: PlanDefault, index) => ({
    id: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    priceInr: plan.rupees * 100,
    period: plan.period,
    maxLocations: plan.locations,
    features: [...plan.features],
    featured: plan.featured === true,
    isActive: true,
    sortOrder: index,
    gstPercent: GST_RATE_PERCENT,
    createdAt: now,
  }));
}

/**
 * Every plan, active or not — the console needs the inactive ones so an
 * operator can see (and restore) a plan existing subscribers are still on.
 */
export async function getPlanConfigs(): Promise<PlanConfig[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`Failed to load plans: ${error.message}`);

    const plans = (data ?? []).map(mapRowToPlan).filter((p) => p.id);
    if (plans.length > 0) return plans;

    // First run against an empty database: seed once. Seeding only happens when
    // the table is genuinely empty, so a plan a super admin deleted does not
    // silently reappear.
    const seeded = defaultPlanConfigs();
    const { error: seedError } = await supabase.from("plans").insert(seeded.map(mapPlanToRow));
    if (seedError) throw new Error(`Failed to seed plans: ${seedError.message}`);
    return seeded;
  }

  const data = loadLocalData();
  if (data.plans.length === 0) {
    data.plans = defaultPlanConfigs();
    persistLocalData(data);
  }
  return [...data.plans].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The plans an owner may actually buy, cheapest first. */
export async function getActivePlans(): Promise<PlanConfig[]> {
  const plans = await getPlanConfigs();
  return plans.filter((p) => p.isActive);
}

/**
 * The on-sale plans, falling back to the shipped defaults when the catalogue
 * cannot be read.
 *
 * Used by the marketing pages: a database hiccup must not take /pricing or the
 * prospectus down, and showing the seeded prices is strictly better than an
 * error page. The console and the checkout path deliberately do NOT use this —
 * they must see the real catalogue or fail, never a price that may not exist.
 */
export async function getActivePlansOrDefaults(): Promise<PlanConfig[]> {
  try {
    const plans = await getActivePlans();
    if (plans.length > 0) return plans;
  } catch (err) {
    console.error("Failed to load the plan catalogue, using defaults", err);
  }
  return defaultPlanConfigs().filter((p) => p.isActive);
}

export async function getPlanConfig(planId: string): Promise<PlanConfig | null> {
  if (!planId) return null;
  const plans = await getPlanConfigs();
  return plans.find((p) => p.id === planId) ?? null;
}

/**
 * Creates or updates a plan.
 *
 * On create the id is caller-supplied because existing subscriptions reference
 * it; renaming a plan's id would orphan every tenant on it, so the id is not
 * updatable through this function (the caller cannot change it — the row is
 * matched by id).
 */
export async function savePlanConfig(
  input: Partial<PlanConfig> & { id: string }
): Promise<PlanConfig> {
  const existing = await getPlanConfig(input.id);
  const now = new Date().toISOString();

  const merged: PlanConfig = {
    id: input.id,
    name: input.name ?? existing?.name ?? input.id,
    tagline: input.tagline ?? existing?.tagline ?? "",
    priceInr: toPaise(input.priceInr ?? existing?.priceInr ?? 0),
    period: input.period ?? existing?.period ?? "monthly",
    maxLocations: Math.max(1, Math.trunc(Number(input.maxLocations ?? existing?.maxLocations ?? 1))),
    features: input.features ?? existing?.features ?? [],
    featured: input.featured ?? existing?.featured ?? false,
    isActive: input.isActive ?? existing?.isActive ?? true,
    sortOrder: Math.trunc(Number(input.sortOrder ?? existing?.sortOrder ?? 0)),
    gstPercent:
      input.gstPercent ?? existing?.gstPercent ?? GST_RATE_PERCENT,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("plans").upsert(mapPlanToRow(merged), { onConflict: "id" });
    if (error) throw new Error(`Failed to save plan: ${error.message}`);
    return merged;
  }

  const data = loadLocalData();
  const index = data.plans.findIndex((p) => p.id === merged.id);
  if (index === -1) data.plans.push(merged);
  else data.plans[index] = merged;
  persistLocalData(data);
  return merged;
}

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Coupons with `timesRedeemed` derived from the redemption ledger.
 *
 * The ledger is the source of truth because a counter is not idempotent: a
 * retried webhook or a double-clicked checkout would each bump it, silently
 * letting a one-use coupon be used twice.
 */
export async function getCoupons(): Promise<Coupon[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load coupons: ${error.message}`);
    const coupons = (data ?? []).map(mapRowToCoupon).filter((c) => c.id);
    const counts = await getRedemptionCounts();
    return coupons.map((c) => ({ ...c, timesRedeemed: counts[c.id] || 0 }));
  }

  const data = loadLocalData();
  return data.coupons.map((c) => ({
    ...c,
    timesRedeemed: data.redemptions.filter((r) => r.couponId === c.id).length,
  }));
}

async function getRedemptionCounts(): Promise<Record<string, number>> {
  const supabase = getSupabaseClient();
  if (!supabase) return {};
  const { data, error } = await supabase.from("coupon_redemptions").select("coupon_id");
  if (error) throw new Error(`Failed to load coupon redemptions: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = String((row as { coupon_id?: string }).coupon_id ?? "");
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export async function getCouponByCode(code: string): Promise<Coupon | null> {
  const normalized = (code || "").trim().toUpperCase();
  if (!normalized) return null;

  const coupons = await getCoupons();
  return coupons.find((c) => c.code.toUpperCase() === normalized) ?? null;
}

export async function getCouponById(couponId: string): Promise<Coupon | null> {
  if (!couponId) return null;
  const coupons = await getCoupons();
  return coupons.find((c) => c.id === couponId) ?? null;
}

export async function saveCoupon(
  input: Partial<Coupon> & { code: string; id?: string },
  createdBy?: string
): Promise<Coupon> {
  // Only an explicit id updates. Matching by code when no id was given made a
  // POST of an existing code silently OVERWRITE that coupon's discount — a
  // one-use 10% code became whatever the second request asked for. A create
  // with a code that already exists must fail loudly instead.
  const existing = input.id ? await getCouponById(input.id) : null;
  const now = new Date().toISOString();

  const merged: Coupon = {
    id: existing?.id || input.id || id("coupon"),
    code: (input.code || existing?.code || "").toUpperCase(),
    discountType: input.discountType ?? existing?.discountType ?? "percent",
    discountValue: input.discountValue ?? existing?.discountValue ?? 0,
    maxRedemptions: input.maxRedemptions ?? existing?.maxRedemptions,
    timesRedeemed: existing?.timesRedeemed ?? 0,
    expiresAt: input.expiresAt ?? existing?.expiresAt,
    planId: input.planId ?? existing?.planId,
    storeId: input.storeId ?? existing?.storeId,
    isActive: input.isActive ?? existing?.isActive ?? true,
    note: input.note ?? existing?.note,
    createdBy: existing?.createdBy || createdBy,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("coupons").upsert(mapCouponToRow(merged), { onConflict: "id" });
    if (error) {
      // The unique index on `code` is what stops two coupons with the same code
      // existing with different discounts — surface that as a clear message.
      if (/duplicate key|unique/i.test(error.message)) {
        throw new Error("A coupon with that code already exists");
      }
      throw new Error(`Failed to save coupon: ${error.message}`);
    }
    return merged;
  }

  const data = loadLocalData();
  const clash = data.coupons.find(
    (c) => c.code.toUpperCase() === merged.code && c.id !== merged.id
  );
  if (clash) throw new Error("A coupon with that code already exists");

  const index = data.coupons.findIndex((c) => c.id === merged.id);
  if (index === -1) data.coupons.push(merged);
  else data.coupons[index] = merged;
  persistLocalData(data);
  return merged;
}

/* -------------------------------------------------------------------------- */
/* Redemptions                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Records one coupon use against a confirmed order.
 *
 * Idempotent on `orderId`: replaying the same order (webhook retry, checkout
 * callback racing the webhook) returns the existing row instead of writing a
 * second redemption that would consume another slot of a limited coupon.
 */
export async function recordRedemption(
  input: Omit<CouponRedemption, "id" | "createdAt">
): Promise<CouponRedemption> {
  const existing = await getRedemptionByOrder(input.orderId);
  if (existing) return existing;

  const row: CouponRedemption = {
    ...input,
    id: id("redeem"),
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("coupon_redemptions").insert([mapRedemptionToRow(row)]);
    if (error) {
      // A unique violation means a concurrent write won the race — that row is
      // the redemption, so return it rather than failing the payment.
      const raced = await getRedemptionByOrder(input.orderId);
      if (raced) return raced;
      throw new Error(`Failed to record coupon redemption: ${error.message}`);
    }
    return row;
  }

  const data = loadLocalData();
  const dupe = data.redemptions.find((r) => r.orderId === row.orderId);
  if (dupe) return dupe;
  data.redemptions.push(row);
  persistLocalData(data);
  return row;
}

export async function getRedemptionByOrder(orderId: string): Promise<CouponRedemption | null> {
  if (!orderId) return null;

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("coupon_redemptions")
      .select("*")
      .eq("order_id", orderId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Failed to load coupon redemption: ${error.message}`);
    return data ? mapRowToRedemption(data) : null;
  }

  const found = loadLocalData().redemptions.find((r) => r.orderId === orderId);
  return found ? { ...found } : null;
}

export async function getRedemptions(storeId?: string): Promise<CouponRedemption[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase.from("coupon_redemptions").select("*").order("created_at", { ascending: false });
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load coupon redemptions: ${error.message}`);
    return (data ?? []).map(mapRowToRedemption);
  }

  const rows = loadLocalData().redemptions;
  return storeId ? rows.filter((r) => r.storeId === storeId) : [...rows];
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                   */
/* -------------------------------------------------------------------------- */

/** One payment attempt. `orderId` is unique per attempt and is the idempotency key. */
export async function createPaymentRecord(
  input: Omit<Payment, "id" | "createdAt">
): Promise<Payment> {
  const row: Payment = {
    ...input,
    id: id("pay"),
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("payments").insert([mapPaymentToRow(row)]);
    if (error) throw new Error(`Failed to record payment: ${error.message}`);
    return row;
  }

  const data = loadLocalData();
  data.payments.push(row);
  persistLocalData(data);
  return row;
}

export async function getPaymentByOrder(orderId: string): Promise<Payment | null> {
  if (!orderId) return null;

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Failed to load payment: ${error.message}`);
    return data ? mapRowToPayment(data) : null;
  }

  const found = loadLocalData().payments.find((p) => p.orderId === orderId);
  return found ? { ...found } : null;
}

/**
 * Updates a payment, matched by its current order id.
 *
 * `orderId` is writable because a payment row is created before the gateway
 * order exists (`pending_...`) and is renamed to the real `order_...` id once
 * Razorpay returns it — that id becomes the key every later lookup uses.
 */
export async function updatePayment(
  orderId: string,
  updates: Partial<Omit<Payment, "id" | "createdAt">>
): Promise<Payment | null> {
  const existing = await getPaymentByOrder(orderId);
  if (!existing) return null;

  const merged: Payment = { ...existing, ...updates, id: existing.id };
  merged.orderId = (updates.orderId || existing.orderId).trim() || existing.orderId;

  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from("payments").update(mapPaymentToRow(merged)).eq("order_id", orderId);
    if (error) throw new Error(`Failed to update payment: ${error.message}`);
    return merged;
  }

  const data = loadLocalData();
  const index = data.payments.findIndex((p) => p.orderId === orderId);
  if (index === -1) return null;
  data.payments[index] = merged;
  persistLocalData(data);
  return merged;
}

/** Payment history for one location, newest first. */
export async function getPayments(storeId?: string): Promise<Payment[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    let query = supabase.from("payments").select("*").order("created_at", { ascending: false });
    if (storeId) query = query.eq("store_id", storeId);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to load payments: ${error.message}`);
    return (data ?? []).map(mapRowToPayment);
  }

  const rows = [...loadLocalData().payments].reverse();
  return storeId ? rows.filter((p) => p.storeId === storeId) : rows;
}