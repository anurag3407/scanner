// AI and Heuristic Review Generation Engine
// Supports Google Gemini 2.5 Flash with 0ms deterministic fallback generator

export interface GenerateReviewOptions {
  storeName: string;
  category: string;
  chips: string[];
  rating?: number;
  variationSeed?: number;
  tone?: "punchy" | "foodie" | "hospitality";
}

const INTROS = [
  "Hands down one of the best dining experiences I've had in a long time at {name}!",
  "Absolutely blown away by the quality and attention to detail at {name}!",
  "Such a fantastic visit to {name}! From the moment we walked in, everything was top-notch.",
  "Had an incredible experience at {name} today and couldn't wait to leave a review.",
  "What a gem! {name} completely exceeded our expectations.",
  "Honestly cannot say enough good things about our time at {name}.",
  "Came to {name} with high expectations and they managed to surpass every single one.",
  "If you are looking for an extraordinary dining experience, {name} is the spot.",
  "Tried {name} today and it immediately earned a spot among our absolute favorites.",
  "Every single detail at {name} was thoughtfully curated and beautifully executed.",
  "An unforgettable visit to {name}—truly one of the top culinary destinations in town.",
  "From start to finish, our experience at {name} was nothing short of perfection.",
  "So happy we chose {name} for our meal today; everything was stellar.",
  "Cannot recommend {name} enough—exemplary quality across the board!",
  "Always impressed whenever we visit {name}, but today was genuinely next-level."
];

const PUNCHY_INTROS = [
  "10/10 experience at {name} today!",
  "Best meal in town—{name} hits the mark every single time!",
  "Five stars all the way for {name}!",
  "Such a great visit to {name}!",
  "Hands down one of my favorite spots—{name} never disappoints!",
  "Quick visit to {name} and it was absolutely fantastic.",
  "Phenomenal food and top-tier service at {name}!",
  "Still thinking about how good {name} was today!",
  "Easily one of the best meals I've had all month at {name}.",
  "Everything was spot-on at {name} today!",
  "Big fan of {name}—they nailed it again!",
  "Came in hungry and left thoroughly impressed with {name}!"
];

const FOODIE_INTROS = [
  "An absolute culinary standout at {name}!",
  "As someone who takes food seriously, {name} blew me away with their execution and flavors!",
  "A truly memorable gastronomic experience at {name}!",
  "The culinary team at {name} is cooking at an exceptional level!",
  "Remarkable flavor balance and artistry on full display at {name}.",
  "Every bite at {name} showed genuine respect for fresh, high-quality ingredients.",
  "A masterclass in culinary balance and rich flavor profiles at {name}!",
  "If you appreciate authentic flavor craftsmanship, you must visit {name}.",
  "Rarely do you find a kitchen as consistently dialed in as {name}.",
  "The menu at {name} is packed with creative, mouth-watering hits."
];

const HOSPITALITY_INTROS = [
  "The genuine warmth and hospitality at {name} made our entire day!",
  "From the moment we walked through the door at {name}, the staff made us feel like family!",
  "Remarkable customer service and a welcoming vibe from start to finish at {name}!",
  "Outstanding hospitality at {name}—they truly know how to take care of their guests!",
  "It is so refreshing to experience service as caring and attentive as {name}.",
  "The team at {name} genuinely cares about every guest's dining experience.",
  "A masterclass in genuine dining hospitality at {name} today.",
  "Felt so welcomed and appreciated from the second we sat down at {name}."
];

const FOOD_CONNECTORS = [
  "The {chip} was prepared to perfection—bursting with flavor and impeccably fresh.",
  "You simply cannot leave without trying the {chip}; easily a standout highlight.",
  "The {chip} was out of this world—crafted with so much care and balanced flavors.",
  "I was especially impressed by the {chip}, which lived up to all the hype.",
  "The flavors in the {chip} were bold, well-balanced, and cooked with mastery.",
  "Make sure to order the {chip}—arguably the best version I've had anywhere.",
  "The presentation and taste of the {chip} completely stole the show.",
  "Texture and taste on the {chip} were flawless from the first bite to the last.",
  "Cannot get over how delicious the {chip} tasted today.",
  "The {chip} alone is worth making a special trip for."
];

const SERVICE_CONNECTORS = [
  "Special mention to {chip} for making us feel right at home with genuine warmth.",
  "The hospitality from {chip} was attentive, friendly, and elevated the entire meal.",
  "Super fast and courteous service, especially {chip} who took great care of us.",
  "Huge shoutout to {chip} for providing world-class, thoughtful service.",
  "Our server, {chip}, was incredibly knowledgeable, attentive, and kind.",
  "Service was prompt and seamless, with {chip} keeping everything flowing smoothly.",
  "Extra kudos to {chip} for the welcoming recommendations and radiant positive energy.",
  "The attentiveness from {chip} made us feel like regular VIPs throughout lunch."
];

const VIBE_CONNECTORS = [
  "The {chip} created the perfect backdrop for our visit.",
  "Really appreciated the {chip}—you can feel the pride they take in every detail.",
  "Loved the {chip}; the whole ambiance makes you want to linger and enjoy.",
  "The atmosphere was elevated by the {chip}, making the meal so relaxing.",
  "The aesthetic and {chip} make this such a comfortable spot to unwind.",
  "Great interior style, and the {chip} adds so much unique character to the venue.",
  "A vibrant, energetic room with great lighting and {chip}."
];

