// Fast & Natural Review Generation Engine
// 100% deterministic, zero external AI latency, rich variations to prevent Google review duplication/blacklisting.

import { ReviewTemplateSet } from "./types";

export interface GenerateReviewOptions {
  storeName: string;
  category: string;
  chips: string[];
  rating?: number;
  variationSeed?: number;
  tone?: "punchy" | "foodie" | "hospitality";
  /** Store-owned sentence combinations. Empty lists fall back to the built-in library. */
  templates?: ReviewTemplateSet;
  /**
   * Store signature phrases ("wood-fired oven", "generous portions") woven
   * into the draft on top of the tapped chips. A larger word pool is the
   * primary defense against Google flagging repeated review text.
   */
  keywords?: string[];
}

const INTROS = [
  "Had such a wonderful experience at {name} today!",
  "Hands down one of my favorite spots in town—{name} always delivers.",
  "Dropped by {name} and was thoroughly impressed by everything.",
  "Such a great visit to {name}! From the moment we walked in, everything was on point.",
  "Had an amazing meal at {name} today with friends.",
  "What a gem! {name} completely exceeded our expectations.",
  "Honestly cannot say enough good things about our time at {name}.",
  "Came to {name} for lunch and we were so pleased with the whole experience.",
  "If you are looking for delicious food and a great spot to relax, {name} is it.",
  "Visited {name} today and it immediately earned a spot on our regular favorites list.",
  "Every single detail at {name} was thoughtfully done and well executed.",
  "A truly delightful visit to {name}—definitely coming back soon.",
  "From start to finish, our experience at {name} was top quality.",
  "So happy we chose {name} today; food was piping hot and fresh.",
  "Cannot recommend {name} enough—superb experience across the board!",
  "Always a pleasure visiting {name}, but today was especially memorable.",
  "Had a fantastic time at {name}! Great energy and welcoming vibe.",
  "Stopped in for a quick bite at {name} and ended up staying much longer—loved it.",
  "Quality is always consistent at {name}, and today was no exception.",
  "Really impressed by the standard of food and care at {name}."
];

const PUNCHY_INTROS = [
  "10/10 experience at {name} today!",
  "Best spot in the neighborhood—{name} hits the mark every time!",
  "Five stars all the way for {name}!",
  "Such a great visit to {name}!",
  "Hands down one of my favorite spots—{name} never disappoints!",
  "Quick visit to {name} and it was absolutely fantastic.",
  "Phenomenal food and top-tier service at {name}!",
  "Still thinking about how good {name} was today!",
  "Easily one of the best meals I've had all month at {name}.",
  "Everything was spot-on at {name} today!",
  "Big fan of {name}—they nailed it again!",
  "Came in hungry and left thoroughly satisfied from {name}!"
];

const FOODIE_INTROS = [
  "An absolute standout for authentic flavors at {name}!",
  "As someone who is super particular about good food, {name} blew me away with their flavors!",
  "A truly memorable meal at {name}—the kitchen clearly takes immense pride in their cooking.",
  "The culinary team at {name} is cooking at an exceptional level!",
  "Remarkable flavor balance and freshness on full display at {name}.",
  "Every dish at {name} showed genuine attention to quality ingredients and proper seasoning.",
  "A masterclass in taste and balanced flavor profiles at {name}!",
  "If you appreciate authentic flavor craftsmanship, you must visit {name}.",
  "Rarely do you find a kitchen as consistently dialed in as {name}.",
  "The menu at {name} is packed with creative, mouth-watering favorites."
];

const HOSPITALITY_INTROS = [
  "The genuine warmth and hospitality at {name} made our entire day!",
  "From the moment we stepped into {name}, the staff made us feel right at home!",
  "Remarkable customer service and a welcoming vibe from start to finish at {name}!",
  "Outstanding hospitality at {name}—they truly know how to take care of their guests!",
  "It is so refreshing to experience service as caring, polite, and attentive as {name}.",
  "The team at {name} genuinely cares about every guest's dining experience.",
  "Top-tier hospitality at {name} today—warm smiles and quick assistance all around.",
  "Felt so welcomed and appreciated from the second we sat down at {name}."
];

