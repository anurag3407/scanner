import { ReviewTemplateSet, ReviewTone, Subscription, SubscriptionStatus, BillingPeriod } from "./types";

const SUBSCRIPTION_STATUSES = ["lead", "trial", "active", "paused", "churned"] as const;
/** Upper bound on a monthly recurring amount: Rs 10,00,000. */
const MAX_MRR_RUPEES = 1_000_000;

const MAX_CHIPS = 40;
const MAX_CHIP_LENGTH = 60;
const MAX_TEMPLATE_LINES = 60;
const MAX_TEMPLATE_LINE_LENGTH = 280;
const MAX_EMAILS = 10;
const MAX_KEYWORDS = 30;

/** Menu item limits — a run-away paste must never bloat the database or the diner's screen. */
export const MENU_LIMITS = {
  MAX_ITEMS: 300,
  MAX_NAME: 80,
  MAX_DESCRIPTION: 240,
  MAX_CATEGORY: 40,
  MAX_PRICE: 999_999,
  MAX_IMAGE_URL: 500,
} as const;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value);
}

export function sanitizeStringArray(value: unknown, maxItems = MAX_CHIPS): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item).trim().slice(0, MAX_CHIP_LENGTH))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

export function parseRating(value: unknown): number | null {
  // Accept only a real number, or a string that is exactly a 1-5 integer.
  // `Number(value)` alone coerced booleans (true -> 1) and single-element
  // arrays ([3] -> 3), so a malformed payload could quietly pass validation.
  let rating: number;
  if (typeof value === "number") {
    rating = value;
  } else if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    rating = Number(value.trim());
  } else {
    return null;
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

/** Splits a comma/semicolon separated inbox list and keeps only valid addresses. */
export function sanitizeEmailList(value: unknown, maxItems = MAX_EMAILS): string[] {
  const raw = Array.isArray(value) ? value.map(String) : String(value ?? "").split(/[,;]+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of raw) {
    const email = candidate.trim().toLowerCase().slice(0, 160);
    if (!email || !EMAIL_PATTERN.test(email) || seen.has(email)) continue;
    seen.add(email);
    result.push(email);
    if (result.length >= maxItems) break;
  }
  return result;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/**
 * Normalizes a store's sentence combinations. Lines are cleaned, deduplicated
 * and capped so a run-away paste can never bloat the database or the review draft.
 */
export function sanitizeTemplateSet(value: unknown): ReviewTemplateSet | undefined {
  if (!value || typeof value !== "object") return undefined;

  const source = value as Record<string, unknown>;
  const cleanList = (list: unknown): string[] => {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of list) {
      const line = String(item).replace(/\s+/g, " ").trim().slice(0, MAX_TEMPLATE_LINE_LENGTH);
      if (!line || seen.has(line)) continue;
      seen.add(line);
      result.push(line);
      if (result.length >= MAX_TEMPLATE_LINES) break;
    }
    return result;
  };

  const templates: ReviewTemplateSet = {
    intros: cleanList(source.intros),
    highlights: cleanList(source.highlights),
    closers: cleanList(source.closers),
  };

  if (!templates.intros.length && !templates.highlights.length && !templates.closers.length) {
    return undefined;
  }
  return templates;
}

/** Accepts only the three tones the review engine implements; anything else is undefined. */
export function sanitizeReviewTone(value: unknown): ReviewTone | undefined {
  return value === "punchy" || value === "foodie" || value === "hospitality" ? value : undefined;
}

/**
 * Owner-configured signature phrases ("wood-fired oven", "generous portions")
 * that the review engine weaves into drafts. Cleans, dedupes and caps the list.
 */
export function sanitizeKeywordList(value: unknown, maxItems = MAX_KEYWORDS): string[] {
  return sanitizeStringArray(value, maxItems);
}

/** Accepts only a 3-letter alphabetic currency code ("INR", "USD", "EUR"...). */
export function sanitizeCurrency(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : undefined;
}

/** Parses a price the way a human might type it ("₹240", "240.5", "2,40,000") into a safe number. */
export function parseMenuPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizePrice(value);
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return normalizePrice(parsed);
  }
  return null;
}

function normalizePrice(value: number): number | null {
  if (value < 0 || value > MENU_LIMITS.MAX_PRICE) return null;
  // Money never carries more than 2 decimals; round rather than reject "240.999".
  return Math.round(value * 100) / 100;
}

/**
 * Accepts only a direct http(s) image link. The URL is never fetched by the
 * server — it is rendered client-side as an <img> src — so the protocol
 * allowlist (which blocks "javascript:", "data:", etc.) plus a length cap are
 * the entire attack surface.
 */
export function sanitizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().slice(0, MENU_LIMITS.MAX_IMAGE_URL);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Validates one menu-item write payload. Returns only the fields that are
 * present AND well-formed, so a partial PATCH never wipes untouched fields,
 * and a malformed field is reported instead of silently coerced.
 *
 * `imageUrl` follows PATCH semantics: absent = untouched, "" = clear the
 * image, a valid http(s) link = set it.
 */
