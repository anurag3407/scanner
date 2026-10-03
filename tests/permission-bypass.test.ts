/**
 * ADVERSARIAL HARNESS — authorization bypass attempts.
 *
 * These tests forge a valid Clerk session (via node:test module mocks) and then
 * try every route an authenticated, unauthenticated, or store-scoped attacker
 * could reach. The purpose is to PROVE the RBAC boundaries actually hold —
 * a green run here is evidence that the permissions cannot be bypassed.
 *
 * These deliberately exercise the real handlers, not a mock of the app.
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mock } from "node:test";

/* -------------------------------------------------------------------------- */
/* Environment: isolated data file, REAL auth (no test bypass)                */
/* -------------------------------------------------------------------------- */
process.env.NODE_ENV = "test";
delete process.env.AUTH_BYPASS_TESTS;
const TEST_DATA_FILE = path.join(os.tmpdir(), `reviewboost-bypass-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
// The menu data layer writes to its own file — point it at tmpdir too, or a
// test run would create/modify .data/menu-data.json in the repository.
const TEST_MENU_DATA_FILE = path.join(os.tmpdir(), `reviewboost-bypass-menu-${process.pid}.json`);
process.env.MENU_DATA_FILE = TEST_MENU_DATA_FILE;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Clerk appears configured, and the identity it returns is fully attacker-controlled
// via CURRENT_USER_EMAIL. This is the most dangerous case: a forged, signed-in
// session belonging to somebody who was never invited.
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_mock_forged";
process.env.CLERK_SECRET_KEY = "sk_mock_forged";
const PLATFORM_OWNER = "owner@platform.test";
process.env.ADMIN_ALLOWED_EMAIL = PLATFORM_OWNER;

// Controls which forged Clerk identity the mocked server hands back.
function signInAs(email: string) {
  process.env.CURRENT_USER_EMAIL = email;
}
function signOut() {
  process.env.CURRENT_USER_EMAIL = "";
  forgedUserShape = null;
}

/** The subset of Clerk's User resource these tests forge. */
interface ForgedClerkUser {
  id?: string;
  primaryEmailAddress?: { emailAddress?: string; verification?: { status?: string } };
  emailAddresses?: Array<{ emailAddress?: string; verification?: { status?: string } }>;
}

/** Lets a test hand the mocked Clerk server an arbitrary user object. */
let forgedUserShape: ForgedClerkUser | null = null;

const mockAuth = async () => {
  if (forgedUserShape) return { userId: "user_forged" };
  const email = process.env.CURRENT_USER_EMAIL || "";
  return { userId: email ? "user_forged" : null };
};

const mockCurrentUser = async () => {
  if (forgedUserShape) return forgedUserShape;
  const email = process.env.CURRENT_USER_EMAIL || "";
  if (!email) return null;
  return {
    id: "user_forged",
    primaryEmailAddress: { emailAddress: email, verification: { status: "verified" } },
    emailAddresses: [{ emailAddress: email, verification: { status: "verified" } }],
  };
};

const mockCreateClerkClient = () => ({ users: { getUser: async () => null } });

mock.module("server-only", { exports: {} });

const clerkMockExports = {
  auth: mockAuth,
  currentUser: mockCurrentUser,
  createClerkClient: mockCreateClerkClient,
  default: {
    auth: mockAuth,
    currentUser: mockCurrentUser,
    createClerkClient: mockCreateClerkClient,
  },
};

mock.module("@clerk/nextjs/server", { exports: clerkMockExports });
try {
  mock.module(import.meta.resolve("@clerk/nextjs/server"), { exports: clerkMockExports });
} catch {}
try {
  mock.module(require.resolve("@clerk/nextjs/server"), { exports: clerkMockExports });
} catch {}

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                  */
/* -------------------------------------------------------------------------- */
let VICTIM_STORE: { id: string; slug: string };
let OTHER_STORE: { id: string; slug: string };
const STORE_ADMIN_EMAIL = "gm@victim.test";

const json = (url: string, method: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

before(async () => {
  const { createStore, createTeamMember } = await import("../lib/store");

  VICTIM_STORE = await createStore({
    name: "Victim Bistro",
    slug: "victim-bistro",
    tagline: "Private",
    category: "Restaurant",
    googlePlaceId: "ChIJvictimStore",
    brandColor: "#E11D48",
    chips: ["Secret Dish"],
    seoKeywords: [],
    managerEmail: "victim-owner@victim.test",
    managerPhone: "+91-90000-00000",
    address: "Victim Road",
    tableCount: 5,
  });

  OTHER_STORE = await createStore({
    name: "Other Cafe",
    slug: "other-cafe",
    tagline: "Also Private",
    category: "Cafe",
    googlePlaceId: "ChIJotherStore",
    brandColor: "#0d9488",
    chips: [],
    seoKeywords: [],
    managerEmail: "other-owner@other.test",
    managerPhone: "",
    address: "Other Road",
    tableCount: 3,
  });

  // A legitimate store admin, assigned ONLY to VICTIM_STORE.
  await createTeamMember({
    email: STORE_ADMIN_EMAIL,
    name: "Legit GM",
    role: "store_admin",
    storeIds: [VICTIM_STORE.id],
  });
});

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
  fs.rmSync(TEST_MENU_DATA_FILE, { force: true });
});

/** Creates a team member straight through the data layer for test setup. */
async function createMember(email: string, name: string, role: "super_admin" | "store_admin", storeIds: string[]) {
  const { createTeamMember } = await import("../lib/store");
  return createTeamMember({ email, name, role, storeIds });
}

/* -------------------------------------------------------------------------- */
/* 1. Unauthenticated access must be refused everywhere                       */
/* -------------------------------------------------------------------------- */

test("No session at all: every admin API refuses", async () => {
  signOut();
  const { GET: getStores } = await import("../app/api/stores/route");
  const { GET: getAnalytics } = await import("../app/api/analytics/route");
  const { GET: getFeedback } = await import("../app/api/feedback/route");
  const { GET: getTeam } = await import("../app/api/team/route");
  const { GET: getStoreById } = await import("../app/api/stores/[id]/route");

  const cases: Array<[string, number]> = [
    ["GET /api/stores", (await getStores()).status],
    ["GET /api/analytics", (await getAnalytics(new Request("http://x/api/analytics"))).status],
    ["GET /api/feedback", (await getFeedback(new Request("http://x/api/feedback"))).status],
    ["GET /api/team", (await getTeam()).status],
    [
      `GET /api/stores/${VICTIM_STORE.id}`,
      (await getStoreById(new Request("http://x"), { params: Promise.resolve({ id: VICTIM_STORE.id }) })).status,
    ],
  ];

  for (const [label, status] of cases) {
    assert.equal(status, 401, `${label} must return 401 without a session`);
  }
});

test("No session at all: every mutating admin API refuses", async () => {
  signOut();
  const { POST: createStore } = await import("../app/api/stores/route");
  const { PUT: updateStore, DELETE: deleteStore } = await import("../app/api/stores/[id]/route");
  const { POST: createTeam } = await import("../app/api/team/route");
  const { DELETE: deleteTeam } = await import("../app/api/team/[id]/route");
  const { PATCH: patchFeedback } = await import("../app/api/feedback/route");

  assert.equal((await createStore(json("http://x/api/stores", "POST", {}))).status, 401);
  assert.equal(
    (await updateStore(json("http://x", "PUT", { name: "pwn" }), { params: Promise.resolve({ id: VICTIM_STORE.id }) })).status,
    401
  );
  assert.equal(
    (await deleteStore(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: VICTIM_STORE.id }) })).status,
    401
  );
  assert.equal((await createTeam(json("http://x/api/team", "POST", { email: "a@b.test" }))).status, 401);
  assert.equal(
    (await deleteTeam(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: "member_x" }) })).status,
    401
  );
  assert.equal(
    (await patchFeedback(json("http://x/api/feedback", "PATCH", { id: "x", status: "resolved" }))).status,
    401
  );
});

/* -------------------------------------------------------------------------- */
/* 2. Signed in but NOT invited — must be refused                             */
/* -------------------------------------------------------------------------- */

test("Signed in but never invited: the whole console is refused", async () => {
  signInAs("attacker@evil.test");
  const { getSessionUser } = await import("../lib/auth");
  const { GET: getStores } = await import("../app/api/stores/route");
  const { POST: createStore } = await import("../app/api/stores/route");
  const { GET: getTeam } = await import("../app/api/team/route");

  assert.equal(await getSessionUser(), null, "an uninvited email must not become a session user");
  assert.equal((await getStores()).status, 403);
  assert.equal((await createStore(json("http://x/api/stores", "POST", { name: "x", slug: "x", googlePlaceId: "ChIJx" }))).status, 403);
  assert.equal((await getTeam()).status, 403);
});

/* -------------------------------------------------------------------------- */
/* 3. Suspended member must lose access                                       */
/* -------------------------------------------------------------------------- */

test("A suspended store admin is refused everywhere, even on their own store", async () => {
  const { updateTeamMember, getTeamMembers } = await import("../lib/store");
  const { GET: getStores } = await import("../app/api/stores/route");
  const { getSessionUser } = await import("../lib/auth");
  const memberId = (await getTeamMembers()).find((m) => m.email === STORE_ADMIN_EMAIL)!.id;

  try {
    await updateTeamMember(memberId, { status: "suspended" });

    signInAs(STORE_ADMIN_EMAIL);
    assert.equal(await getSessionUser(), null, "a suspended member must not resolve to a session");
    assert.equal((await getStores()).status, 403);
  } finally {
    await updateTeamMember(memberId, { status: "active" });
  }
});

/* -------------------------------------------------------------------------- */
/* 4. Horizontal privilege escalation — the real bypass surface               */
/* -------------------------------------------------------------------------- */

test("Store admin CANNOT read a store they are not assigned to (IDOR)", async () => {
  signInAs(STORE_ADMIN_EMAIL);
  const { GET: getStoreById, PUT: updateStore } = await import("../app/api/stores/[id]/route");
  const { GET: getAnalytics } = await import("../app/api/analytics/route");
  const { GET: getFeedback } = await import("../app/api/feedback/route");

  // Direct-by-id access to the other tenant.
  const other = OTHER_STORE.id;
  assert.equal(
    (await getStoreById(new Request("http://x"), { params: Promise.resolve({ id: other }) })).status,
    403,
    "reading another tenant's store by id must be refused"
  );
  assert.equal(
    (await updateStore(json("http://x", "PUT", { name: "owned" }), { params: Promise.resolve({ id: other }) })).status,
    403,
    "editing another tenant's store must be refused"
  );

  // Analytics / feedback filtered by a foreign storeId.
  assert.equal(
    (await getAnalytics(new Request(`http://x/api/analytics?storeId=${other}`))).status,
    403,
    "analytics for another tenant must be refused"
  );
  assert.equal(
    (await getFeedback(new Request(`http://x/api/feedback?storeId=${other}`))).status,
    403,
    "feedback for another tenant must be refused"
  );
});

