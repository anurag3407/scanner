/**
 * Billing API — checkout, verification, webhook, coupons, plans and the menu
 * entitlement gate.
 *
 * These exercise the real route handlers against an isolated local data file
 * with a stubbed Razorpay HTTP layer, so the whole money path is tested without
 * a gateway account: order creation, signature verification, idempotent
 * confirmation (both via the browser callback and the webhook), zero-amount
 * activations and the server-side lock on menu writes.
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { setRazorpayFetchForTests } from "../lib/razorpay";

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

// REAL auth (no bypass) so the RBAC paths are exercised, but Clerk is mocked
// through the documented globalThis seam instead of a network call.
process.env.NODE_ENV = "test";
delete process.env.AUTH_BYPASS_TESTS;

const TEST_DATA_FILE = path.join(os.tmpdir(), `credo-billing-api-${process.pid}.json`);
const TEST_MENU_FILE = path.join(os.tmpdir(), `credo-billing-api-menu-${process.pid}.json`);
const TEST_BILLING_FILE = path.join(os.tmpdir(), `credo-billing-api-records-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
process.env.MENU_DATA_FILE = TEST_MENU_FILE;
process.env.BILLING_DATA_FILE = TEST_BILLING_FILE;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_billing";
process.env.CLERK_SECRET_KEY = "sk_test_billing";

const OWNER_EMAIL = "owner@platform.test";
const GM_EMAIL = "gm@billing.test";
process.env.ADMIN_ALLOWED_EMAIL = OWNER_EMAIL;

process.env.RAZORPAY_KEY_ID = "rzp_test_key_id";
process.env.RAZORPAY_KEY_SECRET = "rzp_test_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "rzp_test_webhook_secret";

let CURRENT_EMAIL = OWNER_EMAIL;
function signInAs(email: string) {
  CURRENT_EMAIL = email;
}

globalThis.__mockClerk = {
  auth: async () => ({ userId: CURRENT_EMAIL ? "user_test" : null }),
  currentUser: async () =>
    CURRENT_EMAIL
      ? {
          id: "user_test",
          primaryEmailAddress: {
            emailAddress: CURRENT_EMAIL,
            verification: { status: "verified" },
          },
          emailAddresses: [
            { emailAddress: CURRENT_EMAIL, verification: { status: "verified" } },
          ],
        }
      : null,
};

/* -------------------------------------------------------------------------- */
/* Razorpay stub                                                              */
/* -------------------------------------------------------------------------- */

interface GatewayCall {
  url: string;
  body: Record<string, unknown>;
}

const gatewayCalls: GatewayCall[] = [];
let orderCounter = 0;

/**
 * A fake Razorpay that mints sequential order ids and records what it was
 * asked for, so the amounts sent to the gateway can be asserted.
 */
