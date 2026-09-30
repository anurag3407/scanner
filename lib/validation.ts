const MAX_CHIPS = 40;
const MAX_CHIP_LENGTH = 60;

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
