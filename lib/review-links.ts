/**
 * Resolves the Google Review / Google Maps hand-off URL for any store.
 *
 * Requirements & Fail-safe guarantees:
 * 1. If the store has a direct URL (Google Review shortlink https://g.page/r/.../review,
 *    Google Maps link https://maps.google.com/?q=..., or https://maps.app.goo.gl/...),
 *    it is used directly without alteration.
 * 2. If the store has a raw Google Place ID (e.g. ChIJ...):
 *    We use Google's official Universal Maps Search scheme with query_place_id:
 *    https://www.google.com/maps/search/?api=1&query=<NAME+ADDRESS>&query_place_id=<PLACE_ID>
 *    - If Google recognizes the place ID, it opens that business card directly.
 *    - If Google cannot find the place ID (synthetic, outdated, or regional mismatch),
 *      Google Maps automatically falls back to searching for query text.
 *    - This GUARANTEES 0% 404 errors (unlike search.google.com/local/writereview?placeid=...
 *      which throws a hard Google 404 whenever a place ID is not recognized).
 * 3. If no place ID or link is provided, it falls back to:
 *    https://www.google.com/maps/search/?api=1&query=<NAME+ADDRESS>
 */
export function getGoogleReviewUrl(store: {
  googlePlaceId?: string | null;
  name: string;
  address?: string | null;
  tagline?: string | null;
  category?: string | null;
}): string {
  const raw = (store.googlePlaceId || "").trim();

  // If already a full URL, return it directly
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const queryText = [store.name, store.address || store.tagline || store.category || ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  const encodedQuery = encodeURIComponent(queryText || store.name);

  // If a Google Place ID is provided
  if (raw) {
    return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}&query_place_id=${encodeURIComponent(raw)}`;
  }

  // Fallback to name + location search
  return `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
}