const stubFetch: typeof fetch = async (input, init) => {
  orderCounter += 1;
  const body = JSON.parse(String(init?.body || "{}")) as Record<string, unknown>;
  gatewayCalls.push({ url: String(input), body });
  return new Response(
    JSON.stringify({
      id: `order_test_${orderCounter}`,
      amount: body.amount,
      currency: "INR",
      status: "created",
      receipt: body.receipt,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

setRazorpayFetchForTests(stubFetch);

const checkoutSignature = (orderId: string, paymentId: string) =>
  createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

const webhookSignature = (rawBody: string) =>
  createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET as string)
    .update(rawBody)
    .digest("hex");

/* -------------------------------------------------------------------------- */
/* Request helpers                                                            */
/* -------------------------------------------------------------------------- */

const SAME_ORIGIN = {
  origin: "http://scanner.test",
  "sec-fetch-site": "same-origin",
};

const json = (url: string, method: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

const routeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
  fs.rmSync(TEST_MENU_FILE, { force: true });
  fs.rmSync(TEST_BILLING_FILE, { force: true });
});

async function createTestStore(extra: Record<string, unknown> = {}) {
  const { POST } = await import("../app/api/stores/route");
  signInAs(OWNER_EMAIL);
  const res = await POST(
    json(
      "http://scanner.test/api/stores",
      "POST",
      {
        name: "Billing Test Kitchen",
        slug: `billing-test-${Math.random().toString(36).slice(2, 8)}`,
        category: "Restaurant",
        googlePlaceId: "ChIJbillingTest",
        managerEmail: "owner@billingtest.com",
        ...extra,
      },
      SAME_ORIGIN
    )
  );
  assert.equal(res.status, 201);
  return (await res.json()).store as { id: string; slug: string; name: string };
}

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                  */
/* -------------------------------------------------------------------------- */

test("the seeded catalogue is served to the console, and only the platform owner may write it", async () => {
  const { GET, POST, PATCH } = await import("../app/api/billing/plans/route");

  signInAs(OWNER_EMAIL);
  const listed = await GET();
  assert.equal(listed.status, 200);
  const { plans } = (await listed.json()) as { plans: Array<{ id: string; priceInr: number }> };
  assert.equal(plans.length, 3, "a fresh install seeds the three shipped plans");
  assert.ok(plans.every((p) => Number.isInteger(p.priceInr) && p.priceInr > 0));

  // A store admin exists at one location and must not be able to change a price.
  const store = await createTestStore();
  const { createTeamMember } = await import("../lib/store");
  await createTeamMember({
    email: GM_EMAIL,
    name: "Billing GM",
    role: "store_admin",
    storeIds: [store.id],
  });

  signInAs(GM_EMAIL);
  const forbiddenCreate = await POST(
    json(
      "http://scanner.test/api/billing/plans",
      "POST",
      { id: "cheap", name: "Cheap", priceRupees: 1 },
      SAME_ORIGIN
    )
  );
  assert.equal(forbiddenCreate.status, 403, "a tenant must never set the platform's prices");

  const forbiddenUpdate = await PATCH(
    json("http://scanner.test/api/billing/plans", "PATCH", { id: "solo", priceRupees: 1 }, SAME_ORIGIN)
  );
  assert.equal(forbiddenUpdate.status, 403);

  // The catalogue is still readable by the tenant: they must see the price.
  const visible = await GET();
  assert.equal(visible.status, 200);
});

test("a super admin can create and re-price a plan at runtime", async () => {
  const { POST, PATCH } = await import("../app/api/billing/plans/route");
  signInAs(OWNER_EMAIL);

  const created = await POST(
    json(
      "http://scanner.test/api/billing/plans",
      "POST",
      {
        id: "Growth",
        name: "Growth",
        tagline: "Two outlets, one dashboard.",
        priceRupees: 1999,
        period: "monthly",
        maxLocations: 2,
        features: ["Two locations", "Everything in Solo", "Analytics", "Priority support"],
      },
      SAME_ORIGIN
    )
  );
  assert.equal(created.status, 201);
  const { plan } = (await created.json()) as { plan: { id: string; priceInr: number } };
  assert.equal(plan.id, "growth", "plan ids are normalized to lowercase");
  assert.equal(plan.priceInr, 199_900);

  const updated = await PATCH(
    json("http://scanner.test/api/billing/plans", "PATCH", { id: "growth", priceRupees: "2499.50" }, SAME_ORIGIN)
  );
  assert.equal(updated.status, 200);
  const repriced = (await updated.json()) as { plan: { priceInr: number; tagline: string } };
  assert.equal(repriced.plan.priceInr, 249_950, "₹2,499.50 rounds up to the paise — never truncates");
  assert.equal(repriced.plan.tagline, "Two outlets, one dashboard.", "a partial update keeps other fields");

  const missing = await PATCH(
    json("http://scanner.test/api/billing/plans", "PATCH", { id: "nope", priceRupees: 100 }, SAME_ORIGIN)
  );
  assert.equal(missing.status, 404);
});

/* -------------------------------------------------------------------------- */
/* Coupons                                                                    */
/* -------------------------------------------------------------------------- */

test("coupons are super-admin only, unique by code, and validated", async () => {
  const { GET, POST } = await import("../app/api/billing/coupons/route");

  signInAs(GM_EMAIL);
  assert.equal((await GET()).status, 403, "a tenant must not be able to enumerate discount codes");

  signInAs(OWNER_EMAIL);
  const created = await POST(
    json(
      "http://scanner.test/api/billing/coupons",
      "POST",
      { code: "launch10", discountType: "percent", discountValue: 10, maxRedemptions: 1 },
      SAME_ORIGIN
    )
  );
  assert.equal(created.status, 201);
  const { coupon } = (await created.json()) as { coupon: { code: string; maxRedemptions: number } };
  assert.equal(coupon.code, "LAUNCH10", "codes are normalized to uppercase");
  assert.equal(coupon.maxRedemptions, 1);

  const duplicate = await POST(
    json(
      "http://scanner.test/api/billing/coupons",
      "POST",
      { code: "LAUNCH10", discountType: "amount", discountValue: 500 },
      SAME_ORIGIN
    )
  );
  assert.equal(duplicate.status, 409, "two coupons with one code would be ambiguous");

  const badPercent = await POST(
    json(
      "http://scanner.test/api/billing/coupons",
      "POST",
      { code: "TOOMUCH", discountType: "percent", discountValue: 150 },
      SAME_ORIGIN
    )
  );
  assert.equal(badPercent.status, 400);

  const badAmount = await POST(
    json(
      "http://scanner.test/api/billing/coupons",
      "POST",
      { code: "ZERO", discountType: "amount", discountValue: 0 },
      SAME_ORIGIN
    )
  );
  assert.equal(badAmount.status, 400, "a zero-value coupon is a mistake, not a discount");
});

/* -------------------------------------------------------------------------- */
/* Checkout + signature verification                                          */
/* -------------------------------------------------------------------------- */

test("checkout prices the server-side plan, and a valid signature activates the period", async () => {
  const { POST: checkout } = await import("../app/api/billing/checkout/route");
  const { POST: verify } = await import("../app/api/billing/verify/route");

  const store = await createTestStore();
  const res = await checkout(
    json("http://scanner.test/api/billing/checkout", "POST", { storeId: store.id, planId: "solo" }, SAME_ORIGIN)
  );
  assert.equal(res.status, 200);
  const { checkout: session } = (await res.json()) as {
    checkout: {
      kind: string;
      breakdown: { grossInr: number; taxInr: number; totalInr: number };
      razorpay: { orderId: string; amountInr: number; keyId: string };
    };
  };

  assert.equal(session.kind, "order");
  assert.equal(session.breakdown.grossInr, 99_900);
  assert.equal(session.breakdown.taxInr, 17_982, "18% GST on ₹999");
  assert.equal(session.breakdown.totalInr, 117_882);
  assert.equal(session.razorpay.amountInr, 117_882);
  assert.equal(session.razorpay.keyId, "rzp_test_key_id");
  assert.match(session.razorpay.orderId, /^order_test_/);

  // The gateway must have received the sub-unit amount, not rupees.
  const lastCall = gatewayCalls[gatewayCalls.length - 1];
  assert.equal(lastCall.url, "https://api.razorpay.com/v1/orders");
  assert.equal(lastCall.body.amount, 117_882);
  assert.equal(lastCall.body.currency, "INR");

  const orderId = session.razorpay.orderId;

  const forged = await verify(
    json(
      "http://scanner.test/api/billing/verify",
      "POST",
      { razorpay_order_id: orderId, razorpay_payment_id: "pay_forged", razorpay_signature: "deadbeef" },
      SAME_ORIGIN
    )
  );
  assert.equal(forged.status, 400, "an unverifiable signature must never activate anything");

  const confirmed = await verify(
    json(
      "http://scanner.test/api/billing/verify",
      "POST",
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_1",
        razorpay_signature: checkoutSignature(orderId, "pay_1"),
      },
      SAME_ORIGIN
    )
  );
  assert.equal(confirmed.status, 200);
  const first = (await confirmed.json()) as {
    subscription: { status: string; currentPeriodEnd: string };
    payment: { status: string; confirmedVia: string; signatureVerified: boolean };
    entitlement: { entitled: boolean; state: string; daysRemaining: number };
  };
  assert.equal(first.entitlement.entitled, true);
  assert.equal(first.entitlement.state, "active");
  assert.ok(first.entitlement.daysRemaining >= 29, "a monthly period is ~30 days");
  assert.equal(first.payment.status, "paid");
  assert.equal(first.payment.signatureVerified, true);
  assert.equal(first.payment.confirmedVia, "checkout");

  // Replaying the same confirmation (the webhook racing the browser) must not
  // extend the period a second time.
  const replay = await verify(
    json(
      "http://scanner.test/api/billing/verify",
      "POST",
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_1",
        razorpay_signature: checkoutSignature(orderId, "pay_1"),
      },
      SAME_ORIGIN
    )
  );
  assert.equal(replay.status, 200);
  const second = (await replay.json()) as {
    subscription: { currentPeriodEnd: string };
    entitlement: { entitled: boolean };
  };
  assert.equal(second.subscription.currentPeriodEnd, first.subscription.currentPeriodEnd);
  assert.equal(second.entitlement.entitled, true);
});

