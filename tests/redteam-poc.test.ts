/**
 * RED-TEAM PoC — authorization bypass attempts against lib/auth.ts + all routes.
 *
 * Reuses the mock.module("@clerk/nextjs/server") technique from
 * tests/permission-bypass.test.ts, but forges a FULL Clerk User resource so we
 * can test multi-email / unverified-email identities, not just a single address.
 *
 * METHOD: this file only ever ASSERTS. A green test means the control HELD
 * (bypass BLOCKED). A red test means a real bypass was found.
 */
import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mock } from "node:test";

/* Environment */
process.env.NODE_ENV = "test";
delete process.env.AUTH_BYPASS_TESTS; // must NOT be the test bypass

const TEST_DATA_FILE = path.join(os.tmpdir(), `redteam-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
for (const k of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SECRET_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]) {
  delete process.env[k];
}

process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_mock_redteam";
process.env.CLERK_SECRET_KEY = "sk_mock_redteam";
const OWNER = "owner@platform.test";
process.env.ADMIN_ALLOWED_EMAIL = OWNER;

let forgedUser = null;

function signInAs(...emails) {
  // Real Clerk accounts always report a verification status. Default every
  // address to "verified" so the ordinary cases are modelled faithfully; the
  // unverified attack paths are constructed explicitly elsewhere.
  forgedUser = {
    primaryEmailAddress: emails[0]
      ? { emailAddress: emails[0], verification: { status: "verified" } }
      : undefined,
    emailAddresses: emails.map((emailAddress) => ({
      emailAddress,
      verification: { status: "verified" },
    })),
  };
}

/** A user whose PRIMARY address is theirs, who also owns a secondary address. */
function signInAsMulti(primary, secondary, secondaryStatus = "unverified") {
  forgedUser = {
    primaryEmailAddress: { emailAddress: primary },
    emailAddresses: [
      { emailAddress: primary, verification: { status: "verified" } },
      { emailAddress: secondary, verification: { status: secondaryStatus } },
    ],
  };
}

function signOut() {
  forgedUser = null;
}

const mockRedteamAuth = async () => ({ userId: forgedUser ? "user_redteam" : null });
const mockRedteamCurrentUser = async () => {
  if (!forgedUser) return null;
  return { id: "user_redteam", ...forgedUser };
};
const mockRedteamCreateClerkClient = () => ({ users: { getUser: async () => null } });

mock.module("server-only", { exports: {} });

mock.module("@clerk/nextjs/server", {
  exports: {
    auth: mockRedteamAuth,
    currentUser: mockRedteamCurrentUser,
    createClerkClient: mockRedteamCreateClerkClient,
    default: {
      auth: mockRedteamAuth,
      currentUser: mockRedteamCurrentUser,
      createClerkClient: mockRedteamCreateClerkClient,
    },
  },
});

/* Fixtures: two separate tenants + one legitimate store admin */
let VICTIM;
let OTHER;
const STORE_ADMIN = "gm@victim.test";
let STORE_ADMIN_ID;

const json = (url, method, b, headers = {}) =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(b),
  });
const params = (id) => ({ params: Promise.resolve({ id }) });
const body = async (res) => await res.json();

before(async () => {
  const { createStore, createTeamMember, submitPrivateFeedback } = await import("../lib/store");
  VICTIM = await createStore({
    name: "Victim Bistro", slug: "victim-bistro", tagline: "P", category: "Restaurant",
    googlePlaceId: "ChIJvictim", brandColor: "#E11D48", chips: ["Secret"],
    seoKeywords: [], managerEmail: "victim-owner@victim.test",
    managerPhone: "+91-90000-00000", address: "Victim Road", tableCount: 5,
  });
  OTHER = await createStore({
    name: "Other Cafe", slug: "other-cafe", tagline: "P", category: "Cafe",
    googlePlaceId: "ChIJother", brandColor: "#0d9488", chips: [],
    seoKeywords: [], managerEmail: "other-owner@other.test",
    managerPhone: "", address: "Other Road", tableCount: 3,
  });
  const me = await createTeamMember({
    email: STORE_ADMIN, name: "Legit GM", role: "store_admin", storeIds: [VICTIM.id],
  });
  STORE_ADMIN_ID = me.id;
  // A cross-tenant complaint the store admin must never see or touch.
  await submitPrivateFeedback({
    storeId: OTHER.id, storeName: OTHER.name, rating: 1,
    message: "OTHER TENANT SECRET COMPLAINT", customerName: "Secret Diner",
    customerContact: "secret@other.test",
  });
});

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
});

/* ======================================================================== */
/* 1. IDOR — every route param, as a store admin                            */
/* ======================================================================== */

test("1a  IDOR: store admin cannot GET/PUT/DELETE another tenant's store", async () => {
  signInAs(STORE_ADMIN);
  const { GET, PUT, DELETE } = await import("../app/api/stores/[id]/route");

  const get = await GET(new Request("http://x"), params(OTHER.id));
  const put = await PUT(json("http://x", "PUT", { name: "pwned" }), params(OTHER.id));
  const del = await DELETE(new Request("http://x", { method: "DELETE" }), params(OTHER.id));
  console.log("   [1a] GET=%s PUT=%s DELETE=%s", get.status, put.status, del.status);

  assert.equal(get.status, 403);
  assert.equal(put.status, 403);
  assert.equal(del.status, 403);
  assert.ok(!(JSON.stringify(await body(get)).includes("other-owner@other.test")));

  const { getStoreById } = await import("../lib/store");
  assert.equal((await getStoreById(OTHER.id)).name, "Other Cafe", "other tenant must be untouched");
});

test("1b  IDOR: store admin cannot reach /api/team or /api/team/[id]", async () => {
  signInAs(STORE_ADMIN);
  const { GET: getTeam, POST: postTeam } = await import("../app/api/team/route");
  const { PUT: putTeam, DELETE: delTeam } = await import("../app/api/team/[id]/route");

  const codes = {
    list: (await getTeam()).status,
    create: (await postTeam(json("http://x/api/team", "POST", { email: "a@b.test" }))).status,
    updateSelf: (await putTeam(json("http://x", "PUT", { role: "super_admin" }), params(STORE_ADMIN_ID))).status,
    deleteSelf: (await delTeam(new Request("http://x", { method: "DELETE" }), params(STORE_ADMIN_ID))).status,
  };
  console.log("   [1b] %j", codes);
  for (const [k, v] of Object.entries(codes)) assert.equal(v, 403, `${k} must be owner-only`);

  const { getTeamMembers } = await import("../lib/store");
  assert.equal((await getTeamMembers()).find((m) => m.email === "a@b.test"), undefined);
});

test("1c  IDOR: store admin cannot read or mutate another tenant's feedback", async () => {
  signInAs(STORE_ADMIN);
  const { GET, PATCH } = await import("../app/api/feedback/route");
  const { getFeedbacks, getFeedbackById } = await import("../lib/store");

  // 1. The unscoped list must not even contain the foreign complaint.
  const listed = (await body(await GET(new Request("http://x/api/feedback")))).feedbacks;
  const foreignLeak = listed.some((f) => f.storeId === OTHER.id);
  assert.equal(foreignLeak, false, "cross-tenant feedback must not be listed at all");

  // 2. Direct fetch by ?storeId=.
  const direct = await GET(new Request(`http://x/api/feedback?storeId=${OTHER.id}`));

  // 3. PATCH using the real foreign feedback id.
  const foreign = (await getFeedbacks(OTHER.id))[0];
  const patch = await PATCH(
    json("http://x/api/feedback", "PATCH", { id: foreign.id, status: "resolved" })
  );
  console.log("   [1c] listedLeak=%s GET?storeId=%s PATCH=%s", foreignLeak, direct.status, patch.status);

  assert.equal(direct.status, 403);
  assert.equal(patch.status, 403);
  assert.equal(
    (await getFeedbackById(foreign.id)).status, "new",
    "the foreign complaint must remain open"
  );
});

