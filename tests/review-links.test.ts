import { test } from "node:test";
import assert from "node:assert/strict";
import { getGoogleReviewUrl, isDirectReviewUrl } from "../lib/review-links";

test("isDirectReviewUrl identifies direct write-review links and Place IDs", () => {
  assert.equal(isDirectReviewUrl("ChIJ4T2n1q_BwjsR-V8x-0R0P_w"), true);
  assert.equal(isDirectReviewUrl("https://search.google.com/local/writereview?placeid=ChIJ123"), true);
  assert.equal(isDirectReviewUrl("https://g.page/r/Cd42XYZ/review"), true);
  assert.equal(isDirectReviewUrl("https://maps.google.com/?q=Some+Cafe"), false);
  assert.equal(isDirectReviewUrl(""), false);
});

test("getGoogleReviewUrl formats direct Google Write-a-Review modal URL for Place IDs", () => {
  const url = getGoogleReviewUrl({
    name: "French Window Patisserie",
    address: "Lane 5, Koregaon Park, Pune",
    googlePlaceId: "ChIJ4T2n1q_BwjsR-V8x-0R0P_w",
  });

  // Direct Write-a-Review link immediately triggers Google's 5-star review modal
  assert.equal(url, "https://search.google.com/local/writereview?placeid=ChIJ4T2n1q_BwjsR-V8x-0R0P_w");
});

test("getGoogleReviewUrl ensures /review is present on g.page links", () => {
  const url1 = getGoogleReviewUrl({
    name: "French Window Patisserie",
    googlePlaceId: "https://g.page/r/Cd42XYZ",
  });
  assert.equal(url1, "https://g.page/r/Cd42XYZ/review");

  const url2 = getGoogleReviewUrl({
    name: "Some Cafe",
    googlePlaceId: "https://g.page/r/Cd42XYZ/review",
  });
  assert.equal(url2, "https://g.page/r/Cd42XYZ/review");
});

test("getGoogleReviewUrl extracts placeid from Google Maps search URLs", () => {
  const url = getGoogleReviewUrl({
    name: "Toit Brewpub",
    googlePlaceId: "https://www.google.com/maps/search/?api=1&query=Toit&query_place_id=ChIJN1t_tDeuEmsRUsoyG83frY4",
  });
  assert.equal(url, "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4");
});

test("getGoogleReviewUrl routes legacy maps.google.com/?q=... links to Google Search Reviews", () => {
  const url = getGoogleReviewUrl({
    name: "French Window Patisserie",
    googlePlaceId: "https://maps.google.com/?q=French+Window+Patisserie+Koregaon+Park+Pune",
  });
  assert.equal(url, "https://www.google.com/search?q=French%20Window%20Patisserie%20Koregaon%20Park%20Pune%20reviews");
});

test("getGoogleReviewUrl falls back gracefully to Google Search Reviews if googlePlaceId is empty", () => {
  const url = getGoogleReviewUrl({
    name: "Third Wave Coffee",
    address: "Koramangala 4th Block, Bengaluru",
    googlePlaceId: "",
  });

  assert.equal(
    url,
    "https://www.google.com/search?q=Third%20Wave%20Coffee%20Koramangala%204th%20Block%2C%20Bengaluru%20reviews"
  );
});