test("a coupon is applied before GST and redeemed exactly once", async () => {
  const { POST: checkout } = await import("../app/api/billing/checkout/route");
  const { POST: verify } = await import("../app/api/billing/verify/route");
  const { GET: listCoupons } = await import("../app/api/billing/coupons/route");

  const store = await createTestStore();
  const res = await checkout(
    json(
      "http://scanner.test/api/billing/checkout",
      "POST",
      { storeId: store.id, planId: "growth", couponCode: "launch10" },
      SAME_ORIGIN
    )
  );
  assert.equal(res.status, 200);
  const { checkout: session } = (await res.json()) as {
    checkout: {
      razorpay: { orderId: string };
      breakdown: { grossInr: number; discountInr: number; netInr: number; taxInr: number; totalInr: number };
    };
  };

  // Growth is ₹2,499.50. 10% off = ₹249.95, GST 18% on ₹2,249.55 = ₹404.92.
  assert.equal(session.breakdown.grossInr, 249_950);
  assert.equal(session.breakdown.discountInr, 24_995);
  assert.equal(session.breakdown.netInr, 224_955);
  assert.equal(session.breakdown.taxInr, 40_492);
  assert.equal(session.breakdown.totalInr, 265_447);

  const orderId = session.razorpay.orderId;
  const confirmed = await verify(
    json(
      "http://scanner.test/api/billing/verify",
      "POST",
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_coupon",
        razorpay_signature: checkoutSignature(orderId, "pay_coupon"),
      },
      SAME_ORIGIN
    )
  );
  assert.equal(confirmed.status, 200);

  signInAs(OWNER_EMAIL);
  const couponsRes = await listCoupons();
  const { coupons } = (await couponsRes.json()) as {
    coupons: Array<{ code: string; timesRedeemed: number; maxRedemptions: number }>;
  };
  const launch = coupons.find((c) => c.code === "LAUNCH10");
  assert.ok(launch);
  assert.equal(launch.timesRedeemed, 1, "the redemption ledger counts the use");
  assert.equal(launch.maxRedemptions, 1);

  // The coupon is now exhausted: a second checkout must be refused, not
  // silently charged full price.
  const secondStore = await createTestStore();
  const exhausted = await checkout(
    json(
      "http://scanner.test/api/billing/checkout",
      "POST",
      { storeId: secondStore.id, planId: "growth", couponCode: "LAUNCH10" },
      SAME_ORIGIN
    )
  );
  assert.equal(exhausted.status, 400);
  assert.match((await exhausted.json()).error, /fully redeemed/i);
});

