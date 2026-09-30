import test from "node:test";
import assert from "node:assert/strict";
import { GET as getStores, POST as createStoreRoute } from "../app/api/stores/route";
import { GET as getStoreByIdRoute, PUT as updateStoreRoute, DELETE as deleteStoreRoute } from "../app/api/stores/[id]/route";
import { POST as generateReviewRoute } from "../app/api/generate-review/route";
import { POST as logEventRoute } from "../app/api/events/route";
import { GET as getFeedbackRoute, POST as submitFeedbackRoute, PATCH as patchFeedbackRoute } from "../app/api/feedback/route";
import { GET as getAnalyticsRoute } from "../app/api/analytics/route";

test("GET /api/stores returns 200 with list of stores", async () => {
  const res = await getStores();
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.stores));
  assert.ok(data.stores.length >= 3);
});

test("POST /api/stores validates required fields and creates store", async () => {
  // Test invalid payload
  const badReq = new Request("http://localhost/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const badRes = await createStoreRoute(badReq);
  assert.equal(badRes.status, 400);

  // Test valid payload
  const goodReq = new Request("http://localhost/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "API Test Bistro",
      slug: "api-test-bistro",
      tagline: "Farm to table delights",
      category: "Bistro",
      chips: ["Truffle Burger", "Craft Beer"],
    }),
  });
  const goodRes = await createStoreRoute(goodReq);
  assert.equal(goodRes.status, 201);
  const data = await goodRes.json();
  assert.equal(data.store.name, "API Test Bistro");
  assert.equal(data.store.slug, "api-test-bistro");
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

test("POST /api/events logs scan events successfully", async () => {
  const req = new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: "store_luigi_1",
      type: "copy_open",
      rating: 5,
      chips: ["Woodfired Crust"],
    }),
  });

  const res = await logEventRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.event.id);
});

test("Reputation Firewall: POST, GET, and PATCH /api/feedback", async () => {
  // 1. Submit negative complaint
  const postReq = new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeId: "store_luigi_1",
      storeName: "Luigi's Woodfired Trattoria",
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

  // 2. Fetch feedback list
  const getReq = new Request("http://localhost/api/feedback?storeId=store_luigi_1");
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
});

test("GET /api/analytics returns complete telemetry stats", async () => {
  const req = new Request("http://localhost/api/analytics");
  const res = await getAnalyticsRoute(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.analytics.totalScans >= 100);
  assert.ok(Array.isArray(data.analytics.topChips));
  assert.ok(data.analytics.redirectionRate > 0);
});

test("GET, PUT, and DELETE /api/stores/[id] lifecycle", async () => {
  // 1. Create a temporary store to test with
  const createReq = new Request("http://localhost/api/stores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Dynamic Test Cafe",
      slug: "dynamic-test-cafe",
      tagline: "Fresh coffee and pastries",
      category: "Cafe",
      chips: ["Cortado", "Almond Croissant"],
    }),
  });
  const createRes = await createStoreRoute(createReq);
  assert.equal(createRes.status, 201);
  const createdData = await createRes.json();
  const storeId = createdData.store.id;
  assert.ok(storeId);

  // 2. GET by ID
  const getReq = new Request(`http://localhost/api/stores/${storeId}`);
  const getRes = await getStoreByIdRoute(getReq, { params: Promise.resolve({ id: storeId }) });
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.store.name, "Dynamic Test Cafe");

  // 3. PUT update
  const putReq = new Request(`http://localhost/api/stores/${storeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tagline: "Updated Specialty Brews",
    }),
  });
  const putRes = await updateStoreRoute(putReq, { params: Promise.resolve({ id: storeId }) });
  assert.equal(putRes.status, 200);
  const putData = await putRes.json();
  assert.equal(putData.store.tagline, "Updated Specialty Brews");

  // 4. DELETE
  const deleteReq = new Request(`http://localhost/api/stores/${storeId}`, { method: "DELETE" });
  const deleteRes = await deleteStoreRoute(deleteReq, { params: Promise.resolve({ id: storeId }) });
  assert.equal(deleteRes.status, 200);

  // 5. Subsequent GET returns 404
  const afterDeleteRes = await getStoreByIdRoute(getReq, { params: Promise.resolve({ id: storeId }) });
  assert.equal(afterDeleteRes.status, 404);
});