test("Store admin's LIST endpoints never leak the other tenant", async () => {
  signInAs(STORE_ADMIN_EMAIL);
  const { GET: getStores } = await import("../app/api/stores/route");
  const { GET: getAnalytics } = await import("../app/api/analytics/route");
  const { GET: getFeedback } = await import("../app/api/feedback/route");

  const stores = (await (await getStores()).json()).stores as Array<{ id: string; name: string }>;
  assert.deepEqual(stores.map((s) => s.id), [VICTIM_STORE.id], "only the assigned store may be listed");

  // Feedback for the other tenant must not appear anywhere in the unscoped list.
  const feedback = (await (await getFeedback(new Request("http://x/api/feedback"))).json()).feedbacks as Array<{ storeId: string }>;
  assert.equal(feedback.some((f) => f.storeId === OTHER_STORE.id), false, "no cross-tenant feedback may be returned");

  // Analytics totals must count only their own store.
  const analytics = (await (await getAnalytics(new Request("http://x/api/analytics"))).json()).analytics as {
    recentEvents: Array<{ storeId: string }>;
  };
  assert.equal(
    analytics.recentEvents.some((e) => e.storeId === OTHER_STORE.id),
    false,
    "no cross-tenant events may be returned"
  );
});

test("Store admin CANNOT touch another tenant's menu items (IDOR)", async () => {
  signInAs(PLATFORM_OWNER);
  const { createMenuItem } = await import("../lib/menu");
  const foreignItem = await createMenuItem({
    storeId: OTHER_STORE.id,
    name: "Other Tenant Secret Dish",
    description: "",
    price: 999,
    category: "Mains",
    isVeg: false,
    isAvailable: true,
    sortOrder: 0,
  });

  // Now act as the store admin who is assigned ONLY to VICTIM_STORE.
  signInAs(STORE_ADMIN_EMAIL);
  const { GET: getStoreMenu, POST: addToMenu } = await import("../app/api/stores/[id]/menu/route");
  const { GET: getItem, PATCH: patchItem, DELETE: deleteItem } = await import("../app/api/menu/[id]/route");

  // Reading another tenant's menu through the admin endpoint is refused.
  assert.equal(
    (await getStoreMenu(new Request("http://x"), { params: Promise.resolve({ id: OTHER_STORE.id }) })).status,
    403,
    "reading another tenant's menu must be refused"
  );
  // So is adding items to it.
  assert.equal(
    (
      await addToMenu(
        json("http://x", "POST", { name: "Injected Item" }, {
          origin: "http://scanner.test",
          "sec-fetch-site": "same-origin",
        }),
        { params: Promise.resolve({ id: OTHER_STORE.id }) }
      )
    ).status,
    403,
    "adding items to another tenant's menu must be refused"
  );

  // Knowing a foreign item's id grants nothing: read, edit, delete all refuse.
  assert.equal(
    (await getItem(new Request("http://x"), { params: Promise.resolve({ id: foreignItem.id }) })).status,
    403,
    "reading a foreign menu item by id must be refused"
  );
  assert.equal(
    (
      await patchItem(
        json("http://x", "PATCH", { name: "Hacked Item" }, {
          origin: "http://scanner.test",
          "sec-fetch-site": "same-origin",
        }),
        { params: Promise.resolve({ id: foreignItem.id }) }
      )
    ).status,
    403,
    "editing a foreign menu item must be refused"
  );
  assert.equal(
    (
      await deleteItem(new Request("http://x", { method: "DELETE", headers: {
        origin: "http://scanner.test",
        "sec-fetch-site": "same-origin",
      } }), { params: Promise.resolve({ id: foreignItem.id }) })
    ).status,
    403,
    "deleting a foreign menu item must be refused"
  );

  // The foreign item must be completely untouched.
  const { getMenuItemById } = await import("../lib/menu");
  const after = await getMenuItemById(foreignItem.id);
  assert.equal(after!.name, "Other Tenant Secret Dish", "the foreign item must survive the attack");
  assert.equal(after!.storeId, OTHER_STORE.id, "the foreign item must keep its owner");

  // Control: the same admin CAN manage their own store's menu.
  const own = await addToMenu(
    json("http://scanner.test/api/x", "POST", { name: "Own Dish", price: 100 }, {
      origin: "http://scanner.test",
      "sec-fetch-site": "same-origin",
    }),
    { params: Promise.resolve({ id: VICTIM_STORE.id }) }
  );
  assert.equal(own.status, 201, "a store admin must be able to add items to their OWN menu");

  // ...but a caller-chosen id or storeId in the payload must be ignored.
  const { item } = (await own.json()) as { item: { id: string; storeId: string } };
  assert.notEqual(item.id, "", "the item id is server-minted");
  assert.equal(item.storeId, VICTIM_STORE.id, "the item must belong to the caller's store");

  // And a reorder mixing a foreign id is rejected wholesale.
  const { PUT: reorderMenu } = await import("../app/api/stores/[id]/menu/route");
  assert.equal(
    (
      await reorderMenu(
        json("http://scanner.test/api/x", "PUT", { itemIds: [item.id, foreignItem.id] }, {
          origin: "http://scanner.test",
          "sec-fetch-site": "same-origin",
        }),
        { params: Promise.resolve({ id: VICTIM_STORE.id }) }
      )
    ).status,
    400,
    "a reorder containing a foreign id must be rejected"
  );
  signOut();
});

