// AI and Heuristic Review Generation Engine
// Supports Google Gemini 2.5 Flash with 0ms deterministic fallback generator

export interface GenerateReviewOptions {
  storeName: string;
  category: string;
  chips: string[];
  rating?: number;
  variationSeed?: number;
}

const INTROS = [
  "Hands down one of the best dining experiences I've had in a long time at {name}!",
  "Absolutely blown away by the quality and attention to detail at {name}!",
  "Such a fantastic visit to {name}! From the moment we walked in, everything was top-notch.",
  "Had an incredible experience at {name} today and couldn't wait to leave a review.",
  "What a gem! {name} completely exceeded our expectations.",
  "Honestly cannot say enough good things about our time at {name}.",
  "Came to {name} with high expectations and they managed to surpass every single one."
];

const FOOD_CONNECTORS = [
  "The {chip} was prepared to perfection—bursting with flavor and impeccably fresh.",
  "You simply cannot leave without trying the {chip}; easily a standout highlight.",
  "The {chip} was out of this world—crafted with so much care and balanced flavors.",
  "I was especially impressed by the {chip}, which lived up to all the hype."
];

const SERVICE_CONNECTORS = [
  "Special mention to {chip} for making us feel right at home with genuine warmth.",
  "The hospitality from {chip} was attentive, friendly, and elevated the entire meal.",
  "Super fast and courteous service, especially {chip} who took great care of us."
];

const VIBE_CONNECTORS = [
  "The {chip} created the perfect backdrop for our visit.",
  "Really appreciated the {chip}—you can feel the pride they take in every detail.",
  "Loved the {chip}; the whole ambiance makes you want to linger and enjoy."
];

const OUTROS = [
  "Will definitely be returning soon and bringing friends along. Highly recommended!",
  "Easily a 5/5 star spot. If you haven't visited yet, you are missing out!",
  "Can't wait for our next visit. Kudos to the entire team for running such a tight ship!",
  "A must-visit in the area. 10/10 recommend to anyone who appreciates great food and service!",
  "Consistently delivers exceptional quality. Already planning my next visit!"
];

/**
 * 0ms instant heuristic review generator
 */
export function generateOfflineReview({
  storeName,
  category,
  chips,
  variationSeed = 0,
}: GenerateReviewOptions): string {
  const introIndex = (variationSeed + chips.length) % INTROS.length;
  const outroIndex = (variationSeed * 3 + chips.length + 1) % OUTROS.length;

  const intro = INTROS[introIndex].replace(/{name}/g, storeName);
  const outro = OUTROS[outroIndex];

  if (!chips || chips.length === 0) {
    return `${intro} The food, atmosphere, and service at this ${category.toLowerCase()} were exceptional from start to finish. ${outro}`;
  }

  const highlights: string[] = [];

  chips.forEach((chip, idx) => {
    const lower = chip.toLowerCase();
    if (lower.includes("server") || lower.includes("service") || lower.includes("host") || lower.includes("staff") || lower.includes("alex") || lower.includes("marco") || lower.includes("chef") || lower.includes("barista")) {
      const template = SERVICE_CONNECTORS[(idx + variationSeed) % SERVICE_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    } else if (lower.includes("vibe") || lower.includes("music") || lower.includes("patio") || lower.includes("decor") || lower.includes("wifi") || lower.includes("ambience")) {
      const template = VIBE_CONNECTORS[(idx + variationSeed) % VIBE_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    } else {
      const template = FOOD_CONNECTORS[(idx + variationSeed) % FOOD_CONNECTORS.length];
      highlights.push(template.replace(/{chip}/g, chip));
    }
  });

  const body = highlights.slice(0, 3).join(" ");
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
    const prompt = `Write an authentic, natural, and enthusiastic 5-star Google review for "${options.storeName}" (${options.category}).
Key highlights to include naturally: ${options.chips.length > 0 ? options.chips.join(", ") : "great food, amazing service"}.
Guidelines:
- Tone: Genuine, conversational dining enthusiast (NOT overly corporate or robotic).
- Length: 2 to 4 punchy sentences (around 45-75 words).
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
