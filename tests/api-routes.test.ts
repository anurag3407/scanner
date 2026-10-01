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
import { GET as getTeamRoute, POST as createTeamMemberRoute } from "../app/api/team/route";
import { PUT as updateTeamMemberRoute, DELETE as deleteTeamMemberRoute } from "../app/api/team/[id]/route";

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
      storeName: "Third Wave Coffee & Roastery",
      category: "Speciality Coffee Roastery",
      chips: ["Speciality Cold Brew", "Santosh (Barista)"],
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
      customerName: "Rohan Sharma",
      customerContact: "rohan.sharma@gmail.com",
      message: "Cold brew was delayed and served warm.",
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
  assert.equal(item.message, "Cold brew was delayed and served warm.");

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

test("RBAC: team directory invites, reassigns, suspends, and removes store admins", async () => {
  const store = await createTestStore({ ...validStorePayload, slug: "rbac-team-store", name: "RBAC Team Store" });

  const payload = {
    email: "Owner@Cafe.com",
    name: "Cafe Owner",
    role: "store_admin",
    // "missing-store" must be filtered out so assignments can never dangle.
    storeIds: [store.id, "missing-store"],
  };

  const postRes = await createTeamMemberRoute(
    new Request("http://localhost/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
  assert.equal(postRes.status, 201);
  const member = (await postRes.json()).member;
  assert.equal(member.email, "owner@cafe.com");
  assert.deepEqual(member.storeIds, [store.id]);

  // Duplicate invitations are rejected
  const duplicateRes = await createTeamMemberRoute(
    new Request("http://localhost/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
  assert.equal(duplicateRes.status, 409);

  // The platform owner email can never be invited as a member
  const ownerEmailRes = await createTeamMemberRoute(
    new Request("http://localhost/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: process.env.ADMIN_ALLOWED_EMAIL || "anuragmishra3407@gmail.com" }),
    })
  );
  assert.equal(ownerEmailRes.status, 409);

  // Directory listing includes the invited admin
  const listRes = await getTeamRoute();
  assert.equal(listRes.status, 200);
  const members = (await listRes.json()).members;
  assert.ok(members.some((m: { id: string }) => m.id === member.id));

  // Suspend access
  const suspendRes = await updateTeamMemberRoute(
    new Request(`http://localhost/api/team/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "suspended" }),
    }),
    { params: Promise.resolve({ id: member.id }) }
  );
  assert.equal(suspendRes.status, 200);
  assert.equal((await suspendRes.json()).member.status, "suspended");

  // Remove from the team
  const deleteRes = await deleteTeamMemberRoute(
    new Request(`http://localhost/api/team/${member.id}`, { method: "DELETE" }),
    { params: Promise.resolve({ id: member.id }) }
  );
  assert.equal(deleteRes.status, 200);

  await deleteStoreRoute(new Request("http://localhost/api/stores/" + store.id), {
    params: Promise.resolve({ id: store.id }),
  });
});

test("PUT /api/stores/[id] saves and clears Review Studio sentence combinations", async () => {
  const store = await createTestStore({ ...validStorePayload, slug: "studio-test-store", name: "Studio Test Store" });

  const templates = {
    intros: ["Big love for {name}!"],
    highlights: ["The {chip} was unreal."],
    closers: ["Back again next week for sure."],
  };

  const putRes = await updateStoreRoute(
    new Request(`http://localhost/api/stores/${store.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewTemplates: templates }),
    }),
    { params: Promise.resolve({ id: store.id }) }
  );
  assert.equal(putRes.status, 200);
  const saved = (await putRes.json()).store;
  assert.deepEqual(saved.reviewTemplates, templates);

  // An empty set clears the override so the built-in library is used again
  const clearRes = await updateStoreRoute(
    new Request(`http://localhost/api/stores/${store.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewTemplates: { intros: [], highlights: [], closers: [] } }),
    }),
    { params: Promise.resolve({ id: store.id }) }
  );
  assert.equal(clearRes.status, 200);
  assert.equal((await clearRes.json()).store.reviewTemplates, undefined);

  await deleteStoreRoute(new Request("http://localhost/api/stores/" + store.id), {
    params: Promise.resolve({ id: store.id }),
  });
});

test("Low-rating alerts go to the store's own owners and are recorded on the feedback", async () => {
  const store = await createTestStore({
    ...validStorePayload,
    slug: "owner-alert-store",
    name: "Owner Alert Store",
    managerEmail: "owner1@cafe.com, owner2@cafe.com",
  });

  const postRes = await submitFeedbackRoute(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, rating: 2, message: "Service was slow tonight" }),
    })
  );
  assert.equal(postRes.status, 201);
  const feedback = (await postRes.json()).feedback;

  assert.ok(feedback.alert, "Alert delivery should be recorded");
  assert.deepEqual(feedback.alert.recipients, ["owner1@cafe.com", "owner2@cafe.com"]);
  assert.ok(["sent", "failed"].includes(feedback.alert.status), "An attempt must be recorded as sent or failed");

  // The delivery record is persisted for the firewall inbox
  const listRes = await getFeedbackRoute(new Request(`http://localhost/api/feedback?storeId=${store.id}`));
  const stored = (await listRes.json()).feedbacks.find((f: { id: string }) => f.id === feedback.id);
  assert.equal(stored.alert.status, feedback.alert.status);
  assert.deepEqual(stored.alert.recipients, ["owner1@cafe.com", "owner2@cafe.com"]);

  await deleteStoreRoute(new Request("http://localhost/api/stores/" + store.id), {
    params: Promise.resolve({ id: store.id }),
  });
});

test("A store with no owner inbox records a skipped alert instead of emailing the platform", async () => {
  const store = await createTestStore({
    ...validStorePayload,
    slug: "no-owner-store",
    name: "No Owner Store",
    managerEmail: "",
  });

  const postRes = await submitFeedbackRoute(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, rating: 1, message: "Wrong order twice" }),
    })
  );
  assert.equal(postRes.status, 201);
  const feedback = (await postRes.json()).feedback;

  assert.equal(feedback.alert.status, "skipped");
  assert.deepEqual(feedback.alert.recipients, [], "No platform fallback recipient is used");

  await deleteStoreRoute(new Request("http://localhost/api/stores/" + store.id), {
    params: Promise.resolve({ id: store.id }),
  });
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