test("a 100%-off coupon activates access without a zero-rupee gateway order", async () => {
  const { POST: createCoupon } = await import("../app/api/billing/coupons/route");
  const { POST: checkout } = await import("../app/api/billing/checkout/route");

  signInAs(OWNER_EMAIL);
  const couponRes = await createCoupon(
    json(
      "http://scanner.test/api/billing/coupons",
      "POST",
      { code: "FRIEND100", discountType: "percent", discountValue: 100 },
      SAME_ORIGIN
    )
  );
  assert.equal(couponRes.status, 201);

  const store = await createTestStore();
  const callsBefore = gatewayCalls.length;
  const res = await checkout(
    json(
      "http://scanner.test/api/billing/checkout",
      "POST",
      { storeId: store.id, planId: "solo", couponCode: "FRIEND100" },
      SAME_ORIGIN
    )
  );
  assert.equal(res.status, 201, "a fully discounted checkout is an activation, not an error");
  const { checkout: session } = (await res.json()) as {
    checkout: {
      kind: string;
      subscription: { status: string; currentPeriodEnd: string };
      entitlement: { entitled: boolean };
      payment: { amountInr: number; status: string };
      razorpay?: unknown;
    };
  };

  assert.equal(session.kind, "activated");
  assert.equal(session.razorpay, undefined, "no gateway order is created below ₹1");
  assert.equal(gatewayCalls.length, callsBefore, "the gateway is never called for a zero amount");
  assert.equal(session.payment.amountInr, 0);
  assert.equal(session.payment.status, "paid");
  assert.equal(session.entitlement.entitled, true);
  assert.equal(session.subscription.status, "active");
});

