import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createStore,
  getSubscriptions,
  upsertSubscription,
  cancelSubscription,
  getRevenueSummary,
} from "../lib/store";

// Never touch production Supabase or the developer's local data file.
const TEST_DATA_FILE = path.join(os.tmpdir(), `credo-subs-test-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
});

const storePayload = {
  name: "Billing Test Cafe",
  slug: "billing-test-cafe",
  tagline: "Test",
  category: "Cafe",
  googlePlaceId: "ChIJbillingtest",
  brandColor: "#111111",
  chips: ["Coffee"],
  seoKeywords: [],
  managerEmail: "owner@example.com",
  managerPhone: "+15550000000",
  address: "1 Test Road",
  tableCount: 4,
};

test("a fresh install has no subscriptions and therefore no revenue", async () => {
  assert.deepEqual(await getSubscriptions(), []);
  const summary = await getRevenueSummary();
  assert.equal(summary.payingLocations, 0);
  assert.equal(summary.mrrInr, 0);
  assert.equal(summary.arrInr, 0);
});

test("recording a payment makes MRR derivable from data", async () => {
  const store = await createStore(storePayload);
  await upsertSubscription({
    storeId: store.id,
    plan: "solo",
    status: "active",
    mrrInr: 99900, // Rs 999.00 in paise
    billingPeriod: "monthly",
    gstin: "29ABCDE1234F1Z5",
    startedAt: new Date().toISOString(),
  });

  const summary = await getRevenueSummary();
  assert.equal(summary.payingLocations, 1);
  assert.equal(summary.mrrInr, 99900);
  assert.equal(summary.mrrRupees, 999);
  assert.equal(summary.arrInr, 99900 * 12);
  assert.equal(summary.byPlan.solo.locations, 1);
});

test("MRR sums across locations and keeps plan breakdown", async () => {
  const second = await createStore({ ...storePayload, slug: "billing-test-cafe-2", name: "Second Cafe" });
  const third = await createStore({ ...storePayload, slug: "billing-test-cafe-3", name: "Third Cafe" });

  await upsertSubscription({
    storeId: second.id, plan: "solo", status: "active", mrrInr: 99900,
    billingPeriod: "monthly", startedAt: new Date().toISOString(),
  });
  await upsertSubscription({
    storeId: third.id, plan: "agency", status: "active", mrrInr: 149900,
    billingPeriod: "monthly", startedAt: new Date().toISOString(),
  });

  const summary = await getRevenueSummary();
  assert.equal(summary.payingLocations, 3);
  assert.equal(summary.mrrInr, 99900 + 99900 + 149900);
  assert.equal(summary.byPlan.solo.locations, 2);
  assert.equal(summary.byPlan.agency.locations, 1);
});

test("a trial is visible but is not counted as revenue", async () => {
  const trial = await createStore({ ...storePayload, slug: "billing-test-cafe-trial", name: "Trial Cafe" });
  await upsertSubscription({
    storeId: trial.id, plan: "solo", status: "trial", mrrInr: 0,
    billingPeriod: "monthly", startedAt: new Date().toISOString(),
  });

  const summary = await getRevenueSummary();
  assert.equal(summary.payingLocations, 4, "trial location is listed");
  assert.equal(summary.mrrInr, 99900 + 99900 + 149900, "but contributes no MRR");
});

test("cancelling records churn instead of deleting the row", async () => {
  const [sub] = (await getSubscriptions()).filter((s) => s.plan === "agency");
  assert.ok(sub, "agency subscription exists");

  const before = await getRevenueSummary();
  const cancelled = await cancelSubscription(sub.storeId, "owner switched to a competitor");
  assert.ok(cancelled);
  assert.equal(cancelled.status, "churned");
  assert.ok(cancelled.endedAt, "ended_at is set");
  assert.equal(cancelled.cancelReason, "owner switched to a competitor");

  const after = await getRevenueSummary();
  assert.equal(after.payingLocations, before.payingLocations - 1);
  assert.equal(after.mrrInr, before.mrrInr - sub.mrrInr);
  assert.equal(after.churnedLast30Days, 1);

  // The row must survive so churn stays measurable.
  assert.ok((await getSubscriptions()).some((s) => s.storeId === sub.storeId));
});

test("scoping restricts subscriptions to the caller's stores", async () => {
  const all = await getSubscriptions(null);
  assert.ok(all.length >= 4);

  const scoped = await getSubscriptions([all[0].storeId]);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].storeId, all[0].storeId);

  assert.deepEqual(await getSubscriptions([]), [], "an empty scope returns nothing");
});

test("money is stored as integer paise and cannot go negative", async () => {
  const store = await createStore({ ...storePayload, slug: "billing-test-cafe-bad", name: "Bad Cafe" });
  const sub = await upsertSubscription({
    storeId: store.id, plan: "solo", status: "active", mrrInr: -5000,
    billingPeriod: "monthly", startedAt: new Date().toISOString(),
  });
  assert.equal(sub.mrrInr, 0, "negative MRR is clamped, never summed as revenue");

  const [readBack] = (await getSubscriptions([store.id]));
  assert.equal(readBack.mrrInr, 0);
});

/* ------------------------------------------------------------------------- */
/* Input validation — money arrives as rupees, is stored as paise            */
/* ------------------------------------------------------------------------- */

test("amounts convert from decimal rupees to integer paise exactly", async () => {
  const { normalizeSubscriptionInput } = await import("../lib/validation");

  const clean = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: 999 });
  assert.ok(clean.ok);
  assert.equal(clean.value.mrrInr, 99900);

  // Rounding, not truncation: 999.50 must not silently become 999.
  const decimal = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: 999.5 });
  assert.ok(decimal.ok);
  assert.equal(decimal.value.mrrInr, 99950);

  const asString = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: "1499" });
  assert.ok(asString.ok);
  assert.equal(asString.value.mrrInr, 149900);

  // Whole rupees always yield whole paise — the property that stops float
  // drift from ever reaching the MRR sum.
  for (const rupees of [1, 99, 999, 1499, 19999]) {
    const r = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: rupees });
    assert.ok(r.ok);
    assert.equal(Number.isInteger(r.value.mrrInr), true);
    assert.equal(r.value.mrrInr, rupees * 100);
  }
});

test("invalid money input is rejected rather than becoming zero revenue", async () => {
  const { normalizeSubscriptionInput } = await import("../lib/validation");

  for (const bad of [-5, "abc", NaN, Infinity]) {
    const r = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: bad });
    assert.equal(r.ok, false, `${String(bad)} must be rejected`);
  }

  const absurd = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: 99_999_999 });
  assert.equal(absurd.ok, false, "implausibly large amounts are refused");

  // A storeId that is not a real id must never reach the data layer.
  const badId = normalizeSubscriptionInput({ storeId: "../../etc/passwd", mrrRupees: 10 });
  assert.equal(badId.ok, false);
});

test("a GSTIN is validated before it can reach a tax invoice", async () => {
  const { normalizeSubscriptionInput, isValidGstin } = await import("../lib/validation");

  assert.equal(isValidGstin("29ABCDE1234F1Z5"), true);

  // Lower case is accepted and normalised, because operators paste from email.
  const lower = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: 999, gstin: "29abcde1234f1z5" });
  assert.ok(lower.ok);
  assert.equal(lower.value.gstin, "29ABCDE1234F1Z5");

  for (const bad of ["29ABCDE", "123456789012345", "29ABCDE1234F1Z"]) {
    const r = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: 999, gstin: bad });
    assert.equal(r.ok, false, `${bad} must be rejected`);
  }
});

test("an unknown status falls back to active instead of corrupting MRR", async () => {
  const { normalizeSubscriptionInput } = await import("../lib/validation");

  const bogus = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: 999, status: "haxxed" });
  assert.ok(bogus.ok);
  assert.equal(bogus.value.status, "active");

  const known = normalizeSubscriptionInput({ storeId: "s1", mrrRupees: 999, status: "trial" });
  assert.ok(known.ok);
  assert.equal(known.value.status, "trial");
});
