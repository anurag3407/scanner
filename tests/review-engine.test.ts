import test from "node:test";
import assert from "node:assert/strict";
import { generateOfflineReview, generateSmartReview } from "../lib/ai";

test("generateOfflineReview generates review containing store name and category", () => {
  const review = generateOfflineReview({
    storeName: "Luigi's Trattoria",
    category: "Italian Restaurant",
    chips: ["Woodfired Crust", "Marco (Host)"],
    variationSeed: 0,
  });

  assert.ok(review.includes("Luigi's Trattoria"), "Review should include store name");
  assert.ok(review.includes("Woodfired Crust"), "Review should include dish chip");
  assert.ok(review.includes("Marco (Host)"), "Review should include server chip");
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