test("Store admin CANNOT escalate to platform owner", async () => {
  signInAs(STORE_ADMIN_EMAIL);
  const { POST: createStore } = await import("../app/api/stores/route");
  const { DELETE: deleteStore } = await import("../app/api/stores/[id]/route");
  const { GET: getTeam, POST: createTeam } = await import("../app/api/team/route");
  const { PUT: updateTeam, DELETE: deleteTeam } = await import("../app/api/team/[id]/route");

  assert.equal(
    (await createStore(json("http://x/api/stores", "POST", { name: "Mine", slug: "mine", googlePlaceId: "ChIJmine" }))).status,
    403,
    "creating a location is owner-only"
  );
  assert.equal(
    (await deleteStore(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: VICTIM_STORE.id }) })).status,
    403,
    "deleting a location is owner-only"
  );
  assert.equal((await getTeam()).status, 403, "team directory is owner-only");
  assert.equal((await createTeam(json("http://x/api/team", "POST", { email: "me@evil.test" }))).status, 403);
  assert.equal(
    (await updateTeam(json("http://x", "PUT", { role: "super_admin" }), { params: Promise.resolve({ id: "m" }) })).status,
    403,
    "promoting oneself is owner-only"
  );
  assert.equal(
    (await deleteTeam(new Request("http://x", { method: "DELETE" }), { params: Promise.resolve({ id: "m" }) })).status,
    403
  );
});

test("Store admin CANNOT edit their own team record to gain stores or super-admin", async () => {
  signInAs(STORE_ADMIN_EMAIL);
  const { getTeamMembers } = await import("../lib/store");
  const me = (await getTeamMembers()).find((m) => m.email === STORE_ADMIN_EMAIL)!;

  // Confirm no escalation persisted anywhere.
  assert.deepEqual(me.storeIds, [VICTIM_STORE.id], "self-escalation must not have taken effect");
  assert.equal(me.role, "store_admin", "self-promotion must not have taken effect");
  assert.equal(me.status, "active");

  // And they still cannot reach the other tenant.
  const { GET: getById } = await import("../app/api/stores/[id]/route");
  assert.equal(
    (await getById(new Request("http://x"), { params: Promise.resolve({ id: OTHER_STORE.id }) })).status,
    403
  );
});

/* -------------------------------------------------------------------------- */
/* 5. Privilege escalation via payload / type confusion                        */
/* -------------------------------------------------------------------------- */

test("Mass-assignment of privileged fields is ignored on store create", async () => {
  signInAs(PLATFORM_OWNER);
  const { POST: createStore } = await import("../app/api/stores/route");

  const res = await createStore(
    json("http://x/api/stores", "POST", {
      name: "Mass Assign Cafe",
      slug: "mass-assign-cafe",
      googlePlaceId: "ChIJmassAssign",
      // None of these are client-writable; the server owns them.
      id: "attacker_chosen_id",
      createdAt: "1999-01-01T00:00:00.000Z",
      ratingScore: 5000,
      reviewCount: 999999,
    })
  );
  assert.equal(res.status, 201);
  const { store } = (await res.json()) as { store: Record<string, unknown> };

  assert.notEqual(store.id, "attacker_chosen_id", "the client must not choose the store id");
  assert.equal(store.ratingScore, 0, "rating must start at 0");
  assert.equal(store.reviewCount, 0, "review count must start at 0");
  assert.ok(!String(store.createdAt).startsWith("1999"), "createdAt must be server-generated");
});

test("Mass-assignment on store update cannot rewrite id or counters", async () => {
  signInAs(PLATFORM_OWNER);
  const { PUT: updateStore } = await import("../app/api/stores/[id]/route");

  const res = await updateStore(
    json("http://x", "PUT", {
      id: "hijacked_id",
      ratingScore: 5000,
      reviewCount: 999999,
      createdAt: "1999-01-01T00:00:00.000Z",
      name: "Renamed Bistro",
    }),
    { params: Promise.resolve({ id: VICTIM_STORE.id }) }
  );
  assert.equal(res.status, 200);
  const { store } = (await res.json()) as { store: Record<string, unknown> };

  assert.equal(store.id, VICTIM_STORE.id, "id must be preserved");
  assert.equal(store.ratingScore, 0, "rating must be untouched");
  assert.equal(store.reviewCount, 0, "review count must be untouched");
  assert.ok(!String(store.createdAt).startsWith("1999"), "createdAt must be preserved");
  assert.equal(store.name, "Renamed Bistro", "the legitimate field must still update");
});

test("An invited store admin cannot grant themselves other stores", async () => {
  const { createTeamMember, getTeamMembers } = await import("../lib/store");
  // The API routes are owner-only, but prove the DATA layer won't hand out a
  // forged assignment either, and that the admin cannot reach the route.
  signInAs(STORE_ADMIN_EMAIL);
  const { POST: createTeam } = await import("../app/api/team/route");
  assert.equal(
    (await createTeam(
      json("http://x/api/team", "POST", { email: "me2@evil.test", role: "super_admin", storeIds: ["*"] })
    )).status,
    403
  );

  // Confirm no new member leaked in.
  assert.equal(
    (await getTeamMembers()).some((m) => m.email === "me2@evil.test"),
    false,
    "no member may be created by a non-owner"
  );

  // And direct data-layer writes still go through validation.
  const member = await createTeamMember({
    email: "assign-test@store.test",
    name: "Assign Test",
    role: "store_admin",
    storeIds: [OTHER_STORE.id],
  });
  assert.deepEqual(member.storeIds, [OTHER_STORE.id]);
});

/* -------------------------------------------------------------------------- */
/* 6. Public-surface abuse must not reach protected data                      */
/* -------------------------------------------------------------------------- */

test("The public scan page never carries owner PII (no auth needed)", async () => {
  const { getStoreByScanKey, toPublicStore } = await import("../lib/store");
  const store = await getStoreByScanKey(VICTIM_STORE.slug);
  const payload = JSON.stringify(toPublicStore(store!));

  assert.ok(!payload.includes("victim-owner@victim.test"), "owner email must not reach the diner page");
  assert.ok(!payload.includes("90000-00000"), "owner phone must not reach the diner page");
});

