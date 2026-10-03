import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { POST as createItemRoute, GET as getMenuRoute, PUT as reorderRoute } from "../app/api/stores/[id]/menu/route";
import { PATCH as patchItemRoute, DELETE as deleteItemRoute } from "../app/api/menu/[id]/route";
import { GET as getPublicMenuRoute } from "../app/api/public/menu/[key]/route";
import { POST as createStoreRoute } from "../app/api/stores/route";
import { POST as generateReviewRoute } from "../app/api/generate-review/route";
import { createMenuItem, getMenuItems, getMenuVersion } from "../lib/menu";
import { MENU_LIMITS } from "../lib/validation";
import { MenuItem } from "../lib/types";

// Isolated file stores — never the production Supabase database.
process.env.NODE_ENV = "test";
process.env.AUTH_BYPASS_TESTS = "true";
const TEST_DATA_FILE = path.join(os.tmpdir(), `reviewboost-menu-test-${process.pid}.json`);
const TEST_MENU_FILE = path.join(os.tmpdir(), `reviewboost-menu-items-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
process.env.MENU_DATA_FILE = TEST_MENU_FILE;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
  fs.rmSync(TEST_MENU_FILE, { force: true });
});

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

async function createTestStore(extra: Record<string, unknown> = {}) {
  const res = await createStoreRoute(
    json("http://scanner.test/api/stores", "POST", {
      name: "Menu Test Kitchen",
      slug: `menu-test-kitchen-${Math.random().toString(36).slice(2, 8)}`,
      category: "Restaurant",
      googlePlaceId: "ChIJmenuTest",
      managerEmail: "owner@menutest.com",
      ...extra,
    }, SAME_ORIGIN)
  );
  assert.equal(res.status, 201);
  const data = await res.json();
  return data.store as { id: string; slug: string; name: string; currency?: string; signatureKeywords?: string[] };
}

const routeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

test("Menu CRUD: create, list, patch, hide, delete", async () => {
  const store = await createTestStore({ currency: "INR" });

  // Create
  const created = await createItemRoute(
    json("http://scanner.test", "POST", {
      name: "  Butter   Chicken  ",
      description: "Slow-cooked tomato gravy",
      price: "₹ 280",
      category: "Mains",
      isVeg: false,
    }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(created.status, 201);
  const { item } = (await created.json()) as { item: MenuItem };
  assert.equal(item.name, "Butter Chicken", "name must be whitespace-normalized");
  assert.equal(item.price, 280, "a human-typed price string must parse to a number");
  assert.equal(item.isAvailable, true, "new items must be live by default");
  assert.equal(item.storeId, store.id);

  // List (owner view: everything, including hidden)
  const list = await getMenuRoute(new Request("http://scanner.test"), routeCtx(store.id));
  assert.equal(list.status, 200);
  const { items, version } = (await list.json()) as { items: MenuItem[]; version: string };
  assert.equal(items.length, 1);
  assert.ok(version.length > 0, "the menu must expose a version stamp");

  // Patch
  const patched = await patchItemRoute(
    json("http://scanner.test", "PATCH", { price: 320, description: "Updated description" }, SAME_ORIGIN),
    routeCtx(item.id)
  );
  assert.equal(patched.status, 200);
  const { item: patchedItem } = (await patched.json()) as { item: MenuItem };
  assert.equal(patchedItem.price, 320);
  assert.equal(patchedItem.name, "Butter Chicken", "a partial patch must not wipe other fields");
  assert.equal(patchedItem.storeId, store.id, "storeId can never be reassigned");

  // Hide (sold out)
  const hidden = await patchItemRoute(
    json("http://scanner.test", "PATCH", { isAvailable: false }, SAME_ORIGIN),
    routeCtx(item.id)
  );
  assert.equal(((await hidden.json()) as { item: MenuItem }).item.isAvailable, false);

  // Version must move after edits so diners re-fetch.
  const versionAfter = await getMenuVersion(store.id);
  assert.notEqual(versionAfter, version, "edits must bump the menu version");

  // Delete
  const deleted = await deleteItemRoute(
    new Request("http://scanner.test", { method: "DELETE", headers: SAME_ORIGIN }),
    routeCtx(item.id)
  );
  assert.equal(deleted.status, 200);
  assert.equal((await getMenuItems(store.id)).length, 0);
});

test("Menu validation: garbage payloads are rejected, not coerced", async () => {
  const store = await createTestStore();

  const cases: Array<[Record<string, unknown>, string]> = [
    [{ description: "no name" }, "missing name"],
    [{ name: "" }, "empty name"],
    [{ name: "Fine", price: "lots" }, "non-numeric price"],
    [{ name: "Fine", price: -5 }, "negative price"],
    [{ name: "Fine", price: MENU_LIMITS.MAX_PRICE + 1 }, "over-cap price"],
    [{ name: "Fine", sortOrder: -1 }, "negative sortOrder"],
    [{ name: "Fine", sortOrder: 1.5 }, "fractional sortOrder"],
  ];
  for (const [body, label] of cases) {
    const res = await createItemRoute(json("http://scanner.test", "POST", body, SAME_ORIGIN), routeCtx(store.id));
    assert.equal(res.status, 400, `${label} must be rejected`);
  }

  // A partial PATCH with a bad field is rejected too.
  const ok = await createItemRoute(
    json("http://scanner.test", "POST", { name: "Keep Me" }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  const { item } = (await ok.json()) as { item: MenuItem };
  const badPatch = await patchItemRoute(
    json("http://scanner.test", "PATCH", { price: "abc" }, SAME_ORIGIN),
    routeCtx(item.id)
  );
  assert.equal(badPatch.status, 400);
  // And the item survived with its values intact.
  const { getMenuItemById } = await import("../lib/menu");
  const after = await getMenuItemById(item.id);
  assert.equal(after!.price, 0, "a rejected patch must not corrupt the item");
});

test("Menu cap: a store cannot exceed the item limit", async () => {
  const store = await createTestStore();
  // Create items straight through the data layer (same cap check the route uses).
  for (let i = 0; i < MENU_LIMITS.MAX_ITEMS; i++) {
    await createMenuItem({
      storeId: store.id,
      name: `Dish ${i}`,
      description: "",
      price: i,
      category: "Mains",
      isVeg: false,
      isAvailable: true,
      sortOrder: i,
    });
  }

  const over = await createItemRoute(
    json("http://scanner.test", "POST", { name: "One Too Many" }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(over.status, 409, "the per-store menu cap must be enforced");
});

test("Public menu endpoint: available items only, no owner data, no-store", async () => {
  const store = await createTestStore({ currency: "USD" });
  await createMenuItem({
    storeId: store.id, name: "Live Dish", description: "visible", price: 10,
    category: "Mains", isVeg: true, isAvailable: true, sortOrder: 0,
  });
  await createMenuItem({
    storeId: store.id, name: "Sold Out Dish", description: "hidden", price: 12,
    category: "Mains", isVeg: false, isAvailable: false, sortOrder: 1,
  });

  // By store id...
  const byId = await getPublicMenuRoute(new Request("http://scanner.test"), { params: Promise.resolve({ key: store.id }) });
  assert.equal(byId.status, 200);
  assert.equal(byId.headers.get("cache-control"), "no-store", "the feed must never be cached");
  const byIdData = (await byId.json()) as { storeId: string; items: Array<Record<string, unknown>>; version: string };
  assert.equal(byIdData.storeId, store.id);
  assert.equal(byIdData.items.length, 1, "sold-out items must not be listed publicly");
  assert.equal(byIdData.items[0].name, "Live Dish");
  for (const key of ["storeId", "createdAt", "updatedAt", "managerEmail"]) {
    assert.equal(key in byIdData.items[0], false, `public items must not carry ${key}`);
  }

  // ...and by slug, exactly like the QR does.
  const bySlug = await getPublicMenuRoute(new Request("http://scanner.test"), { params: Promise.resolve({ key: store.slug }) });
  assert.equal(bySlug.status, 200);

  // Unknown key -> 404, never an empty 200 (that would mask misconfiguration).
  const missing = await getPublicMenuRoute(new Request("http://scanner.test"), { params: Promise.resolve({ key: "no-such-store" }) });
  assert.equal(missing.status, 404);
});

test("Reorder: full-order PUT works; foreign or duplicate ids are rejected", async () => {
  const store = await createTestStore();
  const ids: string[] = [];
  for (const name of ["Alpha", "Beta", "Gamma"]) {
    const res = await createItemRoute(json("http://scanner.test", "POST", { name }, SAME_ORIGIN), routeCtx(store.id));
    ids.push(((await res.json()) as { item: MenuItem }).item.id);
  }

  // Reverse the order.
  const reversed = [...ids].reverse();
  const reordered = await reorderRoute(
    json("http://scanner.test", "PUT", { itemIds: reversed }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(reordered.status, 200);
  const items = await getMenuItems(store.id);
  assert.deepEqual(
    items.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.id),
    reversed,
    "display order must follow the submitted list"
  );

  // A foreign id poisons the whole reorder.
  const foreign = await reorderRoute(
    json("http://scanner.test", "PUT", { itemIds: [...ids, "menu_foreign_item"] }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(foreign.status, 400);

  // Duplicate ids are rejected.
  const dupes = await reorderRoute(
    json("http://scanner.test", "PUT", { itemIds: [ids[0], ids[0]] }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(dupes.status, 400);

  // An empty list is rejected.
  const empty = await reorderRoute(
    json("http://scanner.test", "PUT", { itemIds: [] }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(empty.status, 400);
});

test("generate-review with a storeId uses the store's keywords, tone and templates", async () => {
  const store = await createTestStore({
    signatureKeywords: ["wood-fired oven"],
    reviewTone: "foodie",
    reviewTemplates: {
      intros: ["Dinner at {name} was a flavour masterclass."],
      highlights: ["The {chip} came out of the kitchen absolutely singing."],
      closers: ["Already planning the next visit to {name}!"],
    },
  });

  const res = await generateReviewRoute(
    json("http://scanner.test/api/generate-review", "POST", {
      storeId: store.id,
      chips: ["Margherita"],
      variationSeed: 7,
      // A spoofed name must be ignored when a storeId resolves the config.
      storeName: "SPOOFED BRAND",
    })
  );
  assert.equal(res.status, 200);
  const data = (await res.json()) as { review: string; source: string };
  assert.equal(data.source, "instant_engine");
  assert.ok(!data.review.includes("SPOOFED BRAND"), "the client must not control the brand");
  assert.ok(
    data.review.toLowerCase().includes("wood-fired oven"),
    "the store's signature keyword pool must be woven into the draft"
  );
  assert.ok(data.review.includes("Margherita"), "the tapped chip must appear");

  // A bogus storeId is a 404, not a silent fallback to spoofable fields.
  const missing = await generateReviewRoute(
    json("http://scanner.test/api/generate-review", "POST", { storeId: "store_missing", storeName: "X" })
  );
  assert.equal(missing.status, 404);
});

test("generate-review avoids repeating its own recent drafts for a store", async () => {
  const store = await createTestStore();
  const reviews = new Set<string>();
  for (let i = 0; i < 25; i++) {
    const res = await generateReviewRoute(
      json("http://scanner.test/api/generate-review", "POST", {
        storeId: store.id,
        chips: ["Truffle Pizza", "Cold Brew"],
        variationSeed: i * 3,
      })
    );
    const data = (await res.json()) as { review: string };
    reviews.add(data.review);
  }
  // 25 drafts from one isolate must not contain a single duplicate — the exact
  // repetition that gets reviews blocked by Google's spam filter.
  assert.equal(reviews.size, 25, "consecutive drafts for the same store must be unique");
});

test("menu item image links: accepted, projected publicly, clearable, and scheme-safe", async () => {
  const store = await createTestStore();

  // A valid https link is stored and echoed back.
  const created = await createItemRoute(
    json("http://scanner.test", "POST", {
      name: "Butter Chicken",
      price: 280,
      imageUrl: "https://images.example.com/butter-chicken.jpg?size=large",
    }, SAME_ORIGIN),
    routeCtx(store.id)
  );
  assert.equal(created.status, 201);
  const { item } = (await created.json()) as { item: { imageUrl?: string } };
  assert.equal(
    item.imageUrl,
    "https://images.example.com/butter-chicken.jpg?size=large",
    "the image link must be stored"
  );

  // The diner projection carries the link (it is public menu data).
  const feed = await getPublicMenuRoute(new Request("http://scanner.test"), {
    params: Promise.resolve({ key: store.id }),
  });
  const feedData = (await feed.json()) as { items: Array<{ name: string; imageUrl?: string }> };
  assert.equal(feedData.items[0].imageUrl, "https://images.example.com/butter-chicken.jpg?size=large");

  // Dangerous schemes are rejected, never stored.
  for (const bad of ["javascript:alert(1)", "data:text/html,<script>x</script>", "not a url", "ftp://x/y.jpg"]) {
    const badRes = await createItemRoute(
      json("http://scanner.test", "POST", { name: "Evil Dish", imageUrl: bad }, SAME_ORIGIN),
      routeCtx(store.id)
    );
    assert.equal(badRes.status, 400, `image link ${JSON.stringify(bad)} must be rejected`);
  }

  // An empty string clears the image; a partial PATCH keeps the rest.
  const cleared = await patchItemRoute(
    json("http://scanner.test", "PATCH", { imageUrl: "" }, SAME_ORIGIN),
    routeCtx(item.id)
  );
  assert.equal(cleared.status, 200);
  const clearedItem = (await cleared.json()) as { item: { imageUrl?: string; price: number } };
  assert.equal(clearedItem.item.imageUrl, undefined, "an empty image link must clear the image");
  assert.equal(clearedItem.item.price, 280, "clearing the image must not touch other fields");

  // A malformed link on PATCH is rejected and leaves the item intact.
  const badPatch = await patchItemRoute(
    json("http://scanner.test", "PATCH", { imageUrl: "javascript:alert(1)" }, SAME_ORIGIN),
    routeCtx(item.id)
  );
  assert.equal(badPatch.status, 400);
});
