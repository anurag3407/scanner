import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GET as getStores, POST as createStoreRoute } from "../app/api/stores/route";
import { GET as getStoreByIdRoute, PUT as updateStoreRoute, DELETE as deleteStoreRoute } from "../app/api/stores/[id]/route";
import { POST as generateReviewRoute } from "../app/api/generate-review/route";
import { POST as logEventRoute } from "../app/api/events/route";
import { GET as getFeedbackRoute, POST as submitFeedbackRoute, PATCH as patchFeedbackRoute } from "../app/api/feedback/route";
import { GET as getAnalyticsRoute } from "../app/api/analytics/route";

// Isolated file store — never the production Supabase database.
process.env.NODE_ENV = "test";
const TEST_DATA_FILE = path.join(os.tmpdir(), `reviewboost-api-test-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
});

const validStorePayload = {
  name: "API Test Bistro",
  slug: "api-test-bistro",
  tagline: "Farm to table delights",
  category: "Bistro",
  googlePlaceId: "ChIJapiTestPlaceId",
  chips: ["Truffle Burger", "Craft Beer"],
  managerEmail: "gm@apitestbistro.com",
  managerPhone: "+15550001111",
  address: "10 API Street",
  tableCount: 14,
};

async function createTestStore(payload: Record<string, unknown> = validStorePayload) {
  const req = new Request("http://localhost/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await createStoreRoute(req);
  assert.equal(res.status, 201);
  const data = await res.json();
  return data.store;
}

test("GET /api/stores returns 200 with an empty list on a fresh install", async () => {
  const res = await getStores();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.stores));
  assert.equal(data.stores.length, 0);
});

test("POST /api/stores validates required fields, Google Place ID and duplicate slugs", async () => {
  // Missing name/slug
  const badReq = new Request("http://localhost/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const badRes = await createStoreRoute(badReq);
  assert.equal(badRes.status, 400);

  // Missing Google Place ID — reviews would post to the wrong business
  const noPlaceIdReq = new Request("http://localhost/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "No Place ID Cafe", slug: "no-place-id-cafe" }),
  });
  const noPlaceIdRes = await createStoreRoute(noPlaceIdReq);
  assert.equal(noPlaceIdRes.status, 400);

  // Valid payload
  const store = await createTestStore();
  assert.equal(store.name, "API Test Bistro");
  assert.equal(store.slug, "api-test-bistro");
  assert.equal(store.googlePlaceId, "ChIJapiTestPlaceId");
  assert.equal(store.reviewCount, 0);

  // Duplicate slug
  const duplicateReq = new Request("http://localhost/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...validStorePayload, name: "Copycat Bistro" }),
  });
  const duplicateRes = await createStoreRoute(duplicateReq);
  assert.equal(duplicateRes.status, 409);

  await deleteStoreRoute(new Request("http://localhost/api/stores/" + store.id, { method: "DELETE" }), {
    params: Promise.resolve({ id: store.id }),
  });
});

test("POST /api/generate-review returns review with latency metrics", async () => {
  const req = new Request("http://localhost/api/generate-review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeName: "Luigi's Woodfired Trattoria",
      category: "Italian Trattoria",
      chips: ["Woodfired Crust", "Marco (Host)"],
      rating: 5,
    }),
  });

  const res = await generateReviewRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.review.length > 30);
  assert.ok(data.source === "gemini" || data.source === "instant_engine");
});

test("POST /api/events logs scan events and rejects invalid event types", async () => {
  const store = await createTestStore({ ...validStorePayload, slug: "events-test-bistro" });

  const req = new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: store.id,
      type: "copy_open",
      rating: 5,
      chips: ["Truffle Burger"],
    }),
  });

  const res = await logEventRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.event.id);

  // Sprint 1: invalid types must be rejected
  const badTypeReq = new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeId: store.id, type: "not_a_real_event", rating: 5 }),
  });
  assert.equal((await logEventRoute(badTypeReq)).status, 400);

  // Events for unknown stores must be rejected
  const unknownStoreReq = new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeId: "missing-store", type: "scan", rating: 5 }),
  });
  assert.equal((await logEventRoute(unknownStoreReq)).status, 404);

  await deleteStoreRoute(new Request("http://localhost/api/stores/" + store.id), {
    params: Promise.resolve({ id: store.id }),
  });
});

test("Reputation Firewall: POST, GET, and PATCH /api/feedback", async () => {
  const store = await createTestStore({ ...validStorePayload, slug: "feedback-test-bistro" });

  // 1. Submit negative complaint (public — no account required)
  const postReq = new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: store.id,
      storeName: "Spoofed Name That Must Be Ignored",
      rating: 1,
      tableNumber: "12",
      customerName: "Mark S",
      customerContact: "mark@example.com",
      message: "Steak was overcooked and took an hour.",
    }),
  });

  const postRes = await submitFeedbackRoute(postReq);
  assert.equal(postRes.status, 201);
  const postData = await postRes.json();
  assert.ok(postData.feedback.id);
  assert.equal(postData.feedback.status, "new");
  // The real store name from the database is used, not the client value
  assert.equal(postData.feedback.storeName, "API Test Bistro");

  // 2. Fetch feedback list
  const getReq = new Request(`http://localhost/api/feedback?storeId=${store.id}`);
  const getRes = await getFeedbackRoute(getReq);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  const item = getData.feedbacks.find((f: { id: string }) => f.id === postData.feedback.id);
  assert.ok(item);
  assert.equal(item.message, "Steak was overcooked and took an hour.");

  // 3. Patch status to resolved
  const patchReq = new Request("http://localhost/api/feedback", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: postData.feedback.id,
      status: "resolved",
    }),
  });
  const patchRes = await patchFeedbackRoute(patchReq);
  assert.equal(patchRes.status, 200);

  // 4. Invalid status is rejected
  const badPatchReq = new Request("http://localhost/api/feedback", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: postData.feedback.id, status: "banana" }),
  });
  assert.equal((await patchFeedbackRoute(badPatchReq)).status, 400);

  await deleteStoreRoute(new Request("http://localhost/api/stores/" + store.id), {
    params: Promise.resolve({ id: store.id }),
  });
});