export function sanitizeMenuItemInput(
  body: Record<string, unknown>,
  mode: "create" | "update"
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const value: Record<string, unknown> = {};

  if (mode === "create" || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, MENU_LIMITS.MAX_NAME) : "";
    if (!name) return { ok: false, error: "Item name is required" };
    value.name = name;
  }

  if (body.description !== undefined) {
    value.description =
      typeof body.description === "string"
        ? body.description.replace(/\s+/g, " ").trim().slice(0, MENU_LIMITS.MAX_DESCRIPTION)
        : "";
  }

  if (body.price !== undefined && body.price !== null && body.price !== "") {
    const price = parseMenuPrice(body.price);
    if (price === null) {
      return { ok: false, error: "Price must be a positive number" };
    }
    value.price = price;
  } else if (mode === "create") {
    value.price = 0;
  }

  if (body.category !== undefined) {
    value.category =
      typeof body.category === "string"
        ? body.category.replace(/\s+/g, " ").trim().slice(0, MENU_LIMITS.MAX_CATEGORY) || "Others"
        : "Others";
  } else if (mode === "create") {
    value.category = "Others";
  }

  if (body.isVeg !== undefined) {
    value.isVeg = body.isVeg === true || body.isVeg === "true";
  }

  if (body.isAvailable !== undefined) {
    value.isAvailable = body.isAvailable === true || body.isAvailable === "true";
  } else if (mode === "create") {
    value.isAvailable = true;
  }

  if (body.imageUrl !== undefined) {
    // Empty string (or null) clears the image; a valid link sets it.
    if (body.imageUrl === null || body.imageUrl === "") {
      value.imageUrl = undefined;
    } else {
      const imageUrl = sanitizeImageUrl(body.imageUrl);
      if (!imageUrl) {
        return { ok: false, error: "Image link must be a direct http(s) URL to an image" };
      }
      value.imageUrl = imageUrl;
    }
  }

  if (body.sortOrder !== undefined) {
    const sort = Number(body.sortOrder);
    if (!Number.isInteger(sort) || sort < 0 || sort > 100_000) {
      return { ok: false, error: "sortOrder must be a non-negative integer" };
    }
    value.sortOrder = sort;
  }

  return { ok: true, value };
}

/**
 * A GSTIN is 15 characters: 2-digit state code, 10-character PAN, 1 entity code,
 * 1 'Z', 1 checksum character. Validated before it is stored because it goes on
 * a tax invoice, and an invalid GSTIN there is a filing problem, not a typo.
 */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_PATTERN.test(value.trim().toUpperCase());
}


/**
 * Parses an optional end date, defaulting to now for a fresh churn.
 *
 * An unparseable value must not silently become "never churned" — a caller
 * that passes garbage is trying to record an end, so fall back to now rather
 * than dropping the signal.
 */
function parseEndedAt(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Validates the body of a manual subscription record.
 *
 * The amount arrives from a form field as rupees in decimal ("999", "999.50")
 * and is stored as integer paise. Money never round-trips through a float, so
 * the conversion happens exactly once, here.
 */
export function normalizeSubscriptionInput(
  body: Record<string, unknown>
):
  | { ok: true; value: Omit<Subscription, "id" | "createdAt" | "updatedAt"> & { id?: string } }
  | { ok: false; error: string } {
  const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(storeId)) {
    return { ok: false, error: "A valid storeId is required" };
  }

  const plan = typeof body.plan === "string" && body.plan.trim() ? body.plan.trim() : "solo";
  if (plan.length > 40) {
    return { ok: false, error: "Plan name is too long" };
  }

  const rawStatus = typeof body.status === "string" ? body.status.trim() : "active";
  const status = (SUBSCRIPTION_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as SubscriptionStatus)
    : "active";

  // Accept rupees in decimal; reject anything that is not a plain positive
  // amount. NaN/Infinity would otherwise become a silent zero.
  const rupees = body.mrrRupees === undefined || body.mrrRupees === null || body.mrrRupees === ""
    ? 0
    : Number(body.mrrRupees);
  if (!Number.isFinite(rupees) || rupees < 0) {
    return { ok: false, error: "Amount must be a positive number" };
  }
  if (rupees > MAX_MRR_RUPEES) {
    return { ok: false, error: "Amount is implausibly large" };
  }
  // Round rather than truncate: ₹999.50 must not silently become ₹999.
  const mrrInr = Math.round(rupees * 100);

  const rawPeriod = typeof body.billingPeriod === "string" ? body.billingPeriod.trim() : "monthly";
  const billingPeriod: BillingPeriod = rawPeriod === "annual" ? "annual" : "monthly";

  let gstin: string | undefined;
  if (typeof body.gstin === "string" && body.gstin.trim()) {
    const candidate = body.gstin.trim().toUpperCase();
    if (!isValidGstin(candidate)) {
      return { ok: false, error: "GSTIN must be a valid 15-character GSTIN" };
    }
    gstin = candidate;
  }

  let cancelReason: string | undefined;
  if (typeof body.cancelReason === "string" && body.cancelReason.trim()) {
    cancelReason = body.cancelReason.trim().slice(0, 200);
  }

  return {
    ok: true,
    value: {
      storeId,
      plan,
      status,
      mrrInr,
      billingPeriod,
      gstin,
      startedAt: new Date().toISOString(),
      // Honour a supplied end date. Without this a "churned" row kept
      // ended_at = NULL, so `churnedLast30Days` could never be non-zero and
      // the 30-day churn figure on /admin/revenue was permanently dead.
      // A churned subscription must carry an end date — otherwise it is
      // indistinguishable from one that ended years ago.
      endedAt:
        status === "churned" ? parseEndedAt(body.endedAt) : undefined,
      cancelReason,
    },
  };
}
