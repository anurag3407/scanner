import { test } from "node:test";
import assert from "node:assert/strict";
import { getGoogleReviewUrl } from "../lib/review-links";

test("getGoogleReviewUrl returns raw URL directly if already an HTTP/HTTPS link", () => {
  const url1 = getGoogleReviewUrl({
    name: "French Window Patisserie",
    googlePlaceId: "https://maps.google.com/?q=French+Window+Patisserie+Koregaon+Park+Pune",
  });
  assert.equal(url1, "https://maps.google.com/?q=French+Window+Patisserie+Koregaon+Park+Pune");

  const url2 = getGoogleReviewUrl({
    name: "Some Cafe",
    googlePlaceId: "https://g.page/r/Cd42XYZ/review",
  });
  assert.equal(url2, "https://g.page/r/Cd42XYZ/review");
});

test("getGoogleReviewUrl formats universal Google Maps URL with query_place_id for Place IDs", () => {
  const url = getGoogleReviewUrl({
    name: "French Window Patisserie",
    address: "Lane 5, Koregaon Park, Pune",
    googlePlaceId: "ChIJ4T2n1q_BwjsR-V8x-0R0P_w",
  });

  assert.ok(url.startsWith("https://www.google.com/maps/search/?api=1"));
  assert.ok(url.includes("query=French%20Window%20Patisserie%20Lane%205%2C%20Koregaon%20Park%2C%20Pune"));
  assert.ok(url.includes("query_place_id=ChIJ4T2n1q_BwjsR-V8x-0R0P_w"));
  // Must NOT use search.google.com/local/writereview which produces hard 404s on unverified/regional place IDs
  assert.ok(!url.includes("search.google.com/local/writereview"));
});

test("getGoogleReviewUrl falls back gracefully to name and address if googlePlaceId is empty", () => {
  const url = getGoogleReviewUrl({
    name: "Third Wave Coffee",
    address: "Koramangala 4th Block, Bengaluru",
    googlePlaceId: "",
  });

  assert.equal(
    url,
    "https://www.google.com/maps/search/?api=1&query=Third%20Wave%20Coffee%20Koramangala%204th%20Block%2C%20Bengaluru"
  );
});
