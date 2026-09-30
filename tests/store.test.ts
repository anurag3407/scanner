import test from "node:test";
import assert from "node:assert/strict";
import {
  getAllStores,
  getStoreBySlug,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  logScanEvent,
  submitPrivateFeedback,
  getFeedbacks,
  updateFeedbackStatus,
  getAnalytics,
} from "../lib/store";

test("getAllStores returns initial seeded stores", async () => {
  const stores = await getAllStores();
  assert.ok(Array.isArray(stores));
  assert.ok(stores.length >= 3);
  const luigi = stores.find((s) => s.slug === "luigis-trattoria");
  assert.ok(luigi);
  assert.equal(luigi?.name, "Luigi's Woodfired Trattoria");
});

test("getStoreBySlug finds stores case-insensitively", async () => {
  const store = await getStoreBySlug("Luigis-Trattoria");
  assert.ok(store);
  assert.equal(store?.slug, "luigis-trattoria");
});

test("createStore, updateStore, and deleteStore flow", async () => {
  const newStore = await createStore({
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
  });

  assert.ok(newStore.id);
  assert.equal(newStore.name, "Taco Fiesta");

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
});

test("Reputation Firewall feedback submission & status update", async () => {
  const feedback = await submitPrivateFeedback({
    storeId: "store_luigi_1",
    storeName: "Luigi's Woodfired Trattoria",
    rating: 2,
    tableNumber: "9",
    customerName: "Jane Doe",
    customerContact: "jane@test.com",
    message: "Pizza arrived cold",
  });

  assert.ok(feedback.id);
  assert.equal(feedback.status, "new");

  const list = await getFeedbacks("store_luigi_1");
  const found = list.find((f) => f.id === feedback.id);
  assert.ok(found);
  assert.equal(found?.message, "Pizza arrived cold");

  // Update status to resolved
  const updated = await updateFeedbackStatus(feedback.id, "resolved");
  assert.equal(updated, true);

  const listAfter = await getFeedbacks("store_luigi_1");
  const resolvedItem = listAfter.find((f) => f.id === feedback.id);
  assert.equal(resolvedItem?.status, "resolved");
});

test("getAnalytics returns valid summary with top chips and conversion rate", async () => {
  const analytics = await getAnalytics();
  assert.ok(analytics.totalScans > 0);
  assert.ok(analytics.redirectionRate >= 0 && analytics.redirectionRate <= 100);
  assert.ok(Array.isArray(analytics.topChips));
  assert.ok(analytics.topChips.length > 0);
  assert.ok(Array.isArray(analytics.dailyActivity));
});

test("logScanEvent records telemetry and increments reviewCount on copy_open", async () => {
  const storeBefore = await getStoreById("store_luigi_1");
  const countBefore = storeBefore?.reviewCount || 0;

  const event = await logScanEvent({
    storeId: "store_luigi_1",
    type: "copy_open",
    rating: 5,
    chips: ["Woodfired Crust", "Marco (Host)"],
  });

  assert.ok(event.id);
  assert.equal(event.storeId, "store_luigi_1");

  const storeAfter = await getStoreById("store_luigi_1");
  assert.equal(storeAfter?.reviewCount, countBefore + 1);
});