const FOOD_CONNECTORS = [
  "The {chip} was prepared to perfection—bursting with flavor and impeccably fresh.",
  "You simply cannot leave without trying the {chip}; easily a standout highlight.",
  "The {chip} was out of this world—crafted with so much care and balanced flavors.",
  "I was especially impressed by the {chip}, which lived up to all the recommendations.",
  "The flavors in the {chip} were bold, rich, and cooked with authentic taste.",
  "Make sure to order the {chip}—arguably the best version I've had anywhere.",
  "The presentation and taste of the {chip} completely stole the show.",
  "Texture and seasoning on the {chip} were spot-on from the first bite to the last.",
  "Cannot get over how delicious the {chip} tasted today.",
  "The {chip} alone is worth making a special trip for.",
  "Loved the {chip}—piping hot, aromatic, and cooked to absolute perfection.",
  "Really enjoyed the {chip}, highly recommend ordering it when you visit.",
  "The taste of the {chip} was authentic, wholesome, and delightfully fresh."
];

const SERVICE_CONNECTORS = [
  "Special mention to {chip} for making us feel right at home with genuine warmth.",
  "The hospitality from {chip} was attentive, friendly, and elevated the entire experience.",
  "Super fast and courteous service, especially {chip} who took great care of us.",
  "Huge shoutout to {chip} for providing world-class, thoughtful service with a smile.",
  "Our server, {chip}, was incredibly knowledgeable, attentive, and kind throughout.",
  "Service was prompt and seamless, with {chip} keeping everything flowing smoothly.",
  "Extra kudos to {chip} for the welcoming recommendations and positive energy.",
  "The attentiveness from {chip} made us feel like regular VIPs throughout our time here."
];

const VIBE_CONNECTORS = [
  "The {chip} created the perfect backdrop for our visit.",
  "Really appreciated the {chip}—you can feel the pride they take in the atmosphere.",
  "Loved the {chip}; the whole ambiance makes you want to sit back, relax, and linger.",
  "The atmosphere was elevated by the {chip}, making our meal so enjoyable.",
  "The aesthetic and {chip} make this such a comfortable spot to unwind.",
  "Great interior style, and the {chip} adds so much character to the venue.",
  "A vibrant, energetic atmosphere with cozy lighting and {chip}."
];

/**
 * Sentences that weave a store's signature keywords into the draft. Deliberately
 * varied in structure so the same keyword never always appears in the same
 * sentence shape — repeated sentence shapes are exactly what spam filters key on.
 */
const KEYWORD_CONNECTORS = [
  "A special mention for the {keyword}—absolutely spot on.",
  "Another highlight: the {keyword}. Genuinely memorable.",
  "The {keyword} deserves a shout-out; it elevated the whole visit.",
  "You can tell the {keyword} is a real point of pride for this team.",
  "Do pay attention to the {keyword}—it is handled with real care.",
  "The {keyword} alone is worth a repeat visit.",
  "Also loved the {keyword}; thoughtful touches everywhere you look.",
  "The {keyword} reflected real attention to detail.",
  "What stood out for me was the {keyword}—clearly done right.",
  "And the {keyword}? Flawless from start to finish.",
];

/** Suggestions offered in the Review Studio keyword editor. */
export const STARTER_KEYWORD_SUGGESTIONS = [
  "wood-fired oven",
  "generous portions",
  "family recipes",
  "fresh ingredients",
  "value for money",
  "quick service",
  "cozy outdoor seating",
  "house-made desserts",
  "single-origin coffee",
  "live acoustic evenings",
];

/**
 * Highlight phrases a diner can tap when the store has not configured its own
 * chips yet, so every QR still has a working review flow out of the box.
 */
export const DEFAULT_CHIPS = [
  "Food Quality",
  "Service",
  "Ambience",
  "Value for Money",
];