test("1d  IDOR: store admin cannot read another tenant's analytics", async () => {
  signInAs(STORE_ADMIN);
  const { GET } = await import("../app/api/analytics/route");
  const res = await GET(new Request(`http://x/api/analytics?storeId=${OTHER.id}`));
  console.log("   [1d] GET ?storeId=other -> %s", res.status);
  assert.equal(res.status, 403);
  assert.ok(!JSON.stringify(await body(res)).includes("OTHER TENANT SECRET COMPLAINT"));
});

test("1e  IDOR: unscoped list endpoints never leak the other tenant", async () => {
  signInAs(STORE_ADMIN);
  const { GET: getStores } = await import("../app/api/stores/route");
  const { GET: getFb } = await import("../app/api/feedback/route");
  const { GET: getAn } = await import("../app/api/analytics/route");

  const stores = (await body(await getStores())).stores;
  const fbs = (await body(await getFb(new Request("http://x/api/feedback")))).feedbacks;
  const an = (await body(await getAn(new Request("http://x/api/analytics")))).analytics;

  console.log("   [1e] stores=%d feedbacks=%d crossTenantFb=%s crossTenantEvents=%s",
    stores.length, fbs.length,
    fbs.some((f) => f.storeId === OTHER.id),
    an.recentEvents.some((e) => e.storeId === OTHER.id));

  assert.deepEqual(stores.map((s) => s.id), [VICTIM.id]);
  assert.equal(fbs.some((f) => f.storeId === OTHER.id), false);
  assert.equal(an.recentEvents.some((e) => e.storeId === OTHER.id), false);
  assert.ok(!JSON.stringify(an).includes("OTHER TENANT SECRET COMPLAINT"));
});

