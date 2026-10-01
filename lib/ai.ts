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

function pickFrom(list: string[], seed: number, salt: number): string {
  if (list.length === 0) return "";
  return list[Math.abs(seed * (13 + salt) + salt * 29 + salt) % list.length];
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
export function generateOfflineReview({
  storeName,
  category,
  chips,
  variationSeed = 0,
  tone,
  templates,
}: GenerateReviewOptions): string {
  const customIntros = templates?.intros?.length ? templates.intros : null;
  const customHighlights = templates?.highlights?.length ? templates.highlights : null;
  const customClosers = templates?.closers?.length ? templates.closers : null;

  let introList = INTROS;
  let outroList = OUTROS;

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

  // Derive unique indexes with prime offsets based on variation seed
  const introIndex = Math.abs(variationSeed * 17 + chips.length * 7) % introList.length;
  const outroIndex = Math.abs(variationSeed * 31 + chips.length * 11 + 3) % outroList.length;

  const intro = customIntros
    ? renderTemplate(pickFrom(customIntros, variationSeed, 3), { name: storeName, category })
    : introList[introIndex].replace(/{name}/g, storeName);
  const outro = customClosers
    ? renderTemplate(pickFrom(customClosers, variationSeed, 7), { name: storeName, category })
    : outroList[outroIndex].replace(/{name}/g, storeName);

  if (!chips || chips.length === 0) {
    if (tone === "punchy") {
      return `${intro} The food and service at this ${category.toLowerCase()} were top-tier. ${outro}`;
    }
    return `${intro} The food, atmosphere, and service at this ${category.toLowerCase()} were exceptional from start to finish. ${outro}`;
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
      return `${intro} ${customBody} ${outro}`;
    }
  }

  const highlights: string[] = [];

  // Permute order based on seed to ensure varied syntax
  const sortedChips = [...chips];
  if (variationSeed % 2 === 1 && sortedChips.length > 1) {
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
      lower.includes("rahul") ||
      lower.includes("santosh") ||
      lower.includes("priya") ||
      lower.includes("vikram") ||
      lower.includes("manager") ||
      lower.includes("chef") ||
      lower.includes("barista")
    ) {
      const template = SERVICE_CONNECTORS[Math.abs(idx * 7 + variationSeed * 13) % SERVICE_CONNECTORS.length];
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
      const template = VIBE_CONNECTORS[Math.abs(idx * 11 + variationSeed * 19) % VIBE_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    } else {
      const template = FOOD_CONNECTORS[Math.abs(idx * 5 + variationSeed * 23) % FOOD_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    }
  });

  const body = highlights.slice(0, tone === "punchy" ? 2 : 3).join(" ");
  return `${intro} ${body} ${outro}`;
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