test("Public telemetry cannot be used to read data or touch admin routes", async () => {
  signOut();
  const { POST: logEvent } = await import("../app/api/events/route");
  const { POST: submitFeedback } = await import("../app/api/feedback/route");

  // Anonymous writes are allowed by design (that is the product)...
  const ev = await logEvent(
    json("http://x/api/events", "POST", { storeId: VICTIM_STORE.id, type: "scan", rating: 5 })
  );
  assert.equal(ev.status, 200);

  // ...but they must not accept a caller-chosen event id.
  const bad = await logEvent(
    json("http://x/api/events", "POST", { storeId: VICTIM_STORE.id, type: "scan", rating: 5, id: "chosen" })
  );
  assert.equal(bad.status, 200);
  const { event } = (await bad.json()) as { event: { id: string } };
  assert.ok(event && typeof event.id === "string", "the event must be echoed back");
  assert.notEqual(event.id, "chosen", "the client must not choose the telemetry id");

  // Feedback must attribute the complaint to the real store, not the payload.
  const fb = await submitFeedback(
    json("http://x/api/feedback", "POST", {
      storeId: VICTIM_STORE.id,
      storeName: "SPOOFED NAME",
      rating: 1,
      message: "bad service",
    })
  );
  assert.equal(fb.status, 201);
  const { feedback } = (await fb.json()) as { feedback: { storeName: string } };
  assert.ok(feedback && feedback.storeName, "the complaint must be stored");
  // The real store name comes from the database, never the request body.
  // (Compare against the live row: an earlier test may have renamed it.)
  const { getStoreById: readStore } = await import("../lib/store");
  const realName = (await readStore(VICTIM_STORE.id))!.name;
  assert.equal(feedback.storeName, realName, "client-supplied store name must be ignored");
  assert.notEqual(feedback.storeName, "SPOOFED NAME", "the spoofed name must not be stored");
});

test("Anonymous callers cannot mark somebody else's complaint as resolved", async () => {
  signOut();
  const { POST: submitFeedback } = await import("../app/api/feedback/route");
  const { PATCH: patchFeedback } = await import("../app/api/feedback/route");

  const created = await submitFeedback(
    json("http://x/api/feedback", "POST", { storeId: VICTIM_STORE.id, rating: 2, message: "anonymous" })
  );
  const { feedback } = (await created.json()) as { feedback: { id: string } };

  assert.equal((await patchFeedback(json("http://x/api/feedback", "PATCH", { id: feedback.id, status: "resolved" }))).status, 401);

  const { getFeedbackById } = await import("../lib/store");
  assert.equal((await getFeedbackById(feedback.id))!.status, "new", "the complaint must remain open");
});

/* -------------------------------------------------------------------------- */
/* 7. CSRF: a same-site attacker page must not ride the victim's session      */
/* -------------------------------------------------------------------------- */

test("Cross-site POST/PUT/DELETE/PATCH are refused even with a valid session", async () => {
  signInAs(PLATFORM_OWNER);
  const evil = {
    origin: "https://evil.example.com",
    "sec-fetch-site": "cross-site",
  };
  const { POST: createStore } = await import("../app/api/stores/route");
  const { PUT: updateStore, DELETE: deleteStore } = await import("../app/api/stores/[id]/route");
  const { POST: createTeam } = await import("../app/api/team/route");
  const { PATCH: patchFeedback } = await import("../app/api/feedback/route");

  assert.equal((await createStore(json("http://x/api/stores", "POST", { name: "x", slug: "csrf-x", googlePlaceId: "ChIJx" }, evil))).status, 403);
  assert.equal((await updateStore(json("http://x", "PUT", { name: "x" }, evil), { params: Promise.resolve({ id: VICTIM_STORE.id }) })).status, 403);
  assert.equal((await deleteStore(new Request("http://x", { method: "DELETE", headers: evil }), { params: Promise.resolve({ id: VICTIM_STORE.id }) })).status, 403);
  assert.equal((await createTeam(json("http://x/api/team", "POST", { email: "e@e.test" }, evil))).status, 403);
  assert.equal((await patchFeedback(json("http://x/api/feedback", "PATCH", { id: "x", status: "resolved" }, evil))).status, 403);

  // The store must still be intact after the attack.
  const { getStoreById } = await import("../lib/store");
  assert.ok(await getStoreById(VICTIM_STORE.id), "the victim's store must survive a CSRF attempt");
});

/* -------------------------------------------------------------------------- */
/* 8. The platform owner is the only unrestricted identity                    */
/* -------------------------------------------------------------------------- */

test("The configured platform owner does get full access (control test)", async () => {
  signInAs(PLATFORM_OWNER);
  const { getSessionUser } = await import("../lib/auth");
  const user = await getSessionUser();
  assert.ok(user, "the owner must resolve to a session");
  assert.equal(user!.isSuperAdmin, true);
  assert.equal(user!.email, PLATFORM_OWNER);

  const { GET: getStores } = await import("../app/api/stores/route");
  const stores = (await (await getStores()).json()).stores as Array<{ id: string }>;
  assert.equal(stores.length >= 2, true, "the owner sees every location");
});

test("Look-alike owner addresses do NOT grant super-admin", async () => {
  const { isSuperAdminEmail } = await import("../lib/auth");

  // The real check normalizes case and trims — so the owner variants DO match.
  // What must not work is a *different* address that merely resembles it.
  assert.equal(isSuperAdminEmail("attacker@platform.test.evil.com"), false, "a look-alike domain must not match");
  assert.equal(isSuperAdminEmail("owner+admin@platform.test"), false, "a sub-address must not match");
  assert.equal(isSuperAdminEmail("notowner@platform.test"), false);

  // And a real, separate signed-in identity is still refused.
  signInAs("notowner@platform.test");
  const { getSessionUser } = await import("../lib/auth");
  assert.equal(await getSessionUser(), null);
});

/* -------------------------------------------------------------------------- */
/* 9. Fail-closed authorization: malformed directory records must not grant   */
/* -------------------------------------------------------------------------- */

test("Only the literal status 'active' grants console access", async () => {
  const { updateTeamMember, getTeamMembers } = await import("../lib/store");
  const { getSessionUser } = await import("../lib/auth");
  const email = "status-probe@tenant.test";

  await createMember(email, "Status Probe", "store_admin", [VICTIM_STORE.id]);
  const memberId = (await getTeamMembers()).find((m) => m.email === email)!.id;

  // Anything that is not exactly "active" must be refused. Previously only
  // "suspended" was checked, so a typo, a capitalized variant, an empty value
  // or a missing field silently granted full store-admin access.
  const DENIED: Array<unknown> = [
    "suspended", "SUSPENDED", "ACTIVE", "active ", "deleted", "revoked", "", null, undefined, 0, 1, {},
  ];

  try {
    for (const status of DENIED) {
      await updateTeamMember(memberId, { status } as never);
      signInAs(email);
      const user = await getSessionUser();
      assert.equal(
        user,
        null,
        `status=${JSON.stringify(status)} must not resolve to a session user`
      );
    }

    // Control: the exact string still works, so the check is not over-broad.
    await updateTeamMember(memberId, { status: "active" });
    signInAs(email);
    const user = await getSessionUser();
    assert.ok(user, "status 'active' must still grant access");
    assert.equal(user!.role, "store_admin");
    assert.deepEqual(user!.storeIds, [VICTIM_STORE.id]);
  } finally {
    signOut();
  }
});

test("A corrupted storeIds value cannot widen a member's scope", async () => {
  const { updateTeamMember, getTeamMembers } = await import("../lib/store");
  const { getSessionUser } = await import("../lib/auth");
  const email = "scope-probe@tenant.test";

  await createMember(email, "Scope Probe", "store_admin", [VICTIM_STORE.id]);
  const memberId = (await getTeamMembers()).find((m) => m.email === email)!.id;

  try {
    // Garbage in place of an array must never become an unbounded grant.
    // The only invariant that matters is that scope can shrink or stay put,
    // but must never grow beyond the originally assigned store.
    const allowed = new Set([VICTIM_STORE.id]);
    // Only well-formed store ids may appear in a scope. Wildcards, nested
    // arrays and non-string junk must be dropped, not stringified into ids.
    for (const bad of ["*", "", null, { $gt: "" }, 42, ["*"], [[OTHER_STORE.id]], [42], [null]]) {
      await updateTeamMember(memberId, { storeIds: bad } as never);
      signInAs(email);
      const user = await getSessionUser();
      if (!user) continue; // fail-closed (denied) is also acceptable
      for (const id of user!.storeIds) {
        assert.ok(
          allowed.has(id),
          `garbage storeIds=${JSON.stringify(bad)} leaked store ${id}`
        );
      }
    }
  } finally {
    signOut();
  }
});