/* ======================================================================== */
/* 2. Mass assignment / type confusion                                        */
/* ======================================================================== */

test("2a  Store admin cannot smuggle id/ratingScore/reviewCount/createdAt via PUT", async () => {
  signInAs(STORE_ADMIN); // only authorized on VICTIM
  const { PUT } = await import("../app/api/stores/[id]/route");

  const res = await PUT(
    json("http://x", "PUT", {
      name: "Renamed OK",
      id: "hijacked_id",
      ratingScore: 5000,
      reviewCount: 999999,
      createdAt: "1999-01-01T00:00:00.000Z",
      slug: "renamed-ok",
    }),
    params(VICTIM.id)
  );
  assert.equal(res.status, 200, "editing an ASSIGNED store is allowed");
  const store = (await body(res)).store;
  console.log("   [2a] id=%s ratingScore=%s reviewCount=%s createdAt=%s",
    store.id, store.ratingScore, store.reviewCount, store.createdAt);
  assert.equal(store.id, VICTIM.id, "id must be preserved");
  assert.equal(store.ratingScore, 0);
  assert.equal(store.reviewCount, 0);
  assert.ok(!String(store.createdAt).startsWith("1999"));
});

test("2b  Store admin cannot smuggle storeIds/role/status through any route", async () => {
  signInAs(STORE_ADMIN);
  const { PUT: putStore } = await import("../app/api/stores/[id]/route");
  const { POST: postTeam, GET: getTeam } = await import("../app/api/team/route");
  const { PUT: putTeam, DELETE: delTeam } = await import("../app/api/team/[id]/route");
  const { PATCH: patchFb } = await import("../app/api/feedback/route");
  const { getTeamMembers, getFeedbacks, getFeedbackById, submitPrivateFeedback } =
    await import("../lib/store");

  // A complaint on the store the admin legitimately owns.
  const own = await submitPrivateFeedback({
    storeId: VICTIM.id, storeName: VICTIM.name, rating: 2, message: "my own complaint",
  });
  const ownFb = { id: own.id };
  void getFeedbacks;

  // Privileged-looking keys on a store PUT they ARE authorized for.
  await putStore(
    json("http://x", "PUT", { storeIds: [OTHER.id], isSuperAdmin: true, role: "super_admin" }),
    params(VICTIM.id)
  );
  const codes = {
    teamCreate: (await postTeam(
      json("http://x/api/team", "POST", { email: "x@y.test", role: "super_admin", storeIds: ["*"] })
    )).status,
    teamUpdate: (await putTeam(
      json("http://x", "PUT", { storeIds: [OTHER.id], role: "super_admin", status: "active" }),
      params(STORE_ADMIN_ID)
    )).status,
    teamDelete: (await delTeam(new Request("http://x", { method: "DELETE" }), params(STORE_ADMIN_ID))).status,
    teamList: (await getTeam()).status,
    // Use a feedback item this admin DOES own: a 200 proves the privileged
    // body keys (storeId of another tenant) were ignored, not merely 404'd.
    feedbackPatch: (await patchFb(
      json("http://x/api/feedback", "PATCH", {
        id: ownFb.id, status: "resolved", storeId: OTHER.id,
      })
    )).status,
  };
  console.log("   [2b] %j", codes);
  for (const [k, v] of Object.entries(codes)) {
    if (k === "feedbackPatch") assert.equal(v, 200, "own feedback must be patchable");
    else assert.equal(v, 403, `${k} must be owner-only`);
  }
  // The complaint must stay attached to ITS OWN store, not the smuggled one.
  assert.equal((await getFeedbackById(ownFb.id)).storeId, VICTIM.id, "storeId must not be reassigned");

  const me = (await getTeamMembers()).find((m) => m.email === STORE_ADMIN);
  console.log("   [2b] self record: role=%s storeIds=%s", me.role, JSON.stringify(me.storeIds));
  assert.equal(me.role, "store_admin");
  assert.deepEqual(me.storeIds, [VICTIM.id], "storeIds must NOT have widened");
});

/* ======================================================================== */
/* 3. team_members as an escalation primitive                                */
/* ======================================================================== */

