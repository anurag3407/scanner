/**
 * Resolves the Google Review / Google Maps hand-off URL for any store.
 *
 * Requirements & Behavior:
 * 1. If the store has a raw Google Place ID (e.g. ChIJ... or alphanumeric ID >= 15 chars):
 *    We construct the official Google direct write-a-review dialog:
 *    https://search.google.com/local/writereview?placeid=<PLACE_ID>
 *    This immediately pops open the 5-star review modal with the cursor focused in
 *    the review text box so the diner only has to tap stars and paste!
 *
 * 2. If the store provides a Google Business Profile shortlink (https://g.page/r/... or https://g.page/...):
 *    We ensure it ends with /review so it launches the review dialog directly.
 *
 * 3. If the URL contains placeid= or query_place_id= (e.g. from Google Maps search URLs):
 *    We extract the Place ID and route to search.google.com/local/writereview?placeid=<PLACE_ID>.
 *
 * 4. If the store has a legacy maps query link (https://maps.google.com/?q=...) or no Place ID:
 *    We route to Google Search with review intent:
 *    https://www.google.com/search?q=<NAME+ADDRESS>+reviews
 *    On mobile and desktop, this opens Google's prominent Knowledge Card with
 *    "Rate and review on Google" and 5 clickable stars right at the top of the screen,
 *    bypassing the generic map navigation view.
 */
export function isDirectReviewUrl(rawOrId?: string | null): boolean {
  if (!rawOrId) return false;
  const raw = rawOrId.trim();
  if (/ChIJ[a-zA-Z0-9_-]{20,}/.test(raw)) return true;
  if (raw.includes("writereview")) return true;
  if (raw.includes("g.page/") && raw.includes("/review")) return true;
  return false;
}

export function getGoogleReviewUrl(store: {
  googlePlaceId?: string | null;
  name: string;
  address?: string | null;
  tagline?: string | null;
  category?: string | null;
}): string {
  const raw = (store.googlePlaceId || "").trim();

  // 1. Any input containing a Google Place ID (ChIJ...)
  const chijMatch = raw.match(/ChIJ[a-zA-Z0-9_-]{20,}/);
  if (chijMatch) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(chijMatch[0])}`;
  }

  // 2. Pure alphanumeric Place ID without ChIJ (legacy/custom ID)
  if (raw && !raw.startsWith("http://") && !raw.startsWith("https://") && /^[a-zA-Z0-9_-]{15,100}$/.test(raw)) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(raw)}`;
  }

  // 3. Full URL provided
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);

      // Extract placeid or query_place_id if present in URL query params
      const placeId = parsed.searchParams.get("placeid") || parsed.searchParams.get("query_place_id");
      if (placeId) {
        return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
      }

      // If g.page business shortlink, ensure /review suffix is present
      if (parsed.hostname.includes("g.page")) {
        let cleanPath = parsed.pathname.replace(/\/+$/, "");
        if (!cleanPath.endsWith("/review")) {
          cleanPath += "/review";
        }
        parsed.pathname = cleanPath;
        return parsed.toString();
      }

      // If already an official Google write-review URL, preserve it
      if (parsed.pathname.includes("writereview")) {
        return raw;
      }

      // If legacy maps.google.com/?q=... or maps/search/?api=1&query=...
      const queryParam = parsed.searchParams.get("q") || parsed.searchParams.get("query");
      if (queryParam) {
        const clean = queryParam.trim();
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
      }

      return raw;
    } catch {
      return raw;
    }
  }

  // 3. Fallback to Google Maps Search with store name and address (never Google Search page)
  const queryText = [store.name, store.address || store.tagline || store.category || ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  const cleanQuery = queryText || store.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`;
}