const OUTROS = [
  "Will definitely be returning soon and bringing friends along. Highly recommended!",
  "Easily a 5/5 star spot. If you haven't visited yet, you are missing out!",
  "Can't wait for our next visit. Kudos to the entire team for running such a tight ship!",
  "A must-visit in the area. 10/10 recommend to anyone who appreciates great food and service!",
  "Consistently delivers exceptional quality. Already planning my next visit!",
  "Do yourself a favor and stop by—you will not be disappointed!",
  "An absolute credit to local dining. We will be frequent regulars from now on!",
  "Five stars without hesitation. Thanks to the whole team for a wonderful meal!",
  "Leaving full, happy, and eager to come back again soon. Bravo!"
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

/**
 * 0ms instant heuristic review generator
 */
export function generateOfflineReview({
  storeName,
  category,
  chips,
  variationSeed = 0,
  tone,
}: GenerateReviewOptions): string {
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

  const introIndex = Math.abs(variationSeed + chips.length * 7) % introList.length;
  const outroIndex = Math.abs(variationSeed * 13 + chips.length + 3) % outroList.length;

  const intro = introList[introIndex].replace(/{name}/g, storeName);
  const outro = outroList[outroIndex].replace(/{name}/g, storeName);

  if (!chips || chips.length === 0) {
    if (tone === "punchy") {
      return `${intro} The food and service at this ${category.toLowerCase()} were top-tier. ${outro}`;
    }
    return `${intro} The food, atmosphere, and service at this ${category.toLowerCase()} were exceptional from start to finish. ${outro}`;
  }

  const highlights: string[] = [];

  // Structural permutation based on seed (Format variety prevents Google BERT duplication)
  const sortedChips = [...chips];
  if (variationSeed % 2 === 1 && sortedChips.length > 1) {
    // Reverse highlight order for odd seeds
    sortedChips.reverse();
  }

  sortedChips.forEach((chip, idx) => {
    const lower = chip.toLowerCase();
    if (
      lower.includes("server") ||
      lower.includes("service") ||
      lower.includes("host") ||
      lower.includes("staff") ||
      lower.includes("alex") ||
      lower.includes("marco") ||
      lower.includes("chef") ||
      lower.includes("barista") ||
      lower.includes("pitmaster")
    ) {
      const template = SERVICE_CONNECTORS[Math.abs(idx * 5 + variationSeed) % SERVICE_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    } else if (
      lower.includes("vibe") ||
      lower.includes("music") ||
      lower.includes("patio") ||
      lower.includes("decor") ||
      lower.includes("wifi") ||
      lower.includes("ambience") ||
      lower.includes("atmosphere") ||
      lower.includes("seating")
    ) {
      const template = VIBE_CONNECTORS[Math.abs(idx * 7 + variationSeed) % VIBE_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    } else {
      const template = FOOD_CONNECTORS[Math.abs(idx * 3 + variationSeed) % FOOD_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    }
  });

  const body = highlights.slice(0, tone === "punchy" ? 2 : 3).join(" ");
  return `${intro} ${body} ${outro}`;
}

/**
 * Intelligent review generator that attempts Gemini 2.5 Flash / Gemini 1.5 Flash API
 * and seamlessly falls back to 0ms heuristic template on missing key, network delay, or error.
 */
export async function generateSmartReview(options: GenerateReviewOptions): Promise<{
  review: string;
  source: "gemini" | "instant_engine";
  latencyMs: number;
}> {
  const start = Date.now();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      review: generateOfflineReview(options),
      source: "instant_engine",
      latencyMs: Date.now() - start,
    };
  }

  try {
    const toneInstruction =
      options.tone === "punchy"
        ? "- Length: 1 to 2 crisp, punchy sentences (under 35 words). Keep it enthusiastic and succinct."
        : options.tone === "foodie"
        ? "- Focus: Culinary craftsmanship, freshness, and delicious dish flavors (2 to 3 sentences)."
        : options.tone === "hospitality"
        ? "- Focus: Warm hospitality, attentive team members, and inviting ambiance (2 to 3 sentences)."
        : "- Length: 2 to 4 punchy sentences (around 45-75 words).";

    const prompt = `Write an authentic, natural, and enthusiastic 5-star Google review for "${options.storeName}" (${options.category}).
Key highlights to include naturally: ${options.chips.length > 0 ? options.chips.join(", ") : "great food, amazing service"}.
Guidelines:
- Tone: Genuine, conversational dining enthusiast (NOT overly corporate or robotic).
${toneInstruction}
- Do NOT use hashtags, emojis, or quotation marks.
- Mention the key highlights specifically.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1600); // 1.6s strict ceiling

    // Try Gemini 2.5 Flash or Gemini 1.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 120,
          },
        }),
      }
    );

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length > 20) {
        return {
          review: text.replace(/^["']|["']$/g, "").trim(),
          source: "gemini",
          latencyMs: Date.now() - start,
        };
      }
    }
  } catch {
    // Graceful fallback on network timeout, quota, or network disconnect
  }

  return {
    review: generateOfflineReview(options),
    source: "instant_engine",
    latencyMs: Date.now() - start,
  };
}