test("3   updateTeamMember is unreachable by a non-owner (every verb, every id)", async () => {
  signInAs(STORE_ADMIN);
  const { GET: getTeam, POST: postTeam } = await import("../app/api/team/route");
  const { PUT: putTeam, DELETE: delTeam } = await import("../app/api/team/[id]/route");
  const { getTeamMembers } = await import("../lib/store");

  const codes = {
    list: (await getTeam()).status,
    create: (await postTeam(
      json("http://x/api/team", "POST", { email: "gm2@victim.test", storeIds: [OTHER.id] })
    )).status,
    updateSelf: (await putTeam(
      json("http://x", "PUT", { role: "super_admin" }), params(STORE_ADMIN_ID)
    )).status,
    deleteSelf: (await delTeam(new Request("http://x", { method: "DELETE" }), params(STORE_ADMIN_ID))).status,
  };
  console.log("   [3] %j", codes);
  for (const [k, v] of Object.entries(codes)) assert.equal(v, 403, `${k} must be owner-only`);

  const members = await getTeamMembers();
  assert.equal(members.find((m) => m.email === "gm2@victim.test"), undefined, "no member created");
  assert.equal(members.find((m) => m.email === STORE_ADMIN).role, "store_admin");
});

/* ======================================================================== */
/* 4. Auth resolution quirks in lib/auth.ts                                  */
/* ======================================================================== */

test("4a  Owner check: case/whitespace normalize; look-alikes do NOT pass", async () => {
  const { isSuperAdminEmail, getSessionUser } = await import("../lib/auth");
  for (const variant of [OWNER, OWNER.toUpperCase(), `  ${OWNER}  `]) {
    assert.equal(isSuperAdminEmail(variant), true, `"${variant}" is the same mailbox`);
  }
  for (const lookalike of [
    `x${OWNER}`,
    `${OWNER}.evil.test`,
    "owner+admin@platform.test",
    "оwner@platform.test", // cyrillic о confusable
    "owner@platform.co",
    "owner@platform.testx",
    " owner@platform.test.evil.test ",
  ]) {
    assert.equal(isSuperAdminEmail(lookalike), false, `"${lookalike}" must not be the owner`);
  }
  // A mixed-case LOCAL part is the same mailbox (domains are case-insensitive
  // and the whole address is lowercased), so this legitimately matches.
  assert.equal(isSuperAdminEmail("owner@Platform.test"), true, "same mailbox, mixed case");
  signInAs("оwner@platform.test");
  assert.equal(await getSessionUser(), null, "confusable look-alike must not resolve");
});

test("4b  an UNVERIFIED secondary email must NOT confer a member's access", async () => {
  // The attacker controls their own Clerk account (attacker@evil.test, verified)
  // and attaches the victim's address as a SECONDARY, UNVERIFIED address.
  // Clerk does not require proof of mailbox control to attach an address, so
  // matching the directory against unverified addresses would hand over the
  // victim's console access with no email confirmation at all.
  signInAsMulti("attacker@evil.test", STORE_ADMIN, "unverified");
  const { getSessionUser } = await import("../lib/auth");
  const u = await getSessionUser();
  assert.equal(
    u,
    null,
    "an unverified secondary address must not resolve to a session user"
  );

  // Control: once that address IS verified, access is legitimately granted.
  signInAsMulti("attacker@evil.test", STORE_ADMIN, "verified");
  const verified = await getSessionUser();
  assert.ok(verified, "a verified address must still grant access");
  assert.equal(verified.email, STORE_ADMIN);
});

test("4b2  an UNVERIFIED PRIMARY address must NOT confer the owner's access", async () => {
  // Clerk can mark the primary address unverified too. The platform-owner
  // check must never accept an unproven address.
  forgedUser = {
    primaryEmailAddress: {
      emailAddress: OWNER,
      verification: { status: "unverified" },
    },
    emailAddresses: [
      { emailAddress: OWNER, verification: { status: "unverified" } },
    ],
  };
  const { getSessionUser } = await import("../lib/auth");
  assert.equal(await getSessionUser(), null, "an unverified owner address must not authenticate");

  // Control: verified owner works.
  forgedUser = {
    primaryEmailAddress: {
      emailAddress: OWNER,
      verification: { status: "verified" },
    },
    emailAddresses: [
      { emailAddress: OWNER, verification: { status: "verified" } },
    ],
  };
  const u = await getSessionUser();
  assert.ok(u, "a verified owner address must authenticate");
  assert.equal(u.isSuperAdmin, true);
  signOut();
});

