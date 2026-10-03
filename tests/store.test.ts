import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  getAllStores,
  getStoreBySlug,
  getStoreById,
  getStoreByScanKey,
  getStoresByIds,
  createStore,
  updateStore,
  deleteStore,
  logScanEvent,
  getScanEvents,
  submitPrivateFeedback,
  getFeedbacks,
  getFeedbackById,
  updateFeedbackStatus,
  updateFeedbackAlert,
  getAnalytics,
  buildAnalytics,
  createTeamMember,
  getTeamMemberByEmail,
  updateTeamMember,
  deleteTeamMember,
} from "../lib/store";
import { ScanEvent } from "../lib/types";

// Tests must never touch the production Supabase database or the developer's
// local data file. They run against an isolated temp file.
const TEST_DATA_FILE = path.join(os.tmpdir(), `credo-store-test-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
});

const baseStore = {
  name: "Taco Fiesta",
  slug: "taco-fiesta",
  tagline: "Authentic Street Tacos",
  category: "Mexican Taqueria",
  googlePlaceId: "ChIJtest123",
  brandColor: "#F59E0B",
  chips: ["Birria Tacos", "Horchata", "Homemade Salsa"],
  seoKeywords: ["tacos", "mexican"],
  managerEmail: "taco@example.com",
  managerPhone: "+15551112233",
  address: "1 Test Street",
  tableCount: 12,
};

test("a fresh install starts empty — no dummy locations are seeded", async () => {
  const stores = await getAllStores();
  assert.ok(Array.isArray(stores));
  assert.equal(stores.length, 0);
});

test("createStore, updateStore, and deleteStore flow", async () => {
  const newStore = await createStore(baseStore);

  assert.ok(newStore.id);
  assert.equal(newStore.name, "Taco Fiesta");
  assert.equal(newStore.reviewCount, 0);
  assert.equal(newStore.ratingScore, 0);

  // Verify retrieval
  const fetched = await getStoreById(newStore.id);
  assert.ok(fetched);
  assert.equal(fetched?.slug, "taco-fiesta");

  // Update
  const updated = await updateStore(newStore.id, { tagline: "Award Winning Tacos" });
  assert.equal(updated?.tagline, "Award Winning Tacos");

  // Delete
  const deleted = await deleteStore(newStore.id);
  assert.equal(deleted, true);

  const afterDelete = await getStoreById(newStore.id);
  assert.equal(afterDelete, null);

  const deletedAgain = await deleteStore(newStore.id);
  assert.equal(deletedAgain, false);
});

test("getStoreBySlug finds stores case-insensitively", async () => {
  const created = await createStore({ ...baseStore, slug: "case-test-cafe", name: "Case Test Cafe" });

  const store = await getStoreBySlug("Case-Test-Cafe");
  assert.ok(store);
  assert.equal(store?.slug, "case-test-cafe");

  await deleteStore(created.id);
});

test("Reputation Firewall feedback submission & status update", async () => {
  const store = await createStore({ ...baseStore, slug: "firewall-test", name: "Firewall Test Diner" });

  const feedback = await submitPrivateFeedback({
    storeId: store.id,
    storeName: store.name,
    rating: 2,
    tableNumber: "9",
    customerName: "Jane Doe",
    customerContact: "jane@test.com",
    message: "Pizza arrived cold",
  });

  assert.ok(feedback.id);
  assert.equal(feedback.status, "new");

  const list = await getFeedbacks(store.id);
  const found = list.find((f) => f.id === feedback.id);
  assert.ok(found);
  assert.equal(found?.message, "Pizza arrived cold");

  const updated = await updateFeedbackStatus(feedback.id, "resolved");
  assert.equal(updated, true);

  const listAfter = await getFeedbacks(store.id);
  assert.equal(listAfter.find((f) => f.id === feedback.id)?.status, "resolved");

  // Deleting the location also removes its firewall inbox items
  await deleteStore(store.id);
  const listAfterDelete = await getFeedbacks(store.id);
  assert.equal(listAfterDelete.length, 0);
});

test("logScanEvent records telemetry and increments reviewCount on copy_open", async () => {
  const store = await createStore({ ...baseStore, slug: "telemetry-test", name: "Telemetry Test" });
  assert.equal(store.reviewCount, 0);

  const event = await logScanEvent({
    storeId: store.id,
    type: "copy_open",
    rating: 5,
    chips: ["Birria Tacos", "Horchata"],
  });

  assert.ok(event.id);
  assert.equal(event.storeId, store.id);

  const storeAfter = await getStoreById(store.id);
  assert.equal(storeAfter?.reviewCount, 1);

  const events = await getScanEvents(store.id);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "copy_open");

  await deleteStore(store.id);
});

test("buildAnalytics computes conversions from real events only", () => {
  const now = new Date().toISOString();
  const events: ScanEvent[] = [
    { id: "e1", storeId: "s1", type: "scan", rating: 5, chips: [], timestamp: now },
    { id: "e2", storeId: "s1", type: "scan", rating: 5, chips: [], timestamp: now },
    { id: "e3", storeId: "s1", type: "chip_toggle", rating: 5, chips: ["Speciality Cold Brew"], timestamp: now },
    { id: "e4", storeId: "s1", type: "copy_open", rating: 5, chips: ["Speciality Cold Brew"], timestamp: now },
    { id: "e5", storeId: "s1", type: "firewall_intercept", rating: 2, chips: [], timestamp: now },
  ];

  const summary = buildAnalytics(events, []);

  assert.equal(summary.totalScans, 2);
  assert.equal(summary.chipToggles, 1);
  assert.equal(summary.positiveRedirections, 1);
  assert.equal(summary.firewallIntercepts, 1);
  assert.equal(summary.complaints, 0);
  assert.equal(summary.redirectionRate, 50);
  assert.equal(summary.averageRating, 3.5); // (5 + 2) / 2
  assert.equal(summary.topChips[0].chip, "Speciality Cold Brew");
  assert.equal(summary.topChips[0].count, 2);
  assert.equal(summary.dailyActivity.length, 7);
});

test("getAnalytics returns zeroed metrics (not fabrications) when there is no activity", async () => {
  const analytics = await getAnalytics();

  assert.equal(analytics.totalScans, 0);
  assert.equal(analytics.positiveRedirections, 0);
  assert.equal(analytics.firewallIntercepts, 0);
  assert.equal(analytics.redirectionRate, 0);
  assert.equal(analytics.averageRating, 0);
  assert.deepEqual(analytics.topChips, []);
  assert.equal(analytics.dailyActivity.length, 7);
  assert.ok(analytics.dailyActivity.every((d) => d.scans === 0 && d.reviews === 0));
});

test("getStoreByScanKey resolves the permanent store id first, slug only as an alias", async () => {
  const created = await createStore({ ...baseStore, slug: "scan-key-test", name: "Scan Key Test" });

  // Printed standees encode the immutable id.
  const byId = await getStoreByScanKey(created.id);
  assert.equal(byId?.id, created.id);

  // Hand-shared slugs keep working as an alias.
  const bySlug = await getStoreByScanKey("SCAN-KEY-TEST");
  assert.equal(bySlug?.id, created.id);

  assert.equal(await getStoreByScanKey("not-a-real-key"), null);

  await deleteStore(created.id);
});

test("getStoresByIds returns only the assigned locations", async () => {
  const storeA = await createStore({ ...baseStore, slug: "scope-store-a", name: "Scope Store A" });
  const storeB = await createStore({ ...baseStore, slug: "scope-store-b", name: "Scope Store B" });

  const scoped = await getStoresByIds([storeA.id]);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].id, storeA.id);

  assert.deepEqual(await getStoresByIds([]), []);

  await deleteStore(storeA.id);
  await deleteStore(storeB.id);
});

test("team members can be invited, reassigned, suspended, and removed", async () => {
  const store = await createStore({ ...baseStore, slug: "team-store", name: "Team Store" });

  const member = await createTeamMember({
    email: "Owner@Bistro.com",
    name: "Bistro Owner",
    role: "store_admin",
    storeIds: [store.id],
  });

  assert.ok(member.id);
  assert.equal(member.email, "owner@bistro.com", "Emails are normalized to lowercase");
  assert.equal(member.status, "active");
  assert.deepEqual(member.storeIds, [store.id]);

  const fetched = await getTeamMemberByEmail("OWNER@bistro.com");
  assert.equal(fetched?.id, member.id);

  const suspended = await updateTeamMember(member.id, { status: "suspended", storeIds: [] });
  assert.equal(suspended?.status, "suspended");
  assert.deepEqual(suspended?.storeIds, []);
  assert.equal((await getTeamMemberByEmail("owner@bistro.com"))?.status, "suspended");

  const removed = await deleteTeamMember(member.id);
  assert.equal(removed, true);
  assert.equal(await getTeamMemberByEmail("owner@bistro.com"), null);

  await deleteStore(store.id);
});

test("feedback alert delivery is recorded for the firewall inbox", async () => {
  const store = await createStore({ ...baseStore, slug: "alert-store", name: "Alert Store" });

  const feedback = await submitPrivateFeedback({
    storeId: store.id,
    storeName: store.name,
    rating: 1,
    message: "Waited 40 minutes for the main course",
  });

  // Nothing has been dispatched yet.
  assert.equal(feedback.alert, undefined);

  const sentAt = new Date().toISOString();
  await updateFeedbackAlert(feedback.id, {
    status: "sent",
    recipients: ["owner@bistro.com"],
    sentAt,
  });

  const reloaded = await getFeedbackById(feedback.id);
  assert.equal(reloaded?.alert?.status, "sent");
  assert.deepEqual(reloaded?.alert?.recipients, ["owner@bistro.com"]);
  assert.equal(reloaded?.alert?.sentAt, sentAt);

  await deleteStore(store.id);
});
