import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_TRIAL_MINUTES,
  MIN_CHARGEABLE_INR,
  addPeriod,
  applyDiscount,
  daysUntil,
  deriveEntitlement,
  evaluateCoupon,
  formatInr,
  minutesUntil,
  paiseToRupees,
  priceBreakdown,
  trialWindow,
} from "../lib/billing";
import { DEFAULT_TRIAL_MINUTES, PERIOD_DAYS } from "../lib/plans";
import type { Coupon, PlanConfig, Subscription } from "../lib/types";

const NOW = new Date("2026-06-15T10:00:00.000Z").getTime();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const plan = (over: Partial<PlanConfig> = {}): PlanConfig => ({
  id: "solo",
  name: "Solo",
  tagline: "One outlet",
  priceInr: 99_900, // ₹999
  period: "monthly",
  maxLocations: 1,
  features: [],
  isActive: true,
  sortOrder: 0,
  gstPercent: 18,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  id: "coupon_1",
  code: "LAUNCH10",
  discountType: "percent",
  discountValue: 10,
  timesRedeemed: 0,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const subscription = (over: Partial<Subscription> = {}): Subscription => ({
  id: "sub_1",
  storeId: "store_1",
  plan: "solo",
  status: "active",
  mrrInr: 0,
  billingPeriod: "monthly",
  startedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

/* -------------------------------------------------------------------------- */
/* Discounts                                                                  */
/* -------------------------------------------------------------------------- */

test("a percentage discount rounds to the nearest paise and never exceeds the price", () => {
  assert.equal(applyDiscount(99_900, coupon()), 9_990);
  assert.equal(applyDiscount(100, coupon({ discountValue: 33.33 })), 33, "rounds, never truncates");
  assert.equal(
    applyDiscount(99_900, coupon({ discountType: "amount", discountValue: 500_000 })),
    99_900,
    "a ₹5,000 coupon on a ₹999 plan is clamped, never negative"
  );
  assert.equal(applyDiscount(99_900, null), 0, "no coupon means no discount");
  assert.equal(applyDiscount(0, coupon()), 0, "zero is never discounted below zero");
  assert.equal(applyDiscount(-5_000, coupon()), 0, "a negative price is refused");
});

test("GST is charged on the discounted amount, not the list price", () => {
  const breakdown = priceBreakdown(plan(), coupon());

  assert.equal(breakdown.grossInr, 99_900);
  assert.equal(breakdown.discountInr, 9_990);
  assert.equal(breakdown.netInr, 89_910);
  assert.equal(breakdown.taxInr, 16_184, "18% of the discounted ₹899.10");
  assert.equal(breakdown.totalInr, 106_094);
  assert.equal(breakdown.gstPercent, 18);

  const exempt = priceBreakdown(plan({ gstPercent: 0 }));
  assert.equal(exempt.taxInr, 0, "an exempt supply adds no tax");
  assert.equal(exempt.totalInr, exempt.grossInr);
});

test("the gateway's minimum charge is encoded once, in paise", () => {
  assert.equal(MIN_CHARGEABLE_INR, 100, "₹1.00 — below this Razorpay refuses the order");
});

/* -------------------------------------------------------------------------- */
/* Coupon eligibility                                                         */
/* -------------------------------------------------------------------------- */

test("a coupon is refused for the right reason, with a message the owner can read", () => {
  const context = { storeId: "store_1", planId: "solo", grossInr: 99_900 };

  const missing = evaluateCoupon(null, context, NOW);
  assert.equal(missing.usable, false);
  assert.equal(missing.reason, "not_found");
  assert.ok(missing.message && missing.message.length > 0);

  assert.equal(evaluateCoupon(coupon({ isActive: false }), context, NOW).reason, "inactive");
  assert.equal(
    evaluateCoupon(coupon({ expiresAt: new Date(NOW - HOUR).toISOString() }), context, NOW).reason,
    "expired"
  );
  assert.equal(
    evaluateCoupon(
      coupon({ maxRedemptions: 1, timesRedeemed: 1 }),
      context,
      NOW
    ).reason,
    "exhausted"
  );
  assert.equal(evaluateCoupon(coupon({ planId: "multi" }), context, NOW).reason, "wrong_plan");
  assert.equal(evaluateCoupon(coupon({ storeId: "store_2" }), context, NOW).reason, "wrong_store");
});

test("a usable coupon returns the real discount, and an expiry boundary is exclusive", () => {
  const context = { storeId: "store_1", planId: "solo", grossInr: 99_900 };

  const good = evaluateCoupon(coupon(), context, NOW);
  assert.equal(good.usable, true);
  assert.equal(good.discountInr, 9_990);
  assert.equal(good.reason, undefined);

  // Exactly at the expiry instant the coupon is over.
  const boundary = evaluateCoupon(
    coupon({ expiresAt: new Date(NOW).toISOString() }),
    context,
    NOW
  );
  assert.equal(boundary.usable, false);
  assert.equal(boundary.reason, "expired");

  const limitNotYetReached = evaluateCoupon(
    coupon({ maxRedemptions: 2, timesRedeemed: 1 }),
    context,
    NOW
  );
  assert.equal(limitNotYetReached.usable, true);
});

/* -------------------------------------------------------------------------- */
/* Trial                                                                      */
/* -------------------------------------------------------------------------- */

test("a trial window is start + minutes, with safe fallbacks", () => {
  assert.equal(trialWindow(undefined, 30), undefined, "no start means no trial");

  const window = trialWindow("2026-06-15T10:00:00.000Z", 30);
  assert.ok(window);
  assert.equal(window.endsAt, "2026-06-15T10:30:00.000Z");

  const fallback = trialWindow("2026-06-15T10:00:00.000Z", undefined);
  assert.equal(
    fallback?.endsAt,
    new Date(Date.parse("2026-06-15T10:00:00.000Z") + DEFAULT_TRIAL_MINUTES * 60_000).toISOString(),
    "a missing length falls back to the default, never to forever"
  );

  const absurd = trialWindow("2026-06-15T10:00:00.000Z", 60 * 24 * 365);
  assert.ok(absurd);
  assert.equal(
    absurd.endsAt,
    new Date(Date.parse("2026-06-15T10:00:00.000Z") + MAX_TRIAL_MINUTES * 60_000).toISOString(),
    "a hand-edited row cannot grant a permanent free trial"
  );
});

test("periods advance by whole days and countdowns floor at zero", () => {
  const start = new Date("2026-06-15T10:00:00.000Z");
  assert.equal(addPeriod(start, "monthly").getTime(), start.getTime() + PERIOD_DAYS.monthly * DAY);
  assert.equal(addPeriod(start, "annual").getTime(), start.getTime() + PERIOD_DAYS.annual * DAY);

  assert.equal(minutesUntil(new Date(NOW + 20 * 60_000).toISOString(), NOW), 20);
  assert.equal(minutesUntil(new Date(NOW - HOUR).toISOString(), NOW), 0);
  assert.equal(minutesUntil(undefined, NOW), 0);
  assert.equal(minutesUntil("not-a-date", NOW), 0);

  assert.equal(daysUntil(new Date(NOW + 3 * DAY).toISOString(), NOW), 3);
  assert.equal(daysUntil(new Date(NOW - DAY).toISOString(), NOW), 0);
  assert.equal(daysUntil(undefined, NOW), 0);
});

/* -------------------------------------------------------------------------- */
/* Entitlement                                                                */
/* -------------------------------------------------------------------------- */

test("a location with no subscription is not entitled", () => {
  const state = deriveEntitlement("store_1", null, null, NOW);
  assert.equal(state.state, "none");
  assert.equal(state.entitled, false);
  assert.ok(state.reason);
});

test("a lead is not entitled until it starts a trial or pays", () => {
  const state = deriveEntitlement("store_1", subscription({ status: "lead" }), plan(), NOW);
  assert.equal(state.state, "none");
  assert.equal(state.entitled, false);
});

test("a live trial is entitled and counts down in minutes", () => {
  const sub = subscription({
    status: "trial",
    trialStartedAt: new Date(NOW - 10 * 60_000).toISOString(),
    trialMinutes: 30,
  });
  const state = deriveEntitlement("store_1", sub, plan(), NOW);

  assert.equal(state.state, "trial");
  assert.equal(state.entitled, true);
  assert.equal(state.trialMinutesRemaining, 20);
  assert.ok(state.trialEndsAt);
});

test("an elapsed trial locks customisation with no cron involved", () => {
  const sub = subscription({
    status: "trial",
    trialStartedAt: new Date(NOW - 2 * HOUR).toISOString(),
    trialMinutes: 30,
  });
  const state = deriveEntitlement("store_1", sub, plan(), NOW);

  assert.equal(state.state, "expired");
  assert.equal(state.entitled, false);
  assert.ok(state.reason);
});

test("a paid period is entitled until its end instant, then locked", () => {
  const live = deriveEntitlement(
    "store_1",
    subscription({ currentPeriodEnd: new Date(NOW + 5 * DAY).toISOString() }),
    plan(),
    NOW
  );
  assert.equal(live.state, "active");
  assert.equal(live.entitled, true);
  assert.equal(live.daysRemaining, 5);

  const lapsed = deriveEntitlement(
    "store_1",
    subscription({ currentPeriodEnd: new Date(NOW - 1).toISOString() }),
    plan(),
    NOW
  );
  assert.equal(lapsed.state, "expired");
  assert.equal(lapsed.entitled, false);
});

test("an active subscription with no period on record fails closed", () => {
  // Otherwise a row with status "active" would be access forever.
  const state = deriveEntitlement("store_1", subscription({ status: "active" }), plan(), NOW);
  assert.equal(state.entitled, false);
  assert.ok(state.reason);
});

test("pausing stops renewal but keeps the paid-for days", () => {
  const paused = deriveEntitlement(
    "store_1",
    subscription({ status: "paused", currentPeriodEnd: new Date(NOW + 2 * DAY).toISOString() }),
    plan(),
    NOW
  );
  assert.equal(paused.state, "paused");
  assert.equal(paused.entitled, true, "the month already paid for still works");

  const pausedAndLapsed = deriveEntitlement(
    "store_1",
    subscription({ status: "paused", currentPeriodEnd: new Date(NOW - DAY).toISOString() }),
    plan(),
    NOW
  );
  assert.equal(pausedAndLapsed.entitled, false);
});

test("a churned subscription stays locked until it is re-subscribed", () => {
  const state = deriveEntitlement(
    "store_1",
    subscription({ status: "churned", endedAt: new Date(NOW - DAY).toISOString() }),
    plan(),
    NOW
  );
  assert.equal(state.state, "churned");
  assert.equal(state.entitled, false);
});

test("a missing plan row still yields a safe entitlement", () => {
  const state = deriveEntitlement(
    "store_1",
    subscription({ currentPeriodEnd: new Date(NOW + DAY).toISOString() }),
    null,
    NOW
  );
  assert.equal(state.entitled, true, "a grandfathered subscriber keeps access");
  assert.equal(state.maxLocations, 1, "without a plan, assume the smallest allowance");
  assert.equal(state.planName, "solo", "the plan key is the fallback display name");
});

/* -------------------------------------------------------------------------- */
/* Display                                                                    */
/* -------------------------------------------------------------------------- */

test("paise convert to rupees only at the display edge", () => {
  assert.equal(paiseToRupees(99_900), 999);
  assert.equal(paiseToRupees(99_950), 999.5);
  assert.equal(paiseToRupees(0), 0);
  assert.equal(paiseToRupees(-100), 0, "a negative amount can never display as a price");
  assert.match(formatInr(99_900), /999\.00/);
  assert.match(formatInr(0), /0\.00/);
});