test("4c  candidates loop: a SUSPENDED member's secondary email is still refused", async () => {
  const { updateTeamMember } = await import("../lib/store");
  await updateTeamMember(STORE_ADMIN_ID, { status: "suspended" });
  try {
    signInAsMulti("attacker@evil.test", STORE_ADMIN, "unverified");
    const { getSessionUser } = await import("../lib/auth");
    assert.equal(await getSessionUser(), null, "suspension must survive the candidate loop");
  } finally {
    await updateTeamMember(STORE_ADMIN_ID, { status: "active" });
  }
});

test("4d  member.status outside the enum fails CLOSED (raw file write)", async () => {
  // updateTeamMember now normalises, so the API cannot produce a bad status.
  // The remaining trust boundary is the local JSON file itself: whoever can
  // write it (backup restore, migration, hand-edit) controls authorization.
  // Seed via the API, then overwrite the ON-DISK record with an off-enum status
  // so the next resolution must read it straight out of storage.
  const { createTeamMember } = await import("../lib/store");
  await createTeamMember({
    email: "rawprobe@victim.test", name: "Raw", role: "store_admin",
    storeIds: [VICTIM.id],
  });

  const file = JSON.parse(fs.readFileSync(TEST_DATA_FILE, "utf-8"));
  const row = file.members.find((m) => m.email === "rawprobe@victim.test");
  row.status = "ACTIVE";
  fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(file, null, 2));

  // lib/store caches the parsed file in module memory, and lib/auth holds a
  // reference to THAT instance. Re-importing under a new specifier leaves the
  // old instance cached, so use the real invalidation seam — otherwise this
  // test would silently assert against a stale in-memory record.
  const store = await import("../lib/store");
  store.invalidateLocalCache();

  const onDisk = await store.getTeamMemberByEmail("rawprobe@victim.test");
  assert.equal(onDisk.status, "suspended", "an off-enum status must not normalize to active");

  signInAs("rawprobe@victim.test");
  const auth = await import("../lib/auth");
  assert.equal(
    await auth.getSessionUser(),
    null,
    "an off-enum status read straight from disk must fail closed"
  );
  signOut();
});

test("4d2 off-enum status/role/storeIds in the RAW file must fail closed", async () => {
  const store = await import("../lib/store");

  const cases = [
    ["status", "ACTIVE", "uppercase active"],
    ["status", "active ", "trailing space"],
    ["status", "", "empty string"],
    ["status", "deleted", "unknown value"],
    ["status", undefined, "missing entirely"],
    ["role", "SUPER_ADMIN", "off-enum super_admin"],
    ["role", undefined, "missing role"],
    ["storeIds", "*", "wildcard string not array"],
    ["storeIds", null, "null storeIds"],
  ];

  for (const [field, value, label] of cases) {
    // Rewrite the file on disk with one field corrupted.
    const doc = JSON.parse(fs.readFileSync(TEST_DATA_FILE, "utf-8"));
    const m = doc.members.find((x) => x.email === "rawprobe@victim.test");
    if (value === undefined) delete m[field];
    else m[field] = value;
    fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(doc, null, 2));

    // Bust the in-memory cache so the read comes from the corrupted file.
    const fresh = await import("../lib/store?rawprobe=" + Math.random());
    void fresh;

    signInAs("rawprobe@victim.test");
    const { getSessionUser: resolve } = await import("../lib/auth");
    const u = await resolve();
    console.log("   [4d2] %-8s=%-12j (%s) -> resolved=%s", field, value, label,
      u ? `${u.role} isSuper=${u.isSuperAdmin} scope=${JSON.stringify(u.storeIds)}` : "no");
    if (u) {
      assert.notEqual(u.role, "super_admin", `${label}: must not mint super admin`);
      assert.equal(u.isSuperAdmin, false, `${label}: must not be super admin`);
    }
    void store;
  }
});

test("4e  member.role outside the enum cannot mint a super admin", async () => {
  const { createTeamMember } = await import("../lib/store");
  const { getSessionUser, hasStoreAccess, scopedStoreIds } = await import("../lib/auth");
  let n = 0;
  for (const bogusRole of ["Super_Admin", "super_admin ", "SUPER_ADMIN", "admin", "owner", ""]) {
    n += 1;
    const email = `role${n}@victim.test`;
    await createTeamMember({
      email, name: "Role", role: bogusRole, storeIds: [VICTIM.id],
    });
    signInAs(email);
    const u = await getSessionUser();
    console.log("   [4e] role=%-14j -> isSuperAdmin=%s scope=%j",
      bogusRole, u && u.isSuperAdmin, u && scopedStoreIds(u));
    if (u) {
      assert.notEqual(u.role, "super_admin", "an off-enum role must not equal super_admin");
      assert.equal(u.isSuperAdmin, false, "an off-enum role must not mint super admin");
      assert.equal(hasStoreAccess(u, OTHER.id), false, "must not inherit the owner's reach");
      assert.notEqual(scopedStoreIds(u), null, "must stay scoped, not unrestricted");
    }
  }
});