/* -------------------------------------------------------------------------- */
/* Webhook                                                                    */
/* -------------------------------------------------------------------------- */

test("the webhook verifies the raw-body signature, activates, and is idempotent", async () => {
  const { POST: checkout } = await import("../app/api/billing/checkout/route");
  const { POST: webhook } = await import("../app/api/billing/webhook/route");

  const store = await createTestStore();
  const res = await checkout(
    json("http://scanner.test/api/billing/checkout", "POST", { storeId: store.id, planId: "solo" }, SAME_ORIGIN)
  );
  const { checkout: session } = (await res.json()) as { checkout: { razorpay: { orderId: string } } };
  const orderId = session.razorpay.orderId;

  const body = JSON.stringify({
    entity: "event",
    event: "payment.captured",
    payload: { payment: { entity: { id: "pay_webhook_1", order_id: orderId } } },
  });

  const unsigned = new Request("http://scanner.test/api/billing/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": "not-the-signature" },
    body,
  });
  assert.equal((await webhook(unsigned)).status, 401, "an unsigned delivery is rejected outright");

  const signed = () =>
    new Request("http://scanner.test/api/billing/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": webhookSignature(body),
        "x-razorpay-event-id": "evt_1",
      },
      body,
    });

  assert.equal((await webhook(signed())).status, 200);

  const { GET: getSubscription } = await import("../app/api/billing/subscription/route");
  signInAs(OWNER_EMAIL);
  const state = await getSubscription(
    new Request(`http://scanner.test/api/billing/subscription?storeId=${store.id}`)
  );
  assert.equal(state.status, 200);
  const first = (await state.json()) as {
    subscription: { status: string; currentPeriodEnd: string };
    entitlement: { entitled: boolean };
    payments: Array<{ status: string; confirmedVia: string }>;
  };
  assert.equal(first.subscription.status, "active");
  assert.equal(first.entitlement.entitled, true);
  assert.equal(first.payments[0].confirmedVia, "webhook");

  // Razorpay delivers at least once: replay must not stack another period.
  assert.equal((await webhook(signed())).status, 200);
  const afterReplay = await getSubscription(
    new Request(`http://scanner.test/api/billing/subscription?storeId=${store.id}`)
  );
  const second = (await afterReplay.json()) as { subscription: { currentPeriodEnd: string } };
  assert.equal(second.subscription.currentPeriodEnd, first.subscription.currentPeriodEnd);

  // A failed payment is recorded without touching the subscription.
  const failStore = await createTestStore();
  const failCheckout = await checkout(
    json(
      "http://scanner.test/api/billing/checkout",
      "POST",
      { storeId: failStore.id, planId: "solo" },
      SAME_ORIGIN
    )
  );
  const { checkout: failSession } = (await failCheckout.json()) as {
    checkout: { razorpay: { orderId: string } };
  };
  const failedBody = JSON.stringify({
    event: "payment.failed",
    payload: {
      payment: {
        entity: { id: "pay_failed", order_id: failSession.razorpay.orderId, error_description: "card declined" },
      },
    },
  });
  const failedReq = new Request("http://scanner.test/api/billing/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": webhookSignature(failedBody) },
    body: failedBody,
  });
  assert.equal((await webhook(failedReq)).status, 200);

  const failedState = await getSubscription(
    new Request(`http://scanner.test/api/billing/subscription?storeId=${failStore.id}`)
  );
  const failed = (await failedState.json()) as {
    subscription: { status: string };
    entitlement: { entitled: boolean };
    payments: Array<{ status: string; failureReason?: string }>;
  };
  assert.equal(failed.subscription.status, "trial", "a failed payment does not disturb the trial");
  assert.equal(failed.payments[0].status, "failed");
  assert.match(failed.payments[0].failureReason || "", /declined/);
});

/* -------------------------------------------------------------------------- */
/* Entitlement gate                                                           */
/* -------------------------------------------------------------------------- */