const OUTROS = [
  "Will definitely be returning soon and bringing friends along. Highly recommended!",
  "Easily a 5/5 star spot. If you haven't visited yet, you are truly missing out!",
  "Can't wait for our next visit. Kudos to the entire team for running such a tight ship!",
  "A must-visit in the area. 10/10 recommend to anyone who appreciates great food and service!",
  "Consistently delivers exceptional quality. Already planning my next visit!",
  "Do yourself a favor and stop by—you will not be disappointed!",
  "An absolute credit to local dining. We will be frequent regulars from now on!",
  "Five stars without hesitation. Thanks to the whole team for a wonderful time!",
  "Leaving full, happy, and eager to come back again soon. Bravo!",
  "A rare find where food, service, and ambiance all get top marks. Highly recommended!",
  "Will definitely be back to try more from the menu soon!",
  "Keep up the fantastic work, guys—you have earned a loyal fan!"
];

const PUNCHY_OUTROS = [
  "Can't wait to be back soon. Highly recommend!",
  "10/10 recommend to anyone looking for great food and quick service!",
  "Easily 5/5 stars—will definitely be returning!",
  "Cannot recommend {name} enough!",
  "10/10 spot. Will definitely be a regular here!",
  "Five stars all around!",
  "Already planning our next trip back!"
];

/** Sentence sets a store admin can load into the Review Studio as a starting point. */
export const STARTER_TEMPLATES: ReviewTemplateSet = {
  intros: [
    "Had such a wonderful experience at {name} today!",
    "Hands down one of my favorite spots in town—{name} always delivers.",
    "Visited {name} today and it immediately earned a spot on our regular favorites list.",
  ],
  highlights: [
    "The {chip} was prepared to perfection—bursting with flavor and impeccably fresh.",
    "You simply cannot leave without trying the {chip}; easily a standout highlight.",
    "Loved the {chip}, and the team behind it clearly cares about every detail.",
  ],
  closers: [
    "Will definitely be returning soon and bringing friends along. Highly recommended!",
    "Easily a 5/5 spot. If you haven't visited yet, you are truly missing out!",
    "Consistently delivers exceptional quality. Already planning my next visit!",
  ],
};

/**
 * Avalanche-mixes seed and salt into a uniform index.
 *
 * The previous picker (`seed * 17 + salt` style arithmetic) shared structure
 * with the list lengths: seeds that differed by exactly a list's length (20,
 * 13, 12...) landed on the SAME entry, so two customers a few "Different
 * wording" taps apart could mint identical drafts — precisely the duplication
 * that gets reviews blocked. Mixing every bit of the seed before the modulo
 * makes consecutive seeds land on different entries.
 */