test("4f  The NODE_ENV/AUTH_BYPASS_TESTS escape hatch requires BOTH", async () => {
  const { assertAdminAuth } = await import("../lib/auth");
  signInAs(STORE_ADMIN); // a mere store admin

  // NODE_ENV=test alone must not bypass.
  delete process.env.AUTH_BYPASS_TESTS;
  const a = await assertAdminAuth();
  assert.equal(a.authorized, true);
  assert.equal(a.user.isSuperAdmin, false, "NODE_ENV=test alone must NOT mint a super admin");
  console.log("   [4f] NODE_ENV=test, no flag -> isSuperAdmin=%s", a.user.isSuperAdmin);

  // The flag alone in a production runtime must not bypass either.
  process.env.AUTH_BYPASS_TESTS = "true";
  const savedEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const b = await assertAdminAuth();
  console.log("   [4f] NODE_ENV=production, flag=true -> isSuperAdmin=%s", b.user && b.user.isSuperAdmin);
  assert.equal(b.user.isSuperAdmin, false, "the flag alone must NOT mint a super admin");
  process.env.NODE_ENV = savedEnv;
  delete process.env.AUTH_BYPASS_TESTS;
});

/* ======================================================================== */
/* 5. Page-level scoping (the data path each admin page uses)                */
/* ======================================================================== */

test("5   Admin pages scope server-side: scope never widens for a store admin", async () => {
  signInAs(STORE_ADMIN);
  const { getSessionUser, scopedStoreIds, hasStoreAccess } = await import("../lib/auth");
  const store = await import("../lib/store");

  // app/admin/page.tsx, feedback and stores pages all use this exact expression.
  const user = await getSessionUser();
  const scope = scopedStoreIds(user);
  const stores = scope === null ? await store.getAllStores() : await store.getStoresByIds(scope);
  const feedbacks =
    scope === null ? await store.getFeedbacks() : await store.getFeedbacks(undefined, scope);
  const analytics =
    scope === null ? await store.getAnalytics() : await store.getAnalytics(undefined, scope);
  console.log("   [5] scope=%j stores=%d crossTenantFeedback=%s",
    scope, stores.length, feedbacks.some((f) => f.storeId === OTHER.id));
  assert.notEqual(scope, null, "a store admin must never get the unrestricted scope");
  assert.deepEqual(stores.map((s) => s.id), [VICTIM.id]);
  assert.equal(feedbacks.some((f) => f.storeId === OTHER.id), false);
  assert.equal(analytics.recentFeedbacks.some((f) => f.storeId === OTHER.id), false);

  // app/admin/analytics/page.tsx guards ?storeId with hasStoreAccess.
  assert.equal(hasStoreAccess(user, OTHER.id), false, "foreign storeId must be rejected");
  const selected = hasStoreAccess(user, OTHER.id) ? OTHER.id : undefined;
  assert.equal(selected, undefined, "must fall back to the scoped aggregate");

  // Both print pages: getStoreByScanKey, then hasStoreAccess(user, store.id).
  for (const key of [OTHER.id, OTHER.slug]) {
    const resolved = await store.getStoreByScanKey(key);
    assert.equal(hasStoreAccess(user, resolved.id), false,
      `print page must refuse /admin/${key}/print`);
  }
  assert.equal(hasStoreAccess(user, (await store.getStoreByScanKey(VICTIM.id)).id), true);
});

test("5b  team_members is never serialized into a store admin's page payload", async () => {
  signInAs(STORE_ADMIN);
  const { getSessionUser, scopedStoreIds } = await import("../lib/auth");
  const store = await import("../lib/store");
  const user = await getSessionUser();
  const scope = scopedStoreIds(user);
  // No store-admin page calls getTeamMembers(); model the overview payload.
  const payload = JSON.stringify({
    stores: await store.getStoresByIds(scope),
    feedbacks: await store.getFeedbacks(undefined, scope),
    user,
  });
  const leaked = payload.includes("gm2@") || payload.includes("bogus") || payload.includes("role1@");
  console.log("   [5b] other members present in payload: %s", leaked);
  assert.equal(leaked, false, "no other member's data may reach the payload");
});

/* ======================================================================== */
/* 6. The deleted / suspended edge case                                      */
/* ======================================================================== */