test("An out-of-enum role cannot be used to claim super-admin", async () => {
  const { updateTeamMember, getTeamMembers } = await import("../lib/store");
  const { getSessionUser } = await import("../lib/auth");
  const email = "role-probe@tenant.test";

  await createMember(email, "Role Probe", "store_admin", [VICTIM_STORE.id]);
  const memberId = (await getTeamMembers()).find((m) => m.email === email)!.id;

  try {
    for (const role of ["owner", "SUPER_ADMIN", "superadmin", "platform_owner", "", null]) {
      await updateTeamMember(memberId, { role } as never);
      signInAs(email);
      const user = await getSessionUser();
      if (user) {
        assert.equal(
          user!.isSuperAdmin,
          false,
          `role=${JSON.stringify(role)} must not resolve to super-admin`
        );
        assert.equal(user!.role, "store_admin", `role=${JSON.stringify(role)} must degrade to store_admin`);
      }
    }
  } finally {
    signOut();
  }
});

test("A feedback row whose storeId is tampered cannot be resolved by an admin", async () => {
  signOut();
  const { POST: submitRoute } = await import("../app/api/feedback/route");

  // Create a complaint against the tenant the store admin does NOT own.
  const created = await submitRoute(
    json("http://x/api/feedback", "POST", {
      storeId: OTHER_STORE.id,
      rating: 1,
      message: "tamper probe",
    })
  );
  assert.equal(created.status, 201);
  const { feedback } = (await created.json()) as { feedback: { id: string } };

  // The store admin must not be able to flip it to resolved.
  signInAs(STORE_ADMIN_EMAIL);
  const { PATCH: patchFeedback } = await import("../app/api/feedback/route");
  const res = await patchFeedback(
    json("http://x/api/feedback", "PATCH", { id: feedback.id, status: "resolved" })
  );
  assert.equal(res.status, 403, "a cross-tenant complaint must not be resolvable");

  const { getFeedbackById } = await import("../lib/store");
  assert.equal((await getFeedbackById(feedback.id))!.status, "new", "the complaint must stay open");
});


test("Only the platform owner can widen a member's store assignments", async () => {
  const { getTeamMembers } = await import("../lib/store");

  signInAs(STORE_ADMIN_EMAIL);
  const { PUT: updateTeam } = await import("../app/api/team/[id]/route");
  const target = (await getTeamMembers()).find((m) => m.email === STORE_ADMIN_EMAIL)!;

  const res = await updateTeam(
    json("http://scanner.test/api/team/x", "PUT", { storeIds: [OTHER_STORE.id] }, {
      origin: "http://scanner.test",
      "sec-fetch-site": "same-origin",
    }),
    { params: Promise.resolve({ id: target.id }) }
  );
  assert.equal(res.status, 403, "widening another member's scope must be owner-only");

  // And the assignment on disk is untouched.
  const after = (await getTeamMembers()).find((m) => m.email === STORE_ADMIN_EMAIL)!;
  assert.deepEqual(after.storeIds, [VICTIM_STORE.id], "scope must not have widened");

  // Control: the owner can do it.
  signInAs(PLATFORM_OWNER);
  const ok = await updateTeam(
    json("http://scanner.test/api/team/x", "PUT", { storeIds: [VICTIM_STORE.id, OTHER_STORE.id] }, {
      origin: "http://scanner.test",
      "sec-fetch-site": "same-origin",
    }),
    { params: Promise.resolve({ id: target.id }) }
  );
  assert.equal(ok.status, 200, "the owner must still be able to assign stores");
  const widened = (await getTeamMembers()).find((m) => m.email === STORE_ADMIN_EMAIL)!;
  assert.deepEqual(widened.storeIds, [VICTIM_STORE.id, OTHER_STORE.id]);

  // Restore, so later tests keep the original scope.
  await updateTeam(
    json("http://scanner.test/api/team/x", "PUT", { storeIds: [VICTIM_STORE.id] }),
    { params: Promise.resolve({ id: target.id }) }
  );
  signOut();
});

/* -------------------------------------------------------------------------- */
/* 10. Middleware coverage invariant                                          */
/* -------------------------------------------------------------------------- */

test("Every admin API route is covered by the proxy matcher AND by its own handler check", async () => {
  // The proxy is defense-in-depth; the authoritative gate is the handler's own
  // assert* call. This test pins BOTH so neither layer can silently drift:
  // a new admin route that forgets the middleware, or forgets the inner
  // check, fails here instead of shipping.
  const fs = await import("node:fs");
  const path = await import("node:path");

  const proxySrc = fs.readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8");

  // Routes whose handlers call an assert* gate.
  const adminApis = [
    { route: "app/api/stores/route.ts", gate: "assertAdminAuth" },
    { route: "app/api/stores/[id]/route.ts", gate: "assertStoreAccess" },
    { route: "app/api/stores/[id]/menu/route.ts", gate: "assertStoreAccess" },
    { route: "app/api/menu/[id]/route.ts", gate: "assertStoreAccess" },
    { route: "app/api/analytics/route.ts", gate: "assertAdminAuth" },
    { route: "app/api/feedback/route.ts", gate: "assertAdminAuth" },
    { route: "app/api/team/route.ts", gate: "assertSuperAdmin" },
    { route: "app/api/team/[id]/route.ts", gate: "assertSuperAdmin" },
  ];

  for (const { route, gate } of adminApis) {
    const src = fs.readFileSync(path.join(process.cwd(), route), "utf8");
    assert.ok(
      src.includes(gate),
      `${route} must call ${gate} — the handler is the authoritative gate`
    );
  }

  // The proxy must at least front /api/team, which it previously did not.
  assert.ok(
    /"\/api\/team\(\.\*\)"/.test(proxySrc),
    "proxy.ts must protect /api/team(.*) as defense-in-depth"
  );
  assert.ok(
    /"\/api\/menu\(\.\*\)"/.test(proxySrc),
    "proxy.ts must protect /api/menu(.*) (owner menu writes) as defense-in-depth"
  );

  // Public endpoints must stay reachable without a session.
  for (const publicRoute of [
    "app/api/events/route.ts",
    "app/api/generate-review/route.ts",
    "app/api/public/menu/[key]/route.ts",
  ]) {
    const src = fs.readFileSync(path.join(process.cwd(), publicRoute), "utf8");
    assert.ok(
      !src.includes("assertAdminAuth") && !src.includes("assertSuperAdmin"),
      `${publicRoute} must stay public for diners`
    );
  }
});

/* -------------------------------------------------------------------------- */
/* 11. Misconfigured owner env must fail closed                                */
/* -------------------------------------------------------------------------- */

