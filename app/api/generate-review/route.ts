import { NextResponse } from "next/server";
import { generateUniqueReview, GenerateReviewOptions } from "@/lib/ai";
import { getStoreById } from "@/lib/store";
import { clientIdentifier, rateLimit } from "@/lib/rate-limit";
import { sanitizeReviewTone } from "@/lib/validation";

/**
 * Rolling record of the most recent drafts minted per store, used to avoid
 * handing two customers the same text — the exact signal Google's spam filter
 * keys on. In-memory LRU: exact per isolate, best-effort on serverless, and
 * only ever a belt-and-braces layer under the engine's combination space.
 */
const RECENT_DRAFT_LIMIT = 50;
const recentDraftsByStore = new Map<string, string[]>();

function rememberDraft(storeKey: string, draft: string) {
  const list = recentDraftsByStore.get(storeKey) ?? [];
  list.push(draft);
  while (list.length > RECENT_DRAFT_LIMIT) list.shift();
  recentDraftsByStore.set(storeKey, list);
}

export async function POST(req: Request) {
  // Public and unauthenticated: bound it so it cannot be used as a free
  // compute oracle. The diner UI calls it a few times per visit at most.
  const limiter = rateLimit(`generate-review:${clientIdentifier(req)}`, 60, 60_000);
  if (limiter.limited) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const { storeId, storeName, category, chips, rating, variationSeed, tone } = body;

    let options: GenerateReviewOptions;
    // The server resolves the store's own configuration whenever a storeId is
    // supplied: its tone, its sentence combinations and its signature keyword
    // pool. Client-supplied name/category are then ignored, so the endpoint
    // cannot be pointed at arbitrary brands.
    let storeKey = "";
    if (typeof storeId === "string" && storeId.trim()) {
      const store = await getStoreById(storeId.trim().slice(0, 100));
      if (store) {
        storeKey = store.id;
        options = {
          storeName: store.name,
          category: store.category || "Restaurant",
          chips: Array.isArray(chips)
            ? chips
                .filter((c: unknown): c is string => typeof c === "string")
                .map((c: string) => c.trim().slice(0, 100))
                .filter(Boolean)
                .slice(0, 20)
            : [],
          rating: Number(rating) || 5,
          variationSeed: Math.abs(Number(variationSeed) || 0) % 100000,
          tone: sanitizeReviewTone(tone) || store.reviewTone,
          templates: store.reviewTemplates,
          keywords: store.signatureKeywords,
        };
      } else {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }
    } else {
      const safeStoreName = typeof storeName === "string" ? storeName.trim().slice(0, 200) : "";
      if (!safeStoreName) {
        return NextResponse.json({ error: "Store name is required" }, { status: 400 });
      }

      const safeCategory = typeof category === "string" ? category.trim().slice(0, 100) : "Restaurant";
      options = {
        storeName: safeStoreName,
        category: safeCategory || "Restaurant",
        chips: Array.isArray(chips)
          ? chips
              .filter((c: unknown): c is string => typeof c === "string")
              .map((c: string) => c.trim().slice(0, 100))
              .filter(Boolean)
              .slice(0, 20)
          : [],
        rating: Number(rating) || 5,
        variationSeed: Math.abs(Number(variationSeed) || 0) % 100000,
        tone: sanitizeReviewTone(tone),
      };
    }

    // Skip drafts this isolate has recently minted for the same store.
    const recent = storeKey ? recentDraftsByStore.get(storeKey) ?? [] : [];
    const review = generateUniqueReview(options, recent);
    if (storeKey) {
      rememberDraft(storeKey, review);
    }

    const result = {
      review,
      source: "instant_engine" as const,
      latencyMs: 0,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to generate review", err);
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
