import { ReviewTemplateSet } from "./types";

const MAX_CHIPS = 40;
const MAX_CHIP_LENGTH = 60;
const MAX_TEMPLATE_LINES = 60;
const MAX_TEMPLATE_LINE_LENGTH = 280;
const MAX_EMAILS = 10;

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
  const rating = Number(value);
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