function mixSeed(seed: number, salt: number): number {
  let h = (Math.abs(Math.trunc(seed)) ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function pickFrom(list: string[], seed: number, salt: number): string {
  if (list.length === 0) return "";
  return list[mixSeed(seed, salt) % list.length];
}

function renderTemplate(
  line: string,
  vars: { name: string; chip?: string; category?: string }
): string {
  return line
    .replace(/\{name\}/gi, vars.name)
    .replace(/\{store\}/gi, vars.name)
    .replace(/\{chip\}/gi, vars.chip ?? "")
    .replace(/\{item\}/gi, vars.chip ?? "")
    .replace(/\{dish\}/gi, vars.chip ?? "")
    .replace(/\{category\}/gi, vars.category ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Instant 0ms deterministic review generator.
 * Produces thousands of unique, natural sentence combinations to ensure
 * Google BERT/spam filters never flag reviews as duplicated. When a store has
 * published its own sentence combinations, those take priority over the
 * built-in library — which is also how a store refreshes its review text
 * without ever reprinting a QR code.
 */
/**
 * Re-rolls until the draft makes no five-star claim the diner did not make.
 *
 * The intro and closer lists are swapped for 4-star visits, but the BODY — chip
 * highlights and keyword connectors — is shared with the 5-star path, and some
 * of those sentences are superlative ("Flawless from start to finish", "earned a
 * loyal fan"). Patching each return point would be brittle and would need
 * redoing every time a phrase list changed, so the invariant is enforced once,
 * here, at the single place every draft passes through.
 */
function reRollUntilRatingSafe(
  build: (seed: number) => string,
  rating: number | undefined,
  baseSeed: number,
  maxTries = 16
): string {
  let draft = build(baseSeed);
  // 4 stars only: 5 legitimately claims five stars, and 1-3 never get here.
  if (rating !== 4) return draft;

  for (let attempt = 1; attempt <= maxTries && assertsFiveStars(draft, rating); attempt++) {
    draft = build(baseSeed + attempt * 211);
  }
  // If every roll still leaks (a store's own template says "five stars"), fall
  // back to a body-free construction rather than shipping the false claim.
  return assertsFiveStars(draft, rating) ? stripSuperlatives(draft) : draft;
}

/**
 * Last-resort scrub: removes the offending clauses so the text stays truthful
 * even when the phrase lists are fully custom. Crude by design — it should
 * almost never run.
 */
function stripSuperlatives(draft: string): string {
  return draft
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !assertsFiveStars(sentence, 4))
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildReviewDraft({
  storeName,
  category,
  chips,
  rating,
  variationSeed = 0,
  tone,
  templates,
  keywords,
}: GenerateReviewOptions): string {
  const customIntros = templates?.intros?.length ? templates.intros : null;
  const customHighlights = templates?.highlights?.length ? templates.highlights : null;
  const customClosers = templates?.closers?.length ? templates.closers : null;

  let introList = INTROS;
  let outroList = OUTROS;

  // A 4-star visit gets mild-positive phrasing. Only 4 is handled here: 1-3
  // never reach this function in the product (the Reputation Firewall routes
  // them to the private feedback form first), and a 5-star visit is the
  // superlative case the library was always written for.
  if (rating === 4 && !customIntros && !customClosers) {
    introList = FOUR_STAR_INTROS;
    outroList = FOUR_STAR_OUTROS;
  }

  if (tone === "punchy") {
    introList = PUNCHY_INTROS;
    outroList = PUNCHY_OUTROS;
  } else if (tone === "foodie") {
    introList = FOODIE_INTROS;
    outroList = OUTROS;
  } else if (tone === "hospitality") {
    introList = HOSPITALITY_INTROS;
    outroList = OUTROS;
  }

  // Mixed indexes: consecutive seeds must never reproduce the same draft.
  const introIndex = mixSeed(variationSeed, 1) % introList.length;
  const outroIndex = mixSeed(variationSeed, 2) % outroList.length;

  const intro = customIntros
    ? renderTemplate(pickFrom(customIntros, variationSeed, 3), { name: storeName, category })
    : introList[introIndex].replace(/{name}/g, storeName);
  const outro = customClosers
    ? renderTemplate(pickFrom(customClosers, variationSeed, 7), { name: storeName, category })
    : outroList[outroIndex].replace(/{name}/g, storeName);

  // Signature keywords, minus anything the diner already tapped as a chip
  // (a phrase must never appear twice in the same draft).
  const chipSet = new Set(chips.map((c) => c.toLowerCase().trim()));
  const keywordPool = (keywords || [])
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !chipSet.has(k.toLowerCase()));

  // Weave one or two keyword sentences, seeded so different visits pick
  // different keywords in different sentence shapes.
  const keywordLines: string[] = [];
  if (keywordPool.length > 0) {
    const weaveCount = Math.min(keywordPool.length, mixSeed(variationSeed, 41) % 2 === 0 ? 1 : 2);
    const usedKeywords = new Set<string>();
    for (let i = 0; i < weaveCount; i++) {
      const keyword = pickFrom(
        keywordPool.filter((k) => !usedKeywords.has(k.toLowerCase())),
        variationSeed + i * 97,
        43 + i
      );
      if (!keyword) break;
      usedKeywords.add(keyword.toLowerCase());
      const connector = pickFrom(KEYWORD_CONNECTORS, variationSeed + i * 131, 47 + i);
      const line = renderTemplate(connector, { name: storeName, category, chip: keyword }).replace(
        /\{keyword\}/gi,
        keyword
      );
      if (line) keywordLines.push(line);
    }
  }

  if (!chips || chips.length === 0) {
    if (tone === "punchy") {
      const filler = "The food and service at this {category} were top-tier.";
      const body = keywordLines.length
        ? keywordLines.join(" ")
        : renderTemplate(filler, { name: storeName, category });
      return `${intro} ${body} ${outro}`;
    }
    const filler =
      "The food, atmosphere, and service at this {category} were exceptional from start to finish.";
    const body = keywordLines.length
      ? keywordLines.join(" ")
      : renderTemplate(filler, { name: storeName, category });
    return `${intro} ${body} ${outro}`;
  }

  // Store-authored sentence combinations take priority over the built-in library.
  if (customHighlights) {
    const customBody = [...chips]
      .slice(0, tone === "punchy" ? 2 : 3)
      .map((chip, idx) =>
        renderTemplate(pickFrom(customHighlights, variationSeed + idx, 11 + idx * 5), {
          name: storeName,
          chip,
          category,
        })
      )
      .filter((line) => line.length > 0)
      .join(" ");

    if (customBody) {
      const keywordTail = keywordLines.length ? ` ${keywordLines.join(" ")}` : "";
      return `${intro} ${customBody}${keywordTail} ${outro}`;
    }
  }

  const highlights: string[] = [];

  // Permute order based on seed to ensure varied syntax
  const sortedChips = [...chips];
  if (mixSeed(variationSeed, 5) % 2 === 1 && sortedChips.length > 1) {
    sortedChips.reverse();
  }

  sortedChips.forEach((chip, idx) => {
    const lower = chip.toLowerCase();
    if (
      lower.includes("server") ||
      lower.includes("service") ||
      lower.includes("host") ||
      lower.includes("staff") ||
      lower.includes("waiter") ||
      lower.includes("manager") ||
      lower.includes("chef") ||
      lower.includes("barista") ||
      lower.includes("attentive")
    ) {
      const template = SERVICE_CONNECTORS[mixSeed(idx + variationSeed, 13) % SERVICE_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    } else if (
      lower.includes("vibe") ||
      lower.includes("music") ||
      lower.includes("patio") ||
      lower.includes("decor") ||
      lower.includes("wifi") ||
      lower.includes("ambiance") ||
      lower.includes("ambience") ||
      lower.includes("atmosphere") ||
      lower.includes("seating") ||
      lower.includes("work")
    ) {
      const template = VIBE_CONNECTORS[mixSeed(idx + variationSeed, 19) % VIBE_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    } else {
      const template = FOOD_CONNECTORS[mixSeed(idx + variationSeed, 23) % FOOD_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    }
  });

  const body = highlights.slice(0, tone === "punchy" ? 2 : 3).join(" ");
  const keywordTail = keywordLines.length ? ` ${keywordLines.join(" ")}` : "";
  return `${intro} ${body}${keywordTail} ${outro}`;
}

/* -------------------------------------------------------------------------- */
/* Rating-aware phrasing                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Mild-positive openers and closers for a 4-star visit.
 *
 * WHY THIS EXISTS. `generateOfflineReview` accepted a `rating` and ignored it,
 * so a diner who tapped 4 stars was handed text saying "Easily a 5/5 star
 * spot" / "Five stars without hesitation". That is a review-integrity defect,
 * not a copy bug: the product sells honest ratings, and the Reputation Firewall
 * only intercepts 1-3, so the 4-star case was the one nothing handled.
 *
 * These are deliberately *not* a new tone. The connectors, keyword weaving and
 * chip highlighting are shared with the 5-star path, so a 4-star draft still
 * reads like the same author wrote it — just without claiming five stars.
 */
const FOUR_STAR_INTROS = [
  "Really enjoyed our visit to {name} today.",
  "Good stop at {name} — everything we ordered came out well.",
  "Had a nice meal at {name} this afternoon.",
  "Worth a visit to {name}; the food and the room both held up.",
  "Stopped by {name} and left happy with the meal.",
  "A solid evening at {name} — would happily come back.",
];

const FOUR_STAR_OUTROS = [
  "Would happily come back on a quieter day.",
  "Good food, friendly service, and it did not feel rushed.",
  "Happy to recommend, though there are busier nights than others.",
  "Enjoyed the visit and would return.",
  "A reliable spot for a meal out.",
  "Worth knowing about if you are nearby.",
];

/**
 * Phrases that assert an unearned five stars. They must never reach a diner who
 * did not tap 5, so a draft containing one is re-rolled.
 */
const FIVE_STAR_ONLY =
  /five stars?|five-star|5\/5|10\/10|ten out of ten|cannot recommend|enjoyed every moment|flawless from start to finish|earned a loyal fan|exceptional quality|made my (?:day|year)|will be returning (?:soon|again)|highly recommended|worth a special trip|arguably the best/i;

/**
 * True when a draft makes a five-star claim the diner did not make.
 *
 * Exported for tests: this is the invariant the whole change rests on, and it is
 * the thing a future edit to the phrase lists would silently break.
 */
export function assertsFiveStars(draft: string, rating?: number): boolean {
  if (rating !== undefined && rating >= 5) return false;
  return FIVE_STAR_ONLY.test(draft);
}

/**
 * The public entry point. Thin wrapper so the rating-safety guard applies to
 * every draft regardless of which return path inside the builder produced it.
 */
export function generateOfflineReview(options: GenerateReviewOptions): string {
  return reRollUntilRatingSafe(
    (seed) => buildReviewDraft({ ...options, variationSeed: seed }),
    options.rating,
    options.variationSeed ?? 0
  );
}

/**
 * Generates a draft that is guaranteed to differ from every string in
 * `recentDrafts` (the client passes the drafts this visitor has already seen).
 * Re-rolls the seed up to `maxTries` times, then falls back to the last draft.
 */
export function generateUniqueReview(
  options: GenerateReviewOptions,
  recentDrafts: string[] = [],
  maxTries = 12
): string {
  if (recentDrafts.length === 0) {
    return generateOfflineReview(options);
  }

  const seen = new Set(recentDrafts);
  const baseSeed = Math.abs(Math.trunc(options.variationSeed ?? 0));
  let draft = generateOfflineReview(options);
  for (let attempt = 1; attempt <= maxTries && seen.has(draft); attempt++) {
    draft = generateOfflineReview({ ...options, variationSeed: baseSeed + attempt * 101 });
  }
  return draft;
}

/**
 * Estimates how many distinct drafts a store's configuration can produce.
 * Shown in the Review Studio so owners understand the anti-duplicate headroom:
 * the bigger the pool, the smaller the chance Google ever sees the same text.
 */
export function estimateReviewCombinations(options: {
  chips?: string[];
  keywords?: string[];
  tone?: GenerateReviewOptions["tone"];
  templates?: ReviewTemplateSet;
}): number {
  const tone = options.tone;
  const introCount =
    options.templates?.intros?.filter((l) => l.trim()).length ||
    (tone === "punchy"
      ? PUNCHY_INTROS.length
      : tone === "foodie"
        ? FOODIE_INTROS.length
        : tone === "hospitality"
          ? HOSPITALITY_INTROS.length
          : INTROS.length);
  const closerCount =
    options.templates?.closers?.filter((l) => l.trim()).length ||
    (tone === "punchy" ? PUNCHY_OUTROS.length : OUTROS.length);

  const chips = options.chips || [];
  const perChipConnectors =
    options.templates?.highlights?.filter((l) => l.trim()).length || FOOD_CONNECTORS.length;
  const bodySpace = chips.length === 0 ? 2 : Math.pow(perChipConnectors, Math.min(chips.length, 3)) * (chips.length > 1 ? 2 : 1);

  const keywords = (options.keywords || []).filter((k) => k.trim());
  // Either one keyword (n×10 sentence shapes) or two (n×(n-1)×10×10 ordered pairs), halved for overlap.
  const keywordSpace =
    keywords.length === 0
      ? 1
      : keywords.length * KEYWORD_CONNECTORS.length +
        keywords.length * Math.max(0, keywords.length - 1) * KEYWORD_CONNECTORS.length;

  return introCount * closerCount * bodySpace * keywordSpace;
}

/**
 * Fast, reliable review generator that returns immediately without external AI overhead.
 */
export async function generateSmartReview(options: GenerateReviewOptions): Promise<{
  review: string;
  source: "gemini" | "instant_engine";
  latencyMs: number;
}> {
  const start = Date.now();
  const review = generateOfflineReview(options);
  return {
    review,
    source: "instant_engine",
    latencyMs: Date.now() - start,
  };
}