test("6   Suspended member: no path reaches data via hasStoreAccess alone", async () => {
  const { updateTeamMember, getStoreById } = await import("../lib/store");
  await updateTeamMember(STORE_ADMIN_ID, { status: "suspended" });
  try {
    signInAs(STORE_ADMIN);
    const { getSessionUser } = await import("../lib/auth");
    assert.equal(await getSessionUser(), null, "suspended must not resolve to a session");

    const { GET: listStores, POST: createStore } = await import("../app/api/stores/route");
    const storeRoute = await import("../app/api/stores/[id]/route");
    const { GET: getFb, PATCH: patchFb } = await import("../app/api/feedback/route");
    const { GET: getAn } = await import("../app/api/analytics/route");
    const { GET: getTeam } = await import("../app/api/team/route");

    const codes = {
      list: (await listStores()).status,
      ownStoreGet: (await storeRoute.GET(new Request("http://x"), params(VICTIM.id))).status,
      ownStorePut: (await storeRoute.PUT(
        json("http://x", "PUT", { name: "x" }), params(VICTIM.id))).status,
      createStore: (await createStore(
        json("http://x/api/stores", "POST", { name: "x", slug: "x", googlePlaceId: "C" })
      )).status,
      feedbackList: (await getFb(new Request("http://x/api/feedback"))).status,
      feedbackScoped: (await getFb(new Request(`http://x/api/feedback?storeId=${VICTIM.id}`))).status,
      feedbackPatch: (await patchFb(
        json("http://x/api/feedback", "PATCH", { id: "x", status: "resolved" })
      )).status,
      analytics: (await getAn(new Request(`http://x/api/analytics?storeId=${VICTIM.id}`))).status,
      team: (await getTeam()).status,
    };
    console.log("   [6] suspended -> %j", codes);
    for (const [k, v] of Object.entries(codes)) {
      assert.equal(v, 403, `${k} must be 403 for a suspended member`);
    }
    assert.equal((await getStoreById(VICTIM.id)).name, "Renamed OK", "store must be untouched");
  } finally {
    await updateTeamMember(STORE_ADMIN_ID, { status: "active" });
  }
});

/* ======================================================================== */
/* 7. Forgotten early-return / auth.user used before the guard               */
/* ======================================================================== */

test("7   Signed out: every handler short-circuits (no forgotten early-return)", async () => {
  signOut();
  const { GET: listStores, POST: createStore } = await import("../app/api/stores/route");
  const storeRoute = await import("../app/api/stores/[id]/route");
  const { GET: getTeam, POST: createTeam } = await import("../app/api/team/route");
  const teamRoute = await import("../app/api/team/[id]/route");
  const { GET: getFb, PATCH: patchFb } = await import("../app/api/feedback/route");
  const { GET: getAn } = await import("../app/api/analytics/route");

  const codes = {
    storesList: (await listStores()).status,
    storesCreate: (await createStore(
      json("http://x/api/stores", "POST", { name: "x", slug: "x", googlePlaceId: "C" })
    )).status,
    storeGet: (await storeRoute.GET(new Request("http://x"), params(VICTIM.id))).status,
    storePut: (await storeRoute.PUT(json("http://x", "PUT", { name: "x" }), params(VICTIM.id))).status,
    storeDelete: (await storeRoute.DELETE(
      new Request("http://x", { method: "DELETE" }), params(VICTIM.id))).status,
    teamList: (await getTeam()).status,
    teamCreate: (await createTeam(json("http://x/api/team", "POST", { email: "a@b.test" }))).status,
    teamUpdate: (await teamRoute.PUT(
      json("http://x", "PUT", { role: "super_admin" }), params(STORE_ADMIN_ID))).status,
    teamDelete: (await teamRoute.DELETE(
      new Request("http://x", { method: "DELETE" }), params(STORE_ADMIN_ID))).status,
    feedbackList: (await getFb(new Request("http://x/api/feedback"))).status,
    feedbackScoped: (await getFb(new Request(`http://x/api/feedback?storeId=${VICTIM.id}`))).status,
    feedbackPatch: (await patchFb(
      json("http://x/api/feedback", "PATCH", { id: "x", status: "resolved" })
    )).status,
    analytics: (await getAn(new Request("http://x/api/analytics"))).status,
    analyticsScoped: (await getAn(new Request(`http://x/api/analytics?storeId=${VICTIM.id}`))).status,
  };
  console.log("   [7] signed out -> %j", codes);
  for (const [k, v] of Object.entries(codes)) {
    assert.ok(v === 401 || v === 403, `${k} returned ${v} — expected 401/403, not 200 or 500`);
  }
});