test("menu customisation is gated server-side on an entitled subscription", async () => {
  const { POST: createItemRoute, GET: getMenuRoute } = await import(
    "../app/api/stores/[id]/menu/route"
  );
  const { PATCH: patchItemRoute, DELETE: deleteItemRoute } = await import(
    "../app/api/menu/[id]/route"
  );
  const { PATCH: patchSubscription } = await import("../app/api/billing/subscription/route");

  signInAs(OWNER_EMAIL);
  const store = await createTestStore(); // starts on the 30-minute trial

  const onTrial = await createItemRoute(
    json("http://scanner.test", "POST", { name: "Trial Dish", price: 100 }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(onTrial.status, 201, "the trial allows customisation");
  const { item } = (await onTrial.json()) as { item: { id: string } };

  const cancelled = await patchSubscription(
    json(
      "http://scanner.test/api/billing/subscription",
      "PATCH",
      { storeId: store.id, action: "cancel", reason: "test churn" },
      SAME_ORIGIN
    )
  );
  assert.equal(cancelled.status, 200);

  const blocked = await createItemRoute(
    json("http://scanner.test", "POST", { name: "Locked Dish", price: 100 }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(blocked.status, 402, "a churned location may not add items");
  const blockedBody = (await blocked.json()) as { code: string; entitlement: { entitled: boolean } };
  assert.equal(blockedBody.code, "subscription_required");
  assert.equal(blockedBody.entitlement.entitled, false);

  const blockedPatch = await patchItemRoute(
    json("http://scanner.test", "PATCH", { price: 200 }, SAME_ORIGIN),
    routeCtx(item.id)
  );
  assert.equal(blockedPatch.status, 402, "edits are customisation too");

  const blockedDelete = await deleteItemRoute(
    new Request("http://scanner.test", { method: "DELETE", headers: SAME_ORIGIN }),
    routeCtx(item.id)
  );
  assert.equal(blockedDelete.status, 402);

  // Reads keep working: the QR and the owner's data must not break on churn.
  const read = await getMenuRoute(new Request("http://scanner.test"), routeCtx(store.id));
  assert.equal(read.status, 200);
  const readBody = (await read.json()) as { items: unknown[]; entitlement: { entitled: boolean } };
  assert.equal(readBody.items.length, 1);
  assert.equal(readBody.entitlement.entitled, false);

  // Only the platform owner can restart the trial, and it restores access.
  signInAs(GM_EMAIL);
  const notAllowed = await patchSubscription(
    json(
      "http://scanner.test/api/billing/subscription",
      "PATCH",
      { storeId: store.id, action: "start_trial", trialMinutes: 30 },
      SAME_ORIGIN
    )
  );
  assert.equal(notAllowed.status, 403, "a tenant must not mint their own trial");

  signInAs(OWNER_EMAIL);
  const restarted = await patchSubscription(
    json(
      "http://scanner.test/api/billing/subscription",
      "PATCH",
      { storeId: store.id, action: "start_trial", trialMinutes: 30 },
      SAME_ORIGIN
    )
  );
  assert.equal(restarted.status, 200);
  const restartedBody = (await restarted.json()) as { entitlement: { entitled: boolean; state: string } };
  assert.equal(restartedBody.entitlement.entitled, true);
  assert.equal(restartedBody.entitlement.state, "trial");

  const unlocked = await createItemRoute(
    json("http://scanner.test", "POST", { name: "Live Again", price: 100 }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(unlocked.status, 201, "restarting the trial restores customisation");
});

/* -------------------------------------------------------------------------- */
/* Manual records and invoicing                                               */
/* -------------------------------------------------------------------------- */

test("a hand-recorded subscription gets a real paid period, not an instant expiry", async () => {
  const { POST: recordSubscription } = await import("../app/api/revenue/route");
  const { GET: getSubscription } = await import("../app/api/billing/subscription/route");

  const store = await createTestStore();
  const res = await recordSubscription(
    json(
      "http://scanner.test/api/revenue",
      "POST",
      {
        storeId: store.id,
        plan: "solo",
        status: "active",
        mrrRupees: 999,
        billingPeriod: "monthly",
        gstin: "29ABCDE1234F1Z5",
      },
      SAME_ORIGIN
    )
  );
  assert.equal(res.status, 201);
  const { subscription } = (await res.json()) as { subscription: { currentPeriodEnd?: string } };
  assert.ok(
    subscription.currentPeriodEnd,
    "a paid record must carry the period it was paid for, or the menu locks instantly"
  );

  const state = await getSubscription(
    new Request(`http://scanner.test/api/billing/subscription?storeId=${store.id}`)
  );
  const body = (await state.json()) as {
    entitlement: { entitled: boolean; state: string; daysRemaining: number };
  };
  assert.equal(body.entitlement.entitled, true);
  assert.equal(body.entitlement.state, "active");
  assert.ok(body.entitlement.daysRemaining >= 29);
});

test("the tax invoice bills what was charged, not the monthly MRR figure", async () => {
  process.env.SUPPLIER_GSTIN = "29ABCDE1234F1Z5";
  process.env.SUPPLIER_NAME = "SayaLabs";

  const store = await createTestStore();
  const { POST: checkout } = await import("../app/api/billing/checkout/route");
  const { POST: verify } = await import("../app/api/billing/verify/route");

  // The agency plan is annual: Rs 1,49,990 + 18% GST.
  const res = await checkout(
    json(
      "http://scanner.test/api/billing/checkout",
      "POST",
      { storeId: store.id, planId: "agency", gstin: "29ABCDE1234F1Z5" },
      SAME_ORIGIN
    )
  );
  assert.equal(res.status, 200);
  const { checkout: session } = (await res.json()) as {
    checkout: { razorpay: { orderId: string }; breakdown: { totalInr: number } };
  };
  assert.equal(session.breakdown.totalInr, 17_698_820);

  const confirmed = await verify(
    json(
      "http://scanner.test/api/billing/verify",
      "POST",
      {
        razorpay_order_id: session.razorpay.orderId,
        razorpay_payment_id: "pay_annual",
        razorpay_signature: checkoutSignature(session.razorpay.orderId, "pay_annual"),
      },
      SAME_ORIGIN
    )
  );
  assert.equal(confirmed.status, 200);
  const activated = (await confirmed.json()) as { subscription: { mrrInr: number } };
  assert.equal(
    activated.subscription.mrrInr,
    1_249_917,
    "MRR is stored monthly even when the customer paid for a year"
  );

  const { GET: invoiceRoute } = await import("../app/api/revenue/invoice/route");
  const invoiceRes = await invoiceRoute(
    new Request(`http://scanner.test/api/revenue/invoice?storeId=${store.id}`)
  );
  assert.equal(invoiceRes.status, 200);
  const html = await invoiceRes.text();
  // en-IN groups by lakh: Rs 1,49,990.00 renders as "1,49,990.00".
  assert.ok(html.includes("1,49,990.00"), "the invoice must bill the annual amount actually charged");
  assert.equal(
    html.includes("12,499.17"),
    false,
    "the monthly MRR figure must never become the invoice — it would under-bill by 12x"
  );
});

/* -------------------------------------------------------------------------- */
/* Tenant scoping                                                             */
/* -------------------------------------------------------------------------- */

test("a store admin can subscribe their own location but not touch pricing or another location", async () => {
  const { POST: checkout } = await import("../app/api/billing/checkout/route");
  const { GET: getSubscription } = await import("../app/api/billing/subscription/route");

  signInAs(OWNER_EMAIL);
  const mine = await createTestStore();
  const other = await createTestStore();

  const { createTeamMember } = await import("../lib/store");
  await createTeamMember({
    email: "scoped-gm@billing.test",
    name: "Scoped GM",
    role: "store_admin",
    storeIds: [mine.id],
  });

  signInAs("scoped-gm@billing.test");

  const ownCheckout = await checkout(
    json("http://scanner.test/api/billing/checkout", "POST", { storeId: mine.id, planId: "solo" }, SAME_ORIGIN)
  );
  assert.equal(ownCheckout.status, 200, "an owner may subscribe a location they manage");

  const otherCheckout = await checkout(
    json("http://scanner.test/api/billing/checkout", "POST", { storeId: other.id, planId: "solo" }, SAME_ORIGIN)
  );
  assert.equal(otherCheckout.status, 403, "a store admin may not spend on another location");

  const otherRead = await getSubscription(
    new Request(`http://scanner.test/api/billing/subscription?storeId=${other.id}`)
  );
  assert.equal(otherRead.status, 403);

  const ownRead = await getSubscription(
    new Request(`http://scanner.test/api/billing/subscription?storeId=${mine.id}`)
  );
  assert.equal(ownRead.status, 200);
  const own = (await ownRead.json()) as {
    subscription: { storeId: string } | null;
    entitlement: { storeId: string };
    payments: Array<{ storeId: string }>;
  };
  assert.equal(own.subscription?.storeId, mine.id);
  assert.ok(own.payments.every((p) => p.storeId === mine.id), "the payment history is store-scoped");
});
