import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET as revenueGet, POST as revenuePost } from "../app/api/revenue/route";
import { GET as invoiceGet } from "../app/api/revenue/invoice/route";
import { createStore } from "../lib/store";

process.env.NODE_ENV = "test";
process.env.AUTH_BYPASS_TESTS = "true";
const TEST_DATA_FILE = path.join(os.tmpdir(), `credo-revapi-test-${process.pid}.json`);
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
  name: "Revenue API Cafe",
  slug: "rev-api-cafe",
  tagline: "t",
  category: "Cafe",
  googlePlaceId: "ChIJrevapi",
  brandColor: "#111111",
  chips: ["Coffee"],
  seoKeywords: [],
  managerEmail: "owner@example.com",
  managerPhone: "+15550000000",
  address: "1 Test Road",
  tableCount: 4,
};

const req = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/revenue", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });

test("GET /api/revenue reports zero on a fresh install", async () => {
  const res = await revenueGet();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.summary.payingLocations, 0);
  assert.equal(data.summary.mrrInr, 0);
  assert.deepEqual(data.subscriptions, []);
});

test("POST /api/revenue records a payment and returns the updated summary", async () => {
  const store = await createStore(storePayload);

  const res = await revenuePost(
    req({ storeId: store.id, plan: "solo", mrrRupees: 999, gstin: "29ABCDE1234F1Z5" })
  );
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.subscription.mrrInr, 99900);
  assert.equal(data.subscription.gstin, "29ABCDE1234F1Z5");
  assert.equal(data.summary.payingLocations, 1);
  assert.equal(data.summary.mrrInr, 99900);
});

test("POST /api/revenue rejects invalid money rather than booking zero revenue", async () => {
  const store = await createStore({ ...storePayload, slug: "rev-api-bad", name: "Bad Cafe" });
  const res = await revenuePost(req({ storeId: store.id, mrrRupees: -100 }));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /positive number/i);
});

test("POST /api/revenue rejects a malformed GSTIN", async () => {
  const store = await createStore({ ...storePayload, slug: "rev-api-gst", name: "GST Cafe" });
  const res = await revenuePost(req({ storeId: store.id, mrrRupees: 999, gstin: "NOPE" }));
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /GSTIN/i);
});

test("POST /api/revenue refuses a cross-origin mutation", async () => {
  const store = await createStore({ ...storePayload, slug: "rev-api-csrf", name: "CSRF Cafe" });
  const res = await revenuePost(req({ storeId: store.id, mrrRupees: 999 }, "https://evil.test"));
  assert.equal(res.status, 403, "CSRF protection must reject a foreign Origin");
});

test("GET /api/revenue/invoice refuses when no subscription exists", async () => {
  const store = await createStore({ ...storePayload, slug: "rev-api-none", name: "No Sub Cafe" });
  const res = await invoiceGet(
    new Request(`http://localhost/api/revenue/invoice?storeId=${store.id}`)
  );
  assert.equal(res.status, 404);
});

test("GET /api/revenue/invoice refuses when the customer GSTIN is missing", async () => {
  const store = await createStore({ ...storePayload, slug: "rev-api-nogst", name: "No GST Cafe" });
  await revenuePost(req({ storeId: store.id, mrrRupees: 999 }));
  const res = await invoiceGet(
    new Request(`http://localhost/api/revenue/invoice?storeId=${store.id}`)
  );
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /GSTIN/i);
});

test("GET /api/revenue/invoice refuses when the supplier GSTIN is unconfigured", async () => {
  const previous = process.env.SUPPLIER_GSTIN;
  delete process.env.SUPPLIER_GSTIN;

  const store = await createStore({ ...storePayload, slug: "rev-api-nosup", name: "No Sup Cafe" });
  await revenuePost(req({ storeId: store.id, mrrRupees: 999, gstin: "29ABCDE1234F1Z5" }));

  const res = await invoiceGet(
    new Request(`http://localhost/api/revenue/invoice?storeId=${store.id}`)
  );
  assert.equal(res.status, 503, "must fail loudly rather than emit an invalid invoice");

  if (previous === undefined) delete process.env.SUPPLIER_GSTIN;
  else process.env.SUPPLIER_GSTIN = previous;
});