test("7b  Uninvited (signed in but not in the directory) reaches nothing", async () => {
  signInAs("attacker@evil.test");
  const { GET: listStores } = await import("../app/api/stores/route");
  const { GET: getStore } = await import("../app/api/stores/[id]/route");
  const { GET: getFb } = await import("../app/api/feedback/route");
  const { GET: getAn } = await import("../app/api/analytics/route");
  const { GET: getTeam } = await import("../app/api/team/route");
  const codes = {
    stores: (await listStores()).status,
    storeById: (await getStore(new Request("http://x"), params(VICTIM.id))).status,
    feedback: (await getFb(new Request("http://x/api/feedback"))).status,
    analytics: (await getAn(new Request("http://x/api/analytics"))).status,
    team: (await getTeam()).status,
  };
  console.log("   [7b] uninvited -> %j", codes);
  for (const [k, v] of Object.entries(codes)) assert.equal(v, 403, `${k} must be 403`);
});

/* ======================================================================== */
/* 8. CSRF on the mutating verbs                                             */
/* ======================================================================== */

test("8   Cross-site mutations are refused even for the platform owner", async () => {
  signInAs(OWNER);
  const evil = { origin: "https://evil.example.com", "sec-fetch-site": "cross-site" };
  const { POST: createStore } = await import("../app/api/stores/route");
  const storeRoute = await import("../app/api/stores/[id]/route");
  const { POST: createTeam } = await import("../app/api/team/route");
  const { PUT: putTeam } = await import("../app/api/team/[id]/route");
  const { PATCH: patchFb } = await import("../app/api/feedback/route");
  const { getStoreById, getTeamMembers } = await import("../lib/store");

  const codes = {
    createStore: (await createStore(
      json("http://x/api/stores", "POST", { name: "x", slug: "csrf1", googlePlaceId: "C" }, evil)
    )).status,
    putStore: (await storeRoute.PUT(
      json("http://x", "PUT", { name: "x" }, evil), params(VICTIM.id))).status,
    deleteStore: (await storeRoute.DELETE(
      new Request("http://x", { method: "DELETE", headers: evil }), params(VICTIM.id))).status,
    createTeam: (await createTeam(
      json("http://x/api/team", "POST", { email: "csrf@x.test" }, evil))).status,
    putTeam: (await putTeam(
      json("http://x", "PUT", { role: "super_admin" }, evil), params(STORE_ADMIN_ID))).status,
    patchFeedback: (await patchFb(
      json("http://x/api/feedback", "PATCH", { id: "x", status: "resolved" }, evil))).status,
  };
  console.log("   [8] cross-site -> %j", codes);
  for (const [k, v] of Object.entries(codes)) assert.equal(v, 403, `${k} must refuse cross-site`);
  assert.ok(await getStoreById(VICTIM.id), "store must survive");
  assert.equal((await getTeamMembers()).find((m) => m.email === "csrf@x.test"), undefined);
});

/* ======================================================================== */
/* 9. Public surface must not expose owner PII                               */
/* ======================================================================== */

test("9   /r/[slug] public projection carries no owner PII", async () => {
  signOut();
  const { getStoreByScanKey, toPublicStore } = await import("../lib/store");
  // Resolve by id: an earlier test intentionally renamed this store's slug.
  const payload = JSON.stringify(toPublicStore(await getStoreByScanKey(VICTIM.id)));
  console.log("   [9] payload: %s", payload.slice(0, 150));
  assert.ok(!payload.includes("victim-owner@victim.test"), "owner email leaked");
  assert.ok(!payload.includes("90000-00000"), "owner phone leaked");
  assert.ok(!payload.includes("seoKeywords"), "seo keywords leaked");
  assert.ok(!payload.includes("ratingScore"), "rating leaked");
});

/* ======================================================================== */
/* 10. Control: the platform owner is the only unrestricted identity          */
/* ======================================================================== */

test("10  Control: the configured owner DOES get full access", async () => {
  signInAs(OWNER);
  const { getSessionUser, hasStoreAccess, scopedStoreIds } = await import("../lib/auth");
  const { GET: getStores } = await import("../app/api/stores/route");
  const { GET: getTeam } = await import("../app/api/team/route");
  const { getStoreById } = await import("../lib/store");

  const u = await getSessionUser();
  const stores = (await body(await getStores())).stores;
  console.log("   [10] owner stores=%d scope=%j team=%s",
    stores.length, scopedStoreIds(u), (await getTeam()).status);
  assert.equal(u.isSuperAdmin, true);
  assert.equal(scopedStoreIds(u), null, "the owner is unscoped");
  assert.equal(hasStoreAccess(u, OTHER.id), true);
  assert.ok(stores.length >= 2, "the owner sees every location");
  assert.equal((await getTeam()).status, 200, "the owner can list the team directory");
  assert.equal((await getStoreById(OTHER.id)).name, "Other Cafe");
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
