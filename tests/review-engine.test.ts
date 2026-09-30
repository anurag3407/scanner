import test from "node:test";
import assert from "node:assert/strict";
import { generateOfflineReview, generateSmartReview } from "../lib/ai";

test("generateOfflineReview generates review containing store name and category", () => {
  const review = generateOfflineReview({
    storeName: "Third Wave Coffee & Roastery",
    category: "Speciality Coffee Roastery",
    chips: ["Speciality Cold Brew", "Santosh (Barista)"],
    variationSeed: 0,
  });

  assert.ok(review.includes("Third Wave Coffee & Roastery"), "Review should include store name");
  assert.ok(review.includes("Speciality Cold Brew"), "Review should include dish chip");
  assert.ok(review.includes("Santosh (Barista)"), "Review should include server chip");
  assert.ok(review.length > 50, "Review should be a substantial authentic review");
});

test("generateOfflineReview handles empty chips gracefully", () => {
  const review = generateOfflineReview({
    storeName: "Corner Cafe",
    category: "Cafe",
    chips: [],
    variationSeed: 1,
  });

  assert.ok(review.includes("Corner Cafe"));
  assert.ok(review.length > 40);
});

test("generateOfflineReview supports multiple variation seeds", () => {
  const rev1 = generateOfflineReview({
    storeName: "Sushi Zen",
    category: "Japanese",
    chips: ["Spicy Tuna Roll"],
    variationSeed: 0,
  });

  const rev2 = generateOfflineReview({
    storeName: "Sushi Zen",
    category: "Japanese",
    chips: ["Spicy Tuna Roll"],
    variationSeed: 2,
  });

  assert.notEqual(rev1, rev2, "Different seeds should produce different phrasing variations");
});

test("generateSmartReview falls back to 0ms heuristic engine safely", async () => {
  const result = await generateSmartReview({
    storeName: "Brew & Bean",
    category: "Specialty Cafe",
    chips: ["Oat Milk Latte", "Friendly Baristas"],
  });

  assert.ok(result.review.length > 30);
  assert.ok(result.source === "instant_engine" || result.source === "gemini");
  assert.ok(typeof result.latencyMs === "number");
});

test("generateOfflineReview generates punchy tone review", () => {
  const review = generateOfflineReview({
    storeName: "Bella Pizza",
    category: "Pizzeria",
    chips: ["Truffle Pizza", "Crispy Crust"],
    tone: "punchy",
  });

  assert.ok(review.includes("Bella Pizza"));
  assert.ok(review.includes("Truffle Pizza"));
  assert.ok(review.length > 40);
});

test("generateOfflineReview generates foodie tone review", () => {
  const review = generateOfflineReview({
    storeName: "Gourmet Bistro",
    category: "French Bistro",
    chips: ["Duck Confit", "Red Wine Sauce"],
    tone: "foodie",
  });

  assert.ok(review.includes("Gourmet Bistro"));
  assert.ok(review.includes("Duck Confit"));
  assert.ok(review.length > 50);
});

test("generateOfflineReview generates hospitality tone review", () => {
  const review = generateOfflineReview({
    storeName: "The Cozy Tavern",
    category: "Tavern",
    chips: ["Sarah (Host)", "Warm Fireplace"],
    tone: "hospitality",
  });

  assert.ok(review.includes("The Cozy Tavern"));
  assert.ok(review.includes("Sarah (Host)"));
  assert.ok(review.length > 50);
});