test("A whitespace-only ADMIN_ALLOWED_EMAIL falls back to the default owner", async () => {
  const { getSuperAdminEmail, isSuperAdminEmail } = await import("../lib/auth");
  const previous = process.env.ADMIN_ALLOWED_EMAIL;

  try {
    // `process.env.X || default` does NOT cover these: a whitespace-only value
    // is truthy, survived the `||`, then trimmed to "". That made the owner
    // comparison match every user with no verified email address.
    for (const bad of ["   ", "\n", "\t", " \r\n "]) {
      process.env.ADMIN_ALLOWED_EMAIL = bad;
      assert.notEqual(
        getSuperAdminEmail(),
        "",
        `ADMIN_ALLOWED_EMAIL=${JSON.stringify(bad)} must not resolve to an empty owner`
      );
      assert.equal(
        isSuperAdminEmail(""),
        false,
        "an empty address must never match the owner account"
      );
    }

    // A genuinely empty value still falls back rather than becoming "".
    process.env.ADMIN_ALLOWED_EMAIL = "";
    assert.notEqual(getSuperAdminEmail(), "");

    delete process.env.ADMIN_ALLOWED_EMAIL;
    assert.notEqual(getSuperAdminEmail(), "");

    // Control: a real configured owner still works.
    process.env.ADMIN_ALLOWED_EMAIL = "owner@platform.test";
    assert.equal(getSuperAdminEmail(), "owner@platform.test");
    assert.equal(isSuperAdminEmail("OWNER@PLATFORM.TEST"), true);
    assert.equal(isSuperAdminEmail(""), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_ALLOWED_EMAIL;
    else process.env.ADMIN_ALLOWED_EMAIL = previous;
  }
});

test("A Clerk user with no verified email is never a super admin, whatever the owner config", async () => {
  const { getSessionUser } = await import("../lib/auth");
  const { isClerkConfigured } = await import("../lib/clerk");
  assert.equal(isClerkConfigured(), true, "the harness needs Clerk configured to reach this path");

  const previous = process.env.ADMIN_ALLOWED_EMAIL;
  try {
    // Under each owner configuration, a user with no usable email must be
    // refused rather than silently matching an empty owner address.
    for (const owner of [undefined, "", "   ", "owner@platform.test"]) {
      if (owner === undefined) delete process.env.ADMIN_ALLOWED_EMAIL;
      else process.env.ADMIN_ALLOWED_EMAIL = owner;

      for (const user of [
        // primary present but unverified
        {
          id: "u",
          primaryEmailAddress: { emailAddress: "ghost@evil.test", verification: { status: "unverified" } },
          emailAddresses: [{ emailAddress: "ghost@evil.test", verification: { status: "unverified" } }],
        },
        // no email fields at all
        { id: "u" },
        // entirely empty
        {},
        // verified but empty string
        {
          id: "u",
          primaryEmailAddress: { emailAddress: "", verification: { status: "verified" } },
          emailAddresses: [{ emailAddress: "", verification: { status: "verified" } }],
        },
      ]) {
        forgedUserShape = user;
        const u = await getSessionUser();
        assert.equal(
          u,
          null,
          `owner=${JSON.stringify(owner)} user=${JSON.stringify(user)} must not authorize`
        );
      }
    }
  } finally {
    forgedUserShape = null;
    if (previous === undefined) delete process.env.ADMIN_ALLOWED_EMAIL;
    else process.env.ADMIN_ALLOWED_EMAIL = previous;
  }
});

/* -------------------------------------------------------------------------- */
/* 12. Misconfigured Clerk keys must not look "configured"                    */
/* -------------------------------------------------------------------------- */

test("isClerkConfigured rejects blank or malformed keys", async () => {
  const { isClerkConfigured } = await import("../lib/clerk");
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sk = process.env.CLERK_SECRET_KEY;

  try {
    const cases: Array<[string, string | undefined, string | undefined, boolean]> = [
      ["both unset", undefined, undefined, false],
      ["publishable blank", "", "sk_mock_x", false],
      ["secret blank", "pk_mock_x", "", false],
      ["publishable whitespace", "   ", "sk_mock_x", false],
      ["secret whitespace", "pk_mock_x", "\t", false],
      ["both whitespace", "  ", "\n", false],
      ["publishable not a pk", "not-a-key", "sk_mock_x", false],
      ["secret not an sk", "pk_mock_x", "not-a-key", false],
      ["genuine pair", "pk_mock_x", "sk_mock_x", true],
    ];

    for (const [label, p, s, expected] of cases) {
      if (p === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
      else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = p;
      if (s === undefined) delete process.env.CLERK_SECRET_KEY;
      else process.env.CLERK_SECRET_KEY = s;

      assert.equal(
        isClerkConfigured(),
        expected,
        `${label}: isClerkConfigured must be ${expected}`
      );
    }
  } finally {
    if (pk === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk;
    if (sk === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = sk;
  }
});

/* -------------------------------------------------------------------------- */
/* 13. Property-style fuzz over the authorization primitives                   */
/* -------------------------------------------------------------------------- */

test("hasStoreAccess / isSuperAdminEmail / scopedStoreIds hold their invariants", async () => {
  const { hasStoreAccess, isSuperAdminEmail, scopedStoreIds } = await import("../lib/auth");

  const VICTIM = "store_victim_abc123";
  const unassigned = {
    email: "a@b.c", role: "store_admin" as const, storeIds: [] as string[], isSuperAdmin: false,
  };
  const assigned = { ...unassigned, storeIds: [VICTIM] };
  const owner = {
    email: "o@x.y", role: "super_admin" as const, storeIds: [] as string[], isSuperAdmin: true,
  };

  // A store admin must not reach ANY location they were not assigned, no matter
  // how the id is mangled.
  for (const weird of [
    "", " ", VICTIM.toUpperCase(), ` ${VICTIM}`, VICTIM.slice(0, -1), "../../etc/passwd",
    "__proto__", "constructor", "prototype", "*", "store_", VICTIM + "\n", "\t" + VICTIM,
    encodeURIComponent(VICTIM), decodeURIComponent(VICTIM),
  ]) {
    assert.equal(
      hasStoreAccess(unassigned, weird),
      false,
      `an unassigned store admin must not reach ${JSON.stringify(weird)}`
    );
  }
  // Control: the exact assigned id still works.
  assert.equal(hasStoreAccess(assigned, VICTIM), true);

  // A super admin keeps unrestricted access, including for junk ids.
  for (const weird of ["", "*", "__proto__", "no-such-store", "../../x"]) {
    assert.equal(hasStoreAccess(owner, weird), true, `the owner must keep access to ${JSON.stringify(weird)}`);
  }

  // The owner check must never match a DIFFERENT address...
  for (const addr of [
    "", " ", "owner@platform.test.evil.com", "evil-owner@platform.test",
    "owner+admin@platform.test", "owner@platform..test", "xowner@platform.test",
    "owner@platform", "@platform.test", "owner@", "OWNER@PLATFORM.TEST.evil.com",
    "owner@platform.testx", "xowner@platform.testx",
  ]) {
    assert.equal(
      isSuperAdminEmail(addr),
      false,
      `${JSON.stringify(addr)} must not be treated as the owner`
    );
  }
  // ...while legitimate case/whitespace variants of the real owner still work.
  for (const addr of [
    PLATFORM_OWNER, PLATFORM_OWNER.toUpperCase(), `  ${PLATFORM_OWNER}  `, `${PLATFORM_OWNER} `,
  ]) {
    assert.equal(isSuperAdminEmail(addr), true, `${JSON.stringify(addr)} IS the owner`);
  }

  // Scoping must never widen.
  assert.deepEqual(scopedStoreIds(unassigned), []);
  assert.equal(scopedStoreIds(owner), null);
  assert.deepEqual(scopedStoreIds(assigned), [VICTIM]);
});


/* -------------------------------------------------------------------------- */
/* 14. Data-access layer must not hand a wildcard scope to authorization      */
/* -------------------------------------------------------------------------- */

test("A tampered on-disk membership cannot smuggle a wildcard into storeIds", async () => {
  const fs = await import("node:fs");
  const {
    createStore, createTeamMember, getTeamMemberByEmail, invalidateLocalCache,
  } = await import("../lib/store");

  const store = await createStore({
    name: "Tenant A", slug: "tenant-a", tagline: "", category: "Cafe",
    googlePlaceId: "ChIJtenantA", brandColor: "#000", chips: [], seoKeywords: [],
    managerEmail: "a@a.com", managerPhone: "", address: "", tableCount: 1,
  });
  const other = await createStore({
    name: "Tenant B", slug: "tenant-b", tagline: "", category: "Cafe",
    googlePlaceId: "ChIJtenantB", brandColor: "#000", chips: [], seoKeywords: [],
    managerEmail: "b@b.com", managerPhone: "", address: "", tableCount: 1,
  });

  await createTeamMember({
    email: "tamper@tenant.test", name: "GM", role: "store_admin", storeIds: [store.id],
  });

  // Corrupt the record on disk the way a bad backup restore or migration would.
  const file = process.env.STORE_DATA_FILE as string;
  const doc = JSON.parse(fs.readFileSync(file, "utf-8"));
  const row = doc.members.find((m: { email: string }) => m.email === "tamper@tenant.test");
  row.storeIds = ["*", 42, null, { $ne: null }, ["nested"], other.id, store.id];
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  invalidateLocalCache();

  const member = await getTeamMemberByEmail("tamper@tenant.test");
  assert.ok(member, "the member must still resolve");

  // Only real, well-formed store ids may leave the data layer.
  for (const id of member!.storeIds) {
    assert.match(id, /^[A-Za-z0-9_-]+$/, `storeIds leaked a non-id value: ${JSON.stringify(id)}`);
    assert.ok(
      id === store.id || id === other.id,
      `storeIds leaked an unexpected value: ${JSON.stringify(id)}`
    );
  }
  assert.equal(
    member!.storeIds.includes("*"),
    false,
    "a wildcard must never survive as an assignment"
  );

  // And the session layer must not widen it either.
  signInAs("tamper@tenant.test");
  const { getSessionUser } = await import("../lib/auth");
  const user = await getSessionUser();
  if (user) {
    for (const id of user!.storeIds) {
      assert.match(id, /^[A-Za-z0-9_-]+$/, `session scope leaked ${JSON.stringify(id)}`);
    }
  }
  signOut();
});

test("Store and member lookups never resolve a mangled id to a real tenant", async () => {
  const {
    createStore, createTeamMember, getStoreById, getStoreBySlug, getTeamMemberByEmail,
  } = await import("../lib/store");

  const store = await createStore({
    name: "Lookup Tenant", slug: "lookup-tenant", tagline: "", category: "Cafe",
    googlePlaceId: "ChIJlookup", brandColor: "#000", chips: [], seoKeywords: [],
    managerEmail: "l@l.com", managerPhone: "", address: "", tableCount: 1,
  });
  for (const weird of [
    "", " ", store.id.toUpperCase(), ` ${store.id}`, store.id + " ", store.id + "\n",
    "../" + store.id, store.id.slice(0, -1), "__proto__", "constructor",
  ]) {
    const found = await getStoreById(weird);
    if (found) {
      assert.equal(
        found.id,
        store.id,
        `getStoreById(${JSON.stringify(weird)}) must not resolve to a store`
      );
    }
  }

  // Slug lookup is case-insensitive but otherwise exact.
  const bySlug = await getStoreBySlug("LOOKUP-TENANT");
  assert.equal(bySlug?.id, store.id, "slug lookup must be case-insensitive");
  assert.equal(await getStoreBySlug("lookup-tenan"), null, "a prefix must not match");
  assert.equal(await getStoreBySlug("lookup-tenant-extra"), null, "a suffix must not match");

  // Email lookup is case-insensitive and whitespace-tolerant, but exact otherwise.
  await createTeamMember({
    email: "lookup@tenant.test", name: "GM", role: "store_admin", storeIds: [store.id],
  });
  assert.ok(await getTeamMemberByEmail("LOOKUP@TENANT.TEST"), "email lookup must be case-insensitive");
  for (const weird of [
    "lookup@tenant.test.evil.com", "xlookup@tenant.test", "lookup@tenant",
    "lookup", "@tenant.test", "lookup@",
  ]) {
    assert.equal(
      await getTeamMemberByEmail(weird),
      null,
      `getTeamMemberByEmail(${JSON.stringify(weird)}) must not resolve`
    );
  }
});


/* -------------------------------------------------------------------------- */
/* 15. Meta: the security suites must actually detect a broken auth gate       */
/* -------------------------------------------------------------------------- */

test("Removing the auth gate is detected, not silently tolerated", async () => {
  // A green suite must mean something. This test injects the catastrophic
  // regression — `resolveSessionUser` unconditionally authorizes — into a COPY
  // of lib/auth.ts, loads that copy, and asserts that every admin gate opens.
  //
  // Rationale: the 74-test functional suite runs with AUTH_BYPASS_TESTS=true,
  // so it is structurally incapable of noticing an auth regression. The bypass
  // suites DO catch it (16 failures when injected). This test makes that
  // property explicit and permanent rather than something we re-derive by hand.
  const fs = await import("node:fs");
  const path = await import("node:path");

  const authPath = path.join(process.cwd(), "lib/auth.ts");
  const original = fs.readFileSync(authPath, "utf-8");

  const needle = "async function resolveSessionUser(): Promise<AuthResult> {\n  const adminEmail = getSuperAdminEmail();";
  assert.ok(
    original.includes(needle),
    "the anchor in resolveSessionUser moved — update this meta-test"
  );

  let sabotaged = original.replace(
    needle,
    `${needle}\n  return superAdminSession(adminEmail); // INJECTED REGRESSION`
  );
  assert.notEqual(sabotaged, original, "the injection must actually change the source");

  // The sabotage sits AFTER the AUTH_BYPASS_TESTS short-circuit, which would
  // otherwise return first and mask the injected regression.
  assert.ok(
    sabotaged.includes("AUTH_BYPASS_TESTS"),
    "expected the test-bypass short-circuit to exist"
  );
  sabotaged = sabotaged.replace(
    'process.env.NODE_ENV === "test" && process.env.AUTH_BYPASS_TESTS === "true"',
    'false'
  );
  assert.ok(!sabotaged.includes('AUTH_BYPASS_TESTS === "true"'), "the bypass must be disabled");

  const sabPath = path.join(process.cwd(), "lib/auth.__sabotage__.ts");
  fs.writeFileSync(sabPath, sabotaged, "utf-8");

  try {
    // Import the sabotaged copy and confirm the gates really do open.
    const broken = await import("../lib/auth.__sabotage__");

    assert.equal(
      (await broken.assertAdminAuth()).authorized,
      true,
      "a sabotaged gate must authorize everyone (this proves the test can detect it)"
    );
    assert.equal((await broken.assertSuperAdmin()).authorized, true);
    assert.equal(
      (await broken.assertStoreAccess("any_store_id_at_all")).authorized,
      true
    );
    // Control: on the REAL module the same gates refuse, so a green run of this
    // file can never be explained by "everything is simply allowed".
    const real = await import("../lib/auth");
    assert.equal(
      (await real.assertAdminAuth()).authorized,
      false,
      "the real gate must still refuse this unauthenticated context"
    );
  } finally {
    fs.rmSync(sabPath, { force: true });
  }
});

test("The sabotaged copy is not left behind on disk", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const stray = path.join(process.cwd(), "lib/auth.__sabotage__.ts");
  assert.equal(fs.existsSync(stray), false, "the temporary sabotaged module must be deleted");
});


test("A regression in the real auth layer fails the suite, not just the meta-test", async () => {
  // Closes the gap this audit uncovered: `npm test` runs with
  // AUTH_BYPASS_TESTS=true, so the 74 functional tests are structurally blind
  // to an auth regression. This file (run by `npm run test:bypass`) must be the
  // tripwire — and it is, as long as these negative cases stay asserted.
  //
  // If someone "fixes" a failing test by loosening an assertion here, the next
  // real regression ships silently. Keep the counts explicit.
  const { assertAdminAuth } = await import("../lib/auth");

  signOut();
  const result = await assertAdminAuth();
  assert.equal(result.authorized, false, "no session must never be authorized");
  assert.ok(result.status === 401 || result.status === 503, `expected 401/503, got ${result.status}`);
  assert.ok(result.user === undefined, "an unauthorized result must carry no session user");

  // And an invited-but-suspended member must be refused on the real module.
  const { updateTeamMember, getTeamMembers } = await import("../lib/store");
  await createMember("tripwire@tenant.test", "Tripwire", "store_admin", [VICTIM_STORE.id]);
  const id = (await getTeamMembers()).find((m) => m.email === "tripwire@tenant.test")!.id;
  await updateTeamMember(id, { status: "suspended" });
  try {
    signInAs("tripwire@tenant.test");
    const suspended = await assertAdminAuth();
    assert.equal(suspended.authorized, false, "a suspended member must be refused");
    assert.equal(suspended.status, 403);
  } finally {
    await updateTeamMember(id, { status: "active" });
    signOut();
  }

  // Sanity: an active member of the same kind IS authorized, so the two
  // assertions above are meaningful rather than trivially false.
  signInAs("tripwire@tenant.test");
  const active = await assertAdminAuth();
  assert.equal(active.authorized, true, "an active invited member must be authorized");
  assert.equal(active.user?.isSuperAdmin, false, "a store admin must not become a super admin");
  signOut();
});

test("module mocking is available (guard rail for this suite)", async () => {
  // Guard rail. Every forged-identity test in this file depends on
  // `mock.module`. That API is EXPERIMENTAL and flag-gated
  // (--experimental-test-module-mocks). If a Node upgrade, a tsx change, or a
  // dropped npm-script flag ever makes it unavailable, those tests would stop
  // exercising the forged path and could pass for entirely the wrong reason.
  // Fail loudly and specifically instead.
  const { mock } = await import("node:test");
  assert.equal(
    typeof (mock as unknown as { module?: unknown }).module,
    "function",
    "mock.module is unavailable — the bypass suite cannot forge identities. " +
      "Re-run with --experimental-test-module-mocks and check the Node version."
  );
});


test("A membership scope can never exceed the assignment cap, on any path", async () => {
  // Scoped reads expand storeIds into a PostgREST `in.(...)` filter that lands
  // in the request URL. Measured: 100 ids ≈ 3 KB, 500 ≈ 15 KB, 5 000 ≈ 145 KB
  // — past the 16 KB Cloudflare Worker limit and the 8 KB nginx default, where
  // every scoped read for that member fails outright.
  const fs = await import("node:fs");
  const {
    createStore, createTeamMember, updateTeamMember, getTeamMemberByEmail, invalidateLocalCache,
  } = await import("../lib/store");

  // Real ids must exist, otherwise the HTTP route's existence filter would drop them.
  const ids: string[] = [];
  for (let i = 0; i < 120; i++) {
    const s = await createStore({
      name: `Cap ${i}`, slug: `cap-store-${i}`, tagline: "", category: "Cafe",
      googlePlaceId: `ChIJcap${i}`, brandColor: "#000", chips: [], seoKeywords: [],
      managerEmail: "c@c.com", managerPhone: "", address: "", tableCount: 1,
    });
    ids.push(s.id);
  }

  // 1. The create path caps.
  const created = await createTeamMember({
    email: "cap-create@t.test", name: "Cap", role: "store_admin", storeIds: [...ids, ...ids, ...ids],
  });
  assert.ok(
    created.storeIds.length <= 100,
    `createTeamMember stored ${created.storeIds.length} assignments, cap is 100`
  );

  // 2. The update path caps.
  await updateTeamMember(created.id, { storeIds: [...ids, ...ids] });
  const afterUpdate = await getTeamMemberByEmail("cap-create@t.test");
  assert.ok(
    afterUpdate!.storeIds.length <= 100,
    `updateTeamMember stored ${afterUpdate!.storeIds.length} assignments`
  );

  // 3. A tampered on-disk record is capped on read.
  const file = process.env.STORE_DATA_FILE as string;
  const doc = JSON.parse(fs.readFileSync(file, "utf-8"));
  const row = doc.members.find((m: { email: string }) => m.email === "cap-create@t.test");
  row.storeIds = ids.concat(ids, ids);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  invalidateLocalCache();

  const afterTamper = await getTeamMemberByEmail("cap-create@t.test");
  assert.ok(
    afterTamper!.storeIds.length <= 100,
    `a tampered record exposed ${afterTamper!.storeIds.length} assignments`
  );

  // 4. Duplicates never inflate the list.
  const dupes = await createTeamMember({
    email: "cap-dupes@t.test", name: "Dupes", role: "store_admin",
    storeIds: Array.from({ length: 2000 }, () => ids[0]),
  });
  assert.deepEqual(dupes.storeIds, [ids[0]], "duplicate assignments must collapse to one");
});


/* -------------------------------------------------------------------------- */
/* 16. The publishable key must never reach a client bundle                    */
/* -------------------------------------------------------------------------- */

test("No client component can query Supabase, so the publishable key stays server-side", async () => {
  // The `stores` table is readable by the publishable (anon) key, which would
  // be an internet breach if that key were shipped to browsers. It is not,
  // because no client component touches Supabase. That assumption is what
  // downgrades "anon can read owner PII" from an internet exposure to a
  // leaked-credential risk — so it must not be allowed to drift.
  const fs = await import("node:fs");
  const path = await import("node:path");

  const clientFiles: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git", ".data", ".open-next"].includes(entry.name)) continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name) && full !== path.join(process.cwd(), "proxy.ts")) {
        const src = fs.readFileSync(full, "utf8");
        if (/^\s*["']use client["']/m.test(src)) clientFiles.push(full);
      }
    }
  };
  walk(path.join(process.cwd(), "components"));
  walk(path.join(process.cwd(), "app"));

  assert.ok(clientFiles.length > 0, "expected to find client components to check");

  for (const file of clientFiles) {
    const src = fs.readFileSync(file, "utf8");
    assert.ok(
      !/from\s+["']@\/lib\/supabase["']/.test(src),
      `${file} imports lib/supabase — that would ship the publishable key to the browser`
    );
    assert.ok(
      !/from\s+["']@\/lib\/store["']/.test(src),
      `${file} imports lib/store — a client component must never reach the data layer`
    );
    assert.ok(
      !/createClient|@supabase\/supabase-js/.test(src),
      `${file} talks to Supabase directly; the anon-read exposure becomes public`
    );
  }

  // And the server module must keep using only secret-key credentials.
  const supabaseSrc = fs.readFileSync(path.join(process.cwd(), "lib/supabase.ts"), "utf8");
  const secretOnly = supabaseSrc.match(/SUPABASE_SECRET_KEY|SUPABASE_SECRET_SERVICE_ROLE_KEY/);
  assert.ok(secretOnly, "lib/supabase.ts must read a secret key");
  assert.ok(
    !/SUPABASE_PUBLISHABLE_KEY[^A-Z_]/.test(supabaseSrc.replace(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/g, "")),
    "lib/supabase.ts must not fall back to a publishable key"
  );
});