test("GET /api/revenue/invoice renders a GST invoice once both GSTINs are present", async () => {
  const previous = process.env.SUPPLIER_GSTIN;
  process.env.SUPPLIER_GSTIN = "29ABCDE1234F1Z5";

  const store = await createStore({ ...storePayload, slug: "rev-api-ok", name: "Invoice Cafe" });
  await revenuePost(
    req({ storeId: store.id, plan: "solo", mrrRupees: 999, gstin: "29XYZUV9876H1Z2" })
  );

  const res = await invoiceGet(
    new Request(`http://localhost/api/revenue/invoice?storeId=${store.id}`)
  );
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") || "", /text\/html/);

  const html = await res.text();
  assert.ok(html.includes("Tax Invoice"));
  assert.ok(html.includes("29XYZUV9876H1Z2"), "must carry the customer GSTIN");
  assert.ok(html.includes("Invoice Cafe"), "must name the customer");
  assert.ok(html.includes("CGST") && html.includes("SGST"), "intra-state split");
  assert.ok(html.includes("1,178.82"), "Rs 999 + 18% GST = Rs 1,178.82");
  assert.ok(html.includes("not</b> a GST e-invoice"), "must not imply e-invoice status");

  if (previous === undefined) delete process.env.SUPPLIER_GSTIN;
  else process.env.SUPPLIER_GSTIN = previous;
});

test("GET /api/revenue/invoice requires a storeId", async () => {
  const res = await invoiceGet(new Request("http://localhost/api/revenue/invoice"));
  assert.equal(res.status, 400);
});

test("a churned record actually gets an end date, so 30-day churn is not dead", async () => {
  // Regression guard. The validator used to hard-code `endedAt: undefined`,
  // which meant every "churned" row kept ended_at = NULL. `churnedLast30Days`
  // counts on ended_at, so the figure on /admin/revenue was permanently 0.
  const store = await createStore({ ...storePayload, slug: "rev-api-churn", name: "Churn Cafe" });
  await revenuePost(req({ storeId: store.id, mrrRupees: 999, gstin: "29ABCDE1234F1Z5" }));

  const churned = await revenuePost(req({ storeId: store.id, status: "churned", mrrRupees: 0 }));
  assert.equal(churned.status, 201);
  const data = await churned.json();

  assert.equal(data.subscription.status, "churned");
  assert.ok(data.subscription.endedAt, "a churned subscription MUST carry an end date");
  assert.equal(
    data.summary.churnedLast30Days,
    1,
    "the 30-day churn counter must now actually move"
  );
  // Deltas rather than absolutes: earlier tests in this file legitimately left
  // paying records behind, so the summary is not globally zero. Re-churning is
  // an upsert of the SAME row, so the churn count must NOT move again.
  const before = (await (await revenueGet()).json()).summary;
  const again = await revenuePost(req({ storeId: store.id, status: "churned" }));
  const after = (await again.json()).summary;
  assert.equal(after.churnedLast30Days, before.churnedLast30Days, "one row = one churn");
  assert.equal(after.payingLocations, before.payingLocations, "already churned, so unchanged");
});

test("an explicit endedAt is honoured rather than discarded", async () => {
  const store = await createStore({ ...storePayload, slug: "rev-api-ended", name: "Ended Cafe" });
  const past = "2026-01-15T00:00:00.000Z";
  const res = await revenuePost(req({ storeId: store.id, status: "churned", endedAt: past }));
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.subscription.endedAt, past, "the supplied end date must survive validation");
  // Asserted relatively: other tests have already recorded recent churn, so
  // the absolute counter is not zero here.
  assert.ok(
    data.summary.churnedLast30Days <= 1,
    "a January end date is outside the 30-day window"
  );
});

test("a garbled endedAt still records an end rather than silently losing it", async () => {
  const { normalizeSubscriptionInput } = await import("../lib/validation");
  const r = normalizeSubscriptionInput({
    storeId: "s1",
    status: "churned",
    endedAt: "not-a-date",
  });
  assert.ok(r.ok);
  assert.ok(r.value.endedAt, "unparseable input must fall back to now, not to never");
  assert.ok(!Number.isNaN(new Date(r.value.endedAt!).getTime()));
});

test("an active record must not carry an end date", async () => {
  const { normalizeSubscriptionInput } = await import("../lib/validation");
  const r = normalizeSubscriptionInput({
    storeId: "s1",
    status: "active",
    endedAt: "2026-01-15T00:00:00.000Z",
  });
  assert.ok(r.ok);
  assert.equal(r.value.endedAt, undefined, "only a churned plan may have endedAt");
});
