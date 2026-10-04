import test from "node:test";
import assert from "node:assert/strict";
import {
  generateOfflineReview,
  generateUniqueReview,
  assertsFiveStars,
  generateOfflineReview as gen,
} from "../lib/ai";

const base = {
  storeName: "Third Wave Coffee",
  category: "Cafe",
  chips: ["Flat White", "Hummus Toast"],
  keywords: ["wood-fired"],
};

test("a 4-star diner is never told they gave five stars", () => {
  for (let seed = 0; seed < 200; seed++) {
    const draft = generateOfflineReview({ ...base, rating: 4, variationSeed: seed });
    assert.equal(
      assertsFiveStars(draft, 4),
      false,
      `seed ${seed} leaked a five-star claim: ${draft}`
    );
  }
});

test("rating actually changes the draft — the bug was identical output", () => {
  // Before the fix, generateOfflineReview ignored `rating` entirely, so 5 and 4
  // produced byte-identical text. Any difference proves the parameter is read.
  const five = generateOfflineReview({ ...base, rating: 5, variationSeed: 42 });
  const four = generateOfflineReview({ ...base, rating: 4, variationSeed: 42 });
  assert.notEqual(five, four, "a 4-star visit must not read identically to a 5-star one");
});

test("a 5-star diner still gets the full superlative treatment", () => {
  const draft = generateOfflineReview({ ...base, rating: 5, variationSeed: 42 });
  assert.equal(assertsFiveStars(draft, 5), false, "5 stars is allowed to claim five stars");
  assert.ok(draft.length > 40, "draft must still be a real review");
});

test("5-star output is unchanged by the fix", () => {
  // The guard must be inert for 5 stars, or the flagship experience regresses.
  const withoutRating = generateOfflineReview({ ...base, variationSeed: 7 });
  const withRating = generateOfflineReview({ ...base, rating: 5, variationSeed: 7 });
  assert.equal(withoutRating, withRating, "rating: 5 must not alter the 5-star path");
});

test("no rating still behaves exactly as before", () => {
  // Store previews in the console pass no rating at all.
  const draft = gen({ ...base, variationSeed: 3 });
  assert.equal(draft, gen({ ...base, variationSeed: 3 }));
  assert.ok(draft.length > 40);
});

test("generateUniqueReview is rating-safe too", () => {
  // The client uses generateUniqueReview, so the guard must survive the
  // de-duplication re-roll path.
  for (let seed = 0; seed < 100; seed++) {
    const draft = generateUniqueReview({ ...base, rating: 4, variationSeed: seed });
    assert.equal(assertsFiveStars(draft, 4), false, `unique seed ${seed} leaked`);
  }
});

test("an owner-authored template claiming five stars cannot force a 4-star claim", () => {
  const hostile = {
    intros: ["Five stars without hesitation at {name}."],
    closers: ["Cannot recommend {name} enough."],
    highlights: ["The {chip} was exceptional quality."],
  };
  for (let seed = 0; seed < 50; seed++) {
    const draft = generateOfflineReview({
      ...base,
      rating: 4,
      variationSeed: seed,
      templates: hostile,
    });
    assert.equal(
      assertsFiveStars(draft, 4),
      false,
      `custom template leaked at seed ${seed}: ${draft}`
    );
  }
});

test("the safety check only fires when the diner did not claim five stars", () => {
  assert.equal(assertsFiveStars("Five stars all around.", 5), false);
  assert.equal(assertsFiveStars("Five stars all around.", 4), true);
  assert.equal(assertsFiveStars("Five stars all around.", undefined), true);
  assert.equal(assertsFiveStars("A genuinely nice meal.", 4), false);
});

test("4-star drafts stay varied rather than collapsing to one sentence", () => {
  const set = new Set<string>();
  for (let seed = 0; seed < 60; seed++) {
    set.add(generateOfflineReview({ ...base, rating: 4, variationSeed: seed }));
  }
  assert.ok(set.size >= 50, `expected varied 4-star drafts, got ${set.size} distinct`);
});

test("the chip and keyword content survives the 4-star path", () => {
  const draft = generateOfflineReview({ ...base, rating: 4, variationSeed: 11 });
  assert.ok(
    draft.includes("Flat White") || draft.includes("Hummus"),
    "4-star drafts must still mention what the diner tapped"
  );
  assert.ok(draft.includes("wood-fired"), "signature keywords must still be woven in");
});