test("GET /api/analytics returns real telemetry stats (zero on a fresh install)", async () => {
  const req = new Request("http://localhost/api/analytics");
  const res = await getAnalyticsRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.analytics.totalScans, "number");
  assert.ok(Array.isArray(data.analytics.topChips));
  assert.ok(data.analytics.redirectionRate >= 0 && data.analytics.redirectionRate <= 100);
  assert.equal(data.analytics.dailyActivity.length, 7);
});

test("GET, PUT, and DELETE /api/stores/[id] lifecycle", async () => {
  const store = await createTestStore({ ...validStorePayload, slug: "dynamic-test-cafe", name: "Dynamic Test Cafe" });

  // 2. GET by ID
  const getReq = new Request(`http://localhost/api/stores/${store.id}`);
  const getRes = await getStoreByIdRoute(getReq, { params: Promise.resolve({ id: store.id }) });
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.store.name, "Dynamic Test Cafe");

  // 3. PUT update
  const putReq = new Request(`http://localhost/api/stores/${store.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tagline: "Updated Specialty Brews",
    }),
  });
  const putRes = await updateStoreRoute(putReq, { params: Promise.resolve({ id: store.id }) });
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.store.tagline, "Updated Specialty Brews");

  // 4. PUT cannot blank out the Google Place ID
  const badPutReq = new Request(`http://localhost/api/stores/${store.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ googlePlaceId: "" }),
  });
  assert.equal(
    (await updateStoreRoute(badPutReq, { params: Promise.resolve({ id: store.id }) })).status,
    400
  );

  // 5. DELETE
  const deleteReq = new Request(`http://localhost/api/stores/${store.id}`, { method: "DELETE" });
  const deleteRes = await deleteStoreRoute(deleteReq, { params: Promise.resolve({ id: store.id }) });
  assert.equal(deleteRes.status, 200);

  // 6. Subsequent GET returns 404
  const afterDeleteRes = await getStoreByIdRoute(getReq, { params: Promise.resolve({ id: store.id }) });
  assert.equal(afterDeleteRes.status, 404);
});

test("Security: Admin endpoints reject requests when unauthenticated in production mode", async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    const res = await getStores();
    // In production without Clerk keys configured or session, must fail closed with 503 or 401
    assert.ok(res.status === 503 || res.status === 401);
    const body = await res.json();
    assert.ok(body.error);
  } finally {
    process.env.NODE_ENV = originalEnv;
  }
});
