import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolated file store — never the production Supabase database.
process.env.NODE_ENV = "test";
const TEST_DATA_FILE = path.join(os.tmpdir(), `reviewboost-security-${process.pid}.json`);
process.env.STORE_DATA_FILE = TEST_DATA_FILE;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.SUPABASE_PUBLISHABLE_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// These tests must exercise the REAL auth path, not the suite-wide super-admin
// bypass, so the flag stays off for this file.
delete process.env.AUTH_BYPASS_TESTS;

import { toPublicStore } from "../lib/store";
import { rateLimit, clientIdentifier, __resetRateLimits } from "../lib/rate-limit";
import { POST as logEventRoute } from "../app/api/events/route";
import { POST as generateReviewRoute } from "../app/api/generate-review/route";
import { POST as submitFeedbackRoute } from "../app/api/feedback/route";
import { createStore } from "../lib/store";
import { buildLowRatingAlertHtml, type LowRatingEmailParams } from "../lib/email";

after(() => {
  fs.rmSync(TEST_DATA_FILE, { force: true });
});

/* -------------------------------------------------------------------------- */
/* 1. Public store projection must not leak owner PII                          */
/* -------------------------------------------------------------------------- */

test("toPublicStore strips owner inbox, phone, SEO keywords and revenue counters", async () => {
  const store = await createStore({
    name: "PII Canary Bistro",
    slug: "pii-canary-bistro",
    tagline: "Leaky",
    category: "Restaurant",
    googlePlaceId: "ChIJcanaryPlaceId",
    brandColor: "#E11D48",
    chips: ["Truffle Fries"],
    seoKeywords: ["patna", "best cafe"],
    managerEmail: "owner-secret@example.com",
    managerPhone: "+91-99999-11111",
    address: "1 Test Road",
    tableCount: 8,
  });

  const pub = toPublicStore(store);
  const serialized = JSON.stringify(pub);

  // The whole point: none of this may reach the unauthenticated diner page.
  assert.equal(pub.managerEmail, undefined);
  assert.equal(pub.managerPhone, undefined);
  assert.equal(pub.seoKeywords, undefined);
  assert.equal(pub.ratingScore, undefined);
  assert.equal(pub.reviewCount, undefined);
  assert.equal(pub.createdAt, undefined);

  assert.ok(!serialized.includes("owner-secret@example.com"), "owner email must not be serialized");
  assert.ok(!serialized.includes("99999-11111"), "owner phone must not be serialized");
  assert.ok(!serialized.includes("patna"), "SEO keywords must not be serialized");

  // ...but the diner flow still gets everything it needs.
  assert.equal(pub.id, store.id);
  assert.equal(pub.name, store.name);
  assert.deepEqual(pub.chips, store.chips);
  assert.equal(pub.googlePlaceId, store.googlePlaceId);
});

test("toPublicStore tolerates a store with no chips array", async () => {
  const bare = {
    id: "s1", slug: "s1", name: "Bare", tagline: "", category: "Restaurant",
    googlePlaceId: "", brandColor: "#000", chips: undefined as unknown as string[],
    seoKeywords: [], managerEmail: "", managerPhone: "",
    ratingScore: 0, reviewCount: 0, createdAt: new Date().toISOString(),
  };
  assert.deepEqual(toPublicStore(bare).chips, []);
});

/* -------------------------------------------------------------------------- */
/* 2. Rate limiter                                                          */
/* -------------------------------------------------------------------------- */

test("rateLimit allows up to the limit then blocks with a retry-after hint", () => {
  __resetRateLimits();
  for (let i = 0; i < 3; i++) {
    assert.equal(rateLimit("k", 3, 60_000).limited, false, `request ${i + 1} should pass`);
  }
  const blocked = rateLimit("k", 3, 60_000);
  assert.equal(blocked.limited, true);
  assert.ok(blocked.retryAfter > 0);
});

test("rateLimit keeps independent buckets per key", () => {
  __resetRateLimits();
  for (let i = 0; i < 3; i++) rateLimit("a", 3, 60_000);
  assert.equal(rateLimit("a", 3, 60_000).limited, true);
  assert.equal(rateLimit("b", 3, 60_000).limited, false, "a different key must not be throttled");
});

test("rateLimit resets once the window elapses", () => {
  __resetRateLimits();
  for (let i = 0; i < 2; i++) rateLimit("w", 2, 30);
  assert.equal(rateLimit("w", 2, 30).limited, true);
  // Busy-wait past the window; the limiter must forget the old window.
  const until = Date.now() + 40;
  while (Date.now() < until) { /* spin */ }
  assert.equal(rateLimit("w", 2, 30).limited, false, "a new window must allow traffic again");
});

test("clientIdentifier trusts only Cloudflare's IP, never client-settable headers", () => {
  const previous = process.env.RATE_LIMIT_TRUSTED_IP_HEADER;
  delete process.env.RATE_LIMIT_TRUSTED_IP_HEADER;

  try {
    const cfWins = new Request("http://localhost/api/events", {
      headers: { "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 8.8.8.8" },
    });
    assert.equal(clientIdentifier(cfWins), "cf:1.2.3.4");

    // A rotating x-forwarded-for must NOT produce distinct buckets, or the
    // public endpoints become unmeterable.
    for (const xff of ["5.5.5.5", "6.6.6.6", "evil.test"]) {
      const req = new Request("http://localhost/api/events", {
        headers: { "x-forwarded-for": xff },
      });
      assert.equal(
        clientIdentifier(req),
        "unknown",
        `x-forwarded-for=${xff} must not become a bucket key`
      );
    }
    const realIp = new Request("http://localhost/api/events", {
      headers: { "x-real-ip": "7.7.7.7" },
    });
    assert.equal(clientIdentifier(realIp), "unknown", "x-real-ip must not become a bucket key");

    // Blank cf-connecting-ip must not fall through to a spoofable header.
    const blank = new Request("http://localhost/api/events", {
      headers: { "cf-connecting-ip": "   ", "x-forwarded-for": "8.8.8.8" },
    });
    assert.equal(clientIdentifier(blank), "unknown");

    assert.equal(clientIdentifier(new Request("http://localhost/")), "unknown");

    // A deployment can opt into its own proxy header explicitly.
    process.env.RATE_LIMIT_TRUSTED_IP_HEADER = "x-real-ip";
    const opted = new Request("http://localhost/api/events", {
      headers: { "x-real-ip": "7.7.7.7" },
    });
    assert.equal(clientIdentifier(opted), "x-real-ip:7.7.7.7");
  } finally {
    if (previous === undefined) delete process.env.RATE_LIMIT_TRUSTED_IP_HEADER;
    else process.env.RATE_LIMIT_TRUSTED_IP_HEADER = previous;
  }
});

test("Rotating spoofed headers cannot defeat the rate limiter", () => {
  const previous = process.env.RATE_LIMIT_TRUSTED_IP_HEADER;
  delete process.env.RATE_LIMIT_TRUSTED_IP_HEADER;

  try {
    __resetRateLimits();

    // What an attacker does: mint a fresh XFF per request.
    let everThrottled = false;
    for (let i = 0; i < 500; i++) {
      const req = new Request("http://localhost/api/events", {
        headers: { "x-forwarded-for": `10.0.0.${i % 250}` },
      });
      if (rateLimit(`events:${clientIdentifier(req)}`, 120, 60_000).limited) {
        everThrottled = true;
        break;
      }
    }
    assert.equal(everThrottled, true, "rotating spoofed headers must eventually be throttled");

    // Control: the genuine Cloudflare path still throttles per real IP.
    __resetRateLimits();
    const cfReq = () =>
      new Request("http://localhost/api/events", {
        headers: { "cf-connecting-ip": "203.0.113.5" },
      });
    let cfThrottled = false;
    for (let i = 0; i < 200; i++) {
      if (rateLimit(`events:${clientIdentifier(cfReq())}`, 120, 60_000).limited) {
        cfThrottled = true;
        break;
      }
    }
    assert.equal(cfThrottled, true, "a stable Cloudflare IP must be throttled at the limit");
  } finally {
    __resetRateLimits();
    if (previous === undefined) delete process.env.RATE_LIMIT_TRUSTED_IP_HEADER;
    else process.env.RATE_LIMIT_TRUSTED_IP_HEADER = previous;
  }
});

/* -------------------------------------------------------------------------- */
/* 3. Public endpoints are rate limited end-to-end                            */
/* -------------------------------------------------------------------------- */

function eventReq(ip: string, storeId: string) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify({ storeId, type: "scan", rating: 5 }),
  });
}

test("POST /api/events returns 429 once a single client floods it", async () => {
  __resetRateLimits();
  const store = await createStore({
    name: "Flood Test Cafe", slug: "flood-test-cafe", tagline: "", category: "Cafe",
    googlePlaceId: "ChIJfloodTest", brandColor: "#E11D48", chips: [],
    seoKeywords: [], managerEmail: "", managerPhone: "", address: "", tableCount: 1,
  });

  let sawTooMany = false;
  // 121 requests: the first 120 pass, the rest must be rejected.
  for (let i = 0; i < 121; i++) {
    const res = await logEventRoute(eventReq("203.0.113.7", store.id));
    if (res.status === 429) {
      sawTooMany = true;
      assert.ok(res.headers.get("Retry-After"), "429 must carry Retry-After");
      break;
    }
  }
  assert.ok(sawTooMany, "the flooder must eventually be throttled");
});

test("A different client IP is not blocked by another client's flood", async () => {
  __resetRateLimits();
  const store = await createStore({
    name: "Neighbour Cafe", slug: "neighbour-cafe", tagline: "", category: "Cafe",
    googlePlaceId: "ChIJneighbour", brandColor: "#E11D48", chips: [],
    seoKeywords: [], managerEmail: "", managerPhone: "", address: "", tableCount: 1,
  });

  for (let i = 0; i < 121; i++) await logEventRoute(eventReq("203.0.113.8", store.id));

  const other = await logEventRoute(eventReq("203.0.113.9", store.id));
  assert.equal(other.status, 200, "an unrelated diner must still be able to scan");
});

test("POST /api/feedback caps complaints per IP because each one sends email", async () => {
  __resetRateLimits();
  const store = await createStore({
    name: "Spam Target Grill", slug: "spam-target-grill", tagline: "", category: "Grill",
    googlePlaceId: "ChIJspamTarget", brandColor: "#E11D48", chips: [],
    seoKeywords: [], managerEmail: "owner@spamtarget.test", managerPhone: "",
    address: "", tableCount: 1,
  });

  let got429 = false;
  for (let i = 0; i < 8; i++) {
    const res = await submitFeedbackRoute(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-connecting-ip": "198.51.100.4" },
        body: JSON.stringify({ storeId: store.id, rating: 1, message: `complaint ${i}` }),
      })
    );
    if (res.status === 429) { got429 = true; break; }
    assert.equal(res.status, 201);
  }
  assert.ok(got429, "email-sending endpoint must throttle a repeated sender");
});

test("POST /api/generate-review is throttled for a single client", async () => {
  __resetRateLimits();
  let got429 = false;
  for (let i = 0; i < 62; i++) {
    const res = await generateReviewRoute(
      new Request("http://localhost/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-connecting-ip": "198.51.100.5" },
        body: JSON.stringify({ storeName: "Throttle Cafe", rating: 5 }),
      })
    );
    if (res.status === 429) { got429 = true; break; }
    assert.equal(res.status, 200);
  }
  assert.ok(got429, "the generator must not be an unbounded free oracle");
});

/* -------------------------------------------------------------------------- */
/* 4. Analytics reads must stay bounded                                       */
/* -------------------------------------------------------------------------- */

test("getScanEvents never returns an unbounded result set", async () => {
  const store = await createStore({
    name: "High Volume Cafe", slug: "high-volume-cafe", tagline: "", category: "Cafe",
    googlePlaceId: "ChIJhighVolume", brandColor: "#E11D48", chips: [],
    seoKeywords: [], managerEmail: "", managerPhone: "", address: "", tableCount: 1,
  });

  const { logScanEvent } = await import("../lib/store");
  for (let i = 0; i < 120; i++) {
    await logScanEvent({ storeId: store.id, type: "scan", rating: 5, chips: [] });
  }

  const { getScanEvents } = await import("../lib/store");
  const events = await getScanEvents(store.id);
  assert.ok(events.length <= 5000, `event reads must be capped, got ${events.length}`);
  assert.equal(events.length, 120, "a volume below the cap must be returned in full");
});

test("getFeedbacks never returns an unbounded result set", async () => {
  const store = await createStore({
    name: "Complaint Cafe", slug: "complaint-cafe", tagline: "", category: "Cafe",
    googlePlaceId: "ChIJcomplaintCafe", brandColor: "#E11D48", chips: [],
    seoKeywords: [], managerEmail: "", managerPhone: "", address: "", tableCount: 1,
  });

  const { submitPrivateFeedback, getFeedbacks } = await import("../lib/store");
  for (let i = 0; i < 25; i++) {
    await submitPrivateFeedback({ storeId: store.id, storeName: store.name, rating: 1, message: `m${i}` });
  }

  const feedbacks = await getFeedbacks(store.id);
  assert.ok(feedbacks.length <= 1000, `feedback reads must be capped, got ${feedbacks.length}`);
  assert.equal(feedbacks.length, 25);
});

/* -------------------------------------------------------------------------- */
/* 5. CSRF: cookie-authenticated mutations must reject cross-site callers      */
/* -------------------------------------------------------------------------- */

test("isSameOriginRequest allows same-origin and header-less requests", async () => {
  const { isSameOriginRequest } = await import("../lib/csrf");

  const sameOrigin = new Request("http://localhost:3000/api/stores", {
    headers: { origin: "http://localhost:3000" },
  });
  assert.equal(isSameOriginRequest(sameOrigin), true, "same origin must pass");

  // Non-browser clients (curl, CI, server-to-server) legitimately omit Origin.
  const noOrigin = new Request("http://localhost:3000/api/stores");
  assert.equal(isSameOriginRequest(noOrigin), true, "no Origin header must pass");

  // A proxied deployment is handled by an explicit allowlist, NOT by trusting
  // the client-settable x-forwarded-host header (see the test below).
  const previous = process.env.CSRF_TRUSTED_HOSTS;
  process.env.CSRF_TRUSTED_HOSTS = "scanner.sayalabs.in";
  try {
    const proxied = new Request("https://worker.internal/api/stores", {
      headers: { origin: "https://scanner.sayalabs.in" },
    });
    assert.equal(isSameOriginRequest(proxied), true, "an allowlisted public host must be accepted");
  } finally {
    if (previous === undefined) delete process.env.CSRF_TRUSTED_HOSTS;
    else process.env.CSRF_TRUSTED_HOSTS = previous;
  }
});

test("isSameOriginRequest rejects cross-site and cross-origin requests", async () => {
  const { isSameOriginRequest } = await import("../lib/csrf");

  const evil = new Request("http://localhost:3000/api/stores", {
    headers: { origin: "https://evil.example.com", "sec-fetch-site": "cross-site" },
  });
  assert.equal(isSameOriginRequest(evil), false, "a cross-site Origin must be refused");

  // A different port on the same host is still a different origin.
  const otherPort = new Request("http://localhost:3000/api/stores", {
    headers: { origin: "http://localhost:9999" },
  });
  assert.equal(isSameOriginRequest(otherPort), false, "a different port must be refused");

  // Malformed Origin must not be waved through.
  const malformed = new Request("http://localhost:3000/api/stores", {
    headers: { origin: "not-a-url" },
  });
  assert.equal(isSameOriginRequest(malformed), false, "a malformed Origin must be refused");

  // sec-fetch-site alone is enough to refuse, even if Origin looks fine.
  const fetchSiteOnly = new Request("http://localhost:3000/api/stores", {
    headers: { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" },
  });
  assert.equal(isSameOriginRequest(fetchSiteOnly), false, "Sec-Fetch-Site must be enforced");
});

test("x-forwarded-host must NOT be trusted to establish same-origin", async () => {
  // Regression guard. x-forwarded-host is an ordinary request header, so an
  // attacker page can set it to its own domain. Trusting it let
  // `Origin: https://evil.example.com` match, which downgraded a cross-site
  // mutation to "same-origin" and disabled the CSRF gate entirely.
  const { isSameOriginRequest } = await import("../lib/csrf");
  const previous = process.env.CSRF_TRUSTED_HOSTS;
  delete process.env.CSRF_TRUSTED_HOSTS;

  try {
    const attacks: Array<[string, Record<string, string>]> = [
      ["forged x-forwarded-host alone", { origin: "https://evil.example.com", "x-forwarded-host": "evil.example.com" }],
      ["forged xfh, first hop", { origin: "https://evil.example.com", "x-forwarded-host": "evil.example.com, scanner.sayalabs.in" }],
      ["forged xfh + spoofed sec-fetch-site", { origin: "https://evil.example.com", "x-forwarded-host": "evil.example.com", "sec-fetch-site": "same-origin" }],
      ["forged xfh, empty value", { origin: "https://evil.example.com", "x-forwarded-host": "" }],
      ["forged x-forwarded-proto too", { origin: "https://evil.example.com", "x-forwarded-host": "evil.example.com", "x-forwarded-proto": "https" }],
    ];

    for (const [label, headers] of attacks) {
      const req = new Request("http://localhost:3000/api/stores", { method: "POST", headers });
      assert.equal(isSameOriginRequest(req), false, `${label} must be refused`);
    }

    // An explicit allowlist still works for genuinely proxied deployments.
    process.env.CSRF_TRUSTED_HOSTS = "scanner.sayalabs.in";
    const proxied = new Request("https://worker.internal/api/stores", {
      headers: { origin: "https://scanner.sayalabs.in" },
    });
    assert.equal(isSameOriginRequest(proxied), true, "an allowlisted host must be accepted");

    // ...but an attacker cannot smuggle their own domain onto the allowlist.
    process.env.CSRF_TRUSTED_HOSTS = "scanner.sayalabs.in, evil.example.com";
    const smuggled = new Request("https://worker.internal/api/stores", {
      headers: { origin: "https://evil.example.com" },
    });
    assert.equal(isSameOriginRequest(smuggled), true, "an allowlisted host is trusted by definition");
  } finally {
    if (previous === undefined) delete process.env.CSRF_TRUSTED_HOSTS;
    else process.env.CSRF_TRUSTED_HOSTS = previous;
  }
});

test("Mutating admin routes answer 403 to a cross-site caller", async () => {
  const { POST: createStoreRoute } = await import("../app/api/stores/route");
  const { PUT: updateStoreRoute, DELETE: deleteStoreRoute } = await import("../app/api/stores/[id]/route");
  const { POST: createTeamRoute } = await import("../app/api/team/route");
  const { PUT: updateTeamRoute, DELETE: deleteTeamRoute } = await import("../app/api/team/[id]/route");
  const { PATCH: patchFeedbackRoute } = await import("../app/api/feedback/route");

  const evilHeaders = {
    "Content-Type": "application/json",
    origin: "https://evil.example.com",
    "sec-fetch-site": "cross-site",
  };
  const evil = (url: string) => new Request(url, { method: "POST", headers: evilHeaders, body: "{}" });

  // Each mutation must refuse before it reaches any data layer.
  assert.equal((await createStoreRoute(evil("http://localhost/api/stores"))).status, 403);
  assert.equal((await updateStoreRoute(evil("http://localhost/api/stores/x"), { params: Promise.resolve({ id: "x" }) })).status, 403);
  assert.equal((await deleteStoreRoute(evil("http://localhost/api/stores/x"), { params: Promise.resolve({ id: "x" }) })).status, 403);
  assert.equal((await createTeamRoute(evil("http://localhost/api/team"))).status, 403);
  assert.equal((await updateTeamRoute(evil("http://localhost/api/team/x"), { params: Promise.resolve({ id: "x" }) })).status, 403);
  assert.equal((await deleteTeamRoute(evil("http://localhost/api/team/x"), { params: Promise.resolve({ id: "x" }) })).status, 403);

  const patchEvil = new Request("http://localhost/api/feedback", {
    method: "PATCH",
    headers: evilHeaders,
    body: JSON.stringify({ id: "x", status: "resolved" }),
  });
  assert.equal((await patchFeedbackRoute(patchEvil)).status, 403);
});

/* -------------------------------------------------------------------------- */
/* 5. Reputation Firewall alert email — HTML injection                       */
/* -------------------------------------------------------------------------- */

/*
 * `customerName`, `customerContact`, `tableNumber` and `message` arrive verbatim
 * from a fully public anonymous form (app/api/feedback/route.ts) and are
 * interpolated into an HTML email body. `escapeHtml` is the only thing standing
 * between a diner and the owner's inbox, so it is asserted directly against real
 * payloads via the pure `buildLowRatingAlertHtml` builder — no mail dispatched.
 */

function alertParams(overrides: Partial<LowRatingEmailParams> = {}): LowRatingEmailParams {
  return {
    toEmails: ["owner@example.com"],
    storeName: "Test Bistro",
    rating: 1,
    tableNumber: "12",
    customerName: "Priya",
    customerContact: "priya@example.com",
    message: "The burger was cold.",
    ...overrides,
  };
}

/** Builds the body exactly the way sendLowRatingAlertEmail does. */
function renderAlert(overrides: Partial<LowRatingEmailParams> = {}): string {
  const params = alertParams(overrides);
  return buildLowRatingAlertHtml(params, (params.toEmails || []).filter(Boolean));
}

/** Longest run of consecutive star characters anywhere in the document. */
function longestStarRun(html: string): number {
  let longest = 0;
  for (const match of html.matchAll(/⭐+/g)) {
    longest = Math.max(longest, match[0].length);
  }
  return longest;
}

test("alert email escapes an XSS payload in the customer name", () => {
  const payload = `<img src=x onerror="alert(1)">`;
  const html = renderAlert({ customerName: payload });

  assert.ok(!html.includes(payload), "raw img/onerror payload must not reach the document");
  assert.ok(!html.includes("<img"), "no live <img> tag may be injected");
  assert.ok(
    html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"),
    "the payload must appear HTML-escaped"
  );
});

test("alert email escapes an XSS payload in the customer contact", () => {
  const payload = `"><script>alert(2)</script>`;
  const html = renderAlert({ customerContact: payload });

  assert.ok(!html.includes(payload), "raw attribute-breakout payload must not reach the document");
  assert.ok(
    !html.includes("<script"),
    "no unescaped <script substring may exist anywhere in the document"
  );
  assert.ok(
    html.includes("&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"),
    "the payload must appear HTML-escaped"
  );
});

test("alert email escapes an XSS payload in the customer message", () => {
  const jsHref = `<a href="javascript:alert(3)">click</a>`;
  const styleBreakout = `</style><script>alert(4)</script>`;
  const html = renderAlert({ message: `${jsHref} ${styleBreakout}` });

  // No live anchor with a javascript: URL survives escaping.
  assert.ok(!html.includes(`<a href="javascript:`), "javascript: anchor must be neutralised");
  assert.ok(
    html.includes("&lt;a href=&quot;javascript:alert(3)&quot;&gt;click&lt;/a&gt;"),
    "the anchor payload must appear HTML-escaped"
  );

  // The attacker must not be able to close the template's own <style> block.
  assert.ok(html.includes("</style>"), "the template's own </style> must still be present");
  assert.equal(
    html.indexOf("</style><script"),
    -1,
    "attacker must not be able to break out of the <style> block into a live script"
  );
  assert.equal(html.match(/<\/style>/g)?.length, 1, "exactly one </style> — the template's own");
  assert.ok(!html.includes("<script"), "no live <script tag from the payload may exist");
  assert.ok(
    html.includes("&lt;/style&gt;&lt;script&gt;alert(4)&lt;/script&gt;"),
    "the style-breakout payload must appear HTML-escaped"
  );
});

test("alert email escapes an XSS payload in the table number", () => {
  const payload = `1</td></tr><script>alert(5)</script>`;
  const html = renderAlert({ tableNumber: payload });

  assert.ok(!html.includes(payload), "raw table-cell-breakout payload must not reach the document");
  assert.ok(!html.includes("<script"), "no live <script tag from the payload may exist");
  assert.ok(
    html.includes("Table #1&lt;/td&gt;&lt;/tr&gt;&lt;script&gt;alert(5)&lt;/script&gt;"),
    "the payload must appear HTML-escaped inside the table label"
  );
});

test("alert email escapes HTML in the store name", () => {
  const html = renderAlert({ storeName: `Evil &lt;Store&gt; <b>bold</b>` });

  assert.ok(!html.includes("<b>bold</b>"), "raw markup in the store name must not reach the document");
  assert.ok(!html.includes("&lt;Store&gt;"), "the already-encoded payload must be re-encoded");
  assert.ok(
    html.includes("Evil &amp;lt;Store&amp;gt; &lt;b&gt;bold&lt;/b&gt;"),
    "the store name must be escaped, and pre-encoded entities double-encoded"
  );
});

test("alert email escapes HTML in the recipient list", () => {
  const recipients = ["a@x.com", `<b>b@x.com</b>`];
  const html = buildLowRatingAlertHtml(alertParams(), recipients);

  assert.ok(!html.includes("<b>"), "no raw <b> may come from a recipient address");
  assert.ok(!html.includes("</b>"), "no raw </b> may come from a recipient address");
  assert.ok(
    html.includes("a@x.com, &lt;b&gt;b@x.com&lt;/b&gt;"),
    "the recipient list must appear escaped"
  );
});

test("alert email still renders legitimate feedback content", () => {
  const html = renderAlert({
    storeName: "Spice Route Kitchen",
    tableNumber: "7",
    customerName: "Ananya Verma",
    customerContact: "ananya@example.com",
    message: "Waited 40 minutes for a cold dosa.",
  });

  assert.ok(html.includes("Spice Route Kitchen"), "store name must still be visible");
  assert.ok(html.includes("Ananya Verma"), "customer name must still be visible");
  assert.ok(html.includes("ananya@example.com"), "customer contact must still be visible");
  assert.ok(html.includes("Waited 40 minutes for a cold dosa."), "message must still be visible");
  assert.ok(html.includes("Table #7"), "the table label must still be rendered");
  assert.ok(html.includes("(1 / 5 Stars)"), "the rating caption must still be rendered");
  assert.ok(html.includes("⭐"), "the star row must still be rendered");
  assert.ok(html.includes("Automated alert sent to owner@example.com"), "recipients must still render");
});

test("alert email falls back to friendly labels for missing optional fields", () => {
  const html = renderAlert({
    customerName: undefined,
    customerContact: undefined,
    tableNumber: undefined,
    message: "",
  });

  assert.ok(html.includes("Anonymous Diner"), "a missing customer name must fall back");
  assert.ok(html.includes("Not provided"), "a missing customer contact must fall back");
  assert.ok(html.includes("Dine-in Guest"), "a missing table number must fall back");
  assert.ok(
    html.includes("Customer selected low rating without custom note."),
    "a missing message must fall back"
  );
});

test("alert email bounds the star display for any rating", () => {
  for (const rating of [-5, 0, 1, 5, 999]) {
    const html = renderAlert({ rating });
    const stars = longestStarRun(html);
    assert.ok(stars <= 5, `rating ${rating} produced ${stars} consecutive stars`);
    assert.ok(stars >= 1, `rating ${rating} must still render at least one star`);

    // The caption must agree with the star row — a rating of 999 must never
    // advertise "999 / 5 Stars".
    const caption = html.match(/\((\d+) \/ 5 Stars\)/);
    assert.ok(caption, `rating ${rating} must still render a rating caption`);
    const shown = Number(caption![1]);
    assert.ok(shown >= 1 && shown <= 5, `rating ${rating} rendered an out-of-range caption ${shown}`);
    assert.equal(stars, shown, `rating ${rating}: star row and caption must agree`);
    assert.equal(shown, Math.max(1, Math.min(5, rating)), `rating ${rating} was not clamped as expected`);
  }

  assert.equal(longestStarRun(renderAlert({ rating: 999 })), 5, "an oversized rating clamps to 5 stars");
  assert.equal(longestStarRun(renderAlert({ rating: 0 })), 1, "a zero rating clamps to 1 star");
  assert.equal(longestStarRun(renderAlert({ rating: -5 })), 1, "a negative rating clamps to 1 star");
});


/* -------------------------------------------------------------------------- */
/* 6. Property fuzz over the input validators                                */
/* -------------------------------------------------------------------------- */

test("slugify can never emit path separators, traversal or overlong slugs", async () => {
  const { slugify } = await import("../lib/validation");

  for (const raw of [
    "../../etc/passwd", "..%2f..%2fadmin", "/etc/passwd", "\\server\\share", "a/b", "a\\b",
    "..", "../", "a/../b", "a b c", "<script>", "';--", "`id`", "$(whoami)", "{{7*7}}",
    "CON", "NUL", "aux", "a".repeat(500), " null", "a b",
  ]) {
    const slug = slugify(raw);
    assert.match(slug, /^[a-z0-9_-]*$/, `slugify(${JSON.stringify(raw.slice(0, 30))}) emitted unsafe characters`);
    assert.ok(!slug.includes("/") && !slug.includes("\\"), `slugify(${JSON.stringify(raw.slice(0, 30))}) kept a separator`);
    assert.ok(slug.length <= 80, `slugify(${JSON.stringify(raw.slice(0, 30))}) exceeded 80 chars`);
  }

  // Legitimate input still works.
  assert.equal(slugify("  Patna Coffee House  "), "patna-coffee-house");
});

test("sanitizeEmailList keeps only real addresses and respects its cap", async () => {
  const { sanitizeEmailList } = await import("../lib/validation");
  const ADDRESS = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/;

  for (const bad of [
    "not-an-email", "a@b", "@b.com", "a@", "a b@c.com", "javascript:alert(1)@x.com",
    "<script>@x.com", "a@b.com, javascript:void(0)", "a@b.com\nc@d.com", "", "   ",
  ]) {
    for (const entry of sanitizeEmailList(bad)) {
      assert.match(entry, ADDRESS, `sanitizeEmailList kept a bad address from ${JSON.stringify(bad)}`);
    }
  }

  assert.ok(sanitizeEmailList(Array.from({ length: 50 }, (_, i) => `u${i}@x.com`).join(",")).length <= 10);
  assert.deepEqual(sanitizeEmailList("a@x.com, A@X.com"), ["a@x.com"], "entries must be deduped case-insensitively");
});

test("parseRating accepts only a strict 1-5 integer", async () => {
  const { parseRating } = await import("../lib/validation");

  // Rejected: coercion must not launder a bad type into a valid rating.
  for (const bad of [
    0, 6, -1, 2.5, NaN, Infinity, -Infinity, null, undefined, true, false, [], [3],
    {}, "0x3", "3abc", "3.0", "-3", "1e1", "", "   ",
  ]) {
    assert.equal(parseRating(bad), null, `parseRating(${String(bad)}) must be null`);
  }

  // Accepted: a real number or a plain numeric string.
  assert.equal(parseRating(3), 3);
  assert.equal(parseRating(1), 1);
  assert.equal(parseRating(5), 5);
  assert.equal(parseRating("3"), 3);
  assert.equal(parseRating(" 4 "), 4);
});

test("sanitizeTemplateSet caps hostile input without throwing", async () => {
  const { sanitizeTemplateSet } = await import("../lib/validation");

  const hostile = {
    intros: Array.from({ length: 5000 }, (_, i) => "x".repeat(5000) + i),
    highlights: "not an array",
    closers: { nope: true },
  };
  const set = sanitizeTemplateSet(hostile)!;
  assert.ok(set, "a set with at least one valid list must be returned");
  assert.ok(set.intros.length <= 60, "intros must be capped");
  assert.ok(set.intros.every((l) => l.length <= 280), "each line must be capped");

  assert.equal(sanitizeTemplateSet(null), undefined);
  assert.equal(sanitizeTemplateSet(undefined), undefined);
  assert.equal(sanitizeTemplateSet("nope"), undefined);
  assert.equal(sanitizeTemplateSet({}), undefined);
  assert.equal(sanitizeTemplateSet({ intros: [], highlights: [], closers: [] }), undefined);
});


test("The Supabase migration is ordered so it can repair a partial schema", async () => {
  // Regression guard. The migration creates tables with CREATE TABLE IF NOT
  // EXISTS, which silently skips a table that already exists. The index on
  // scan_events(timestamp) therefore failed on any database whose scan_events
  // predates that column, aborting the WHOLE migration before it reached the
  // RLS lockdown — leaving production on blanket USING (true) policies.
  const fs = await import("node:fs");
  const sql = fs.readFileSync("scripts/setup-supabase.cjs", "utf-8");

  const timestampAlter = sql.indexOf(
    "ALTER TABLE public.scan_events ADD COLUMN IF NOT EXISTS timestamp"
  );
  const timestampIndex = sql.indexOf(
    "CREATE INDEX IF NOT EXISTS idx_scan_events_timestamp"
  );
  assert.ok(timestampAlter !== -1, "the timestamp backfill ALTER is missing");
  assert.ok(timestampIndex !== -1, "the timestamp index is missing");
  assert.ok(
    timestampAlter < timestampIndex,
    "the ALTER must run before the index that depends on it"
  );

  // The same ordering rule applies to the other columns the indexes need.
  for (const [column, index] of [
    ["feedbacks ADD COLUMN IF NOT EXISTS store_id", "idx_feedbacks_store_id"],
    ["scan_events ADD COLUMN IF NOT EXISTS store_id", "idx_scan_events_store_id"],
    ["team_members ADD COLUMN IF NOT EXISTS email", "idx_team_members_email"],
  ]) {
    const alterAt = sql.indexOf(column);
    const indexAt = sql.indexOf("CREATE INDEX IF NOT EXISTS " + index);
    assert.ok(alterAt !== -1, `missing backfill: ${column}`);
    assert.ok(indexAt !== -1, `missing index: ${index}`);
    assert.ok(alterAt < indexAt, `${index} is created before its column is ensured`);
  }

  // The lockdown itself must still be present and must drop the blanket
  // policies that production currently runs.
  for (const legacy of [
    '"Allow public read stores"',
    '"Allow public insert/update stores"',
    '"Allow public feedbacks"',
    '"Allow public scan_events"',
    '"Allow public team_members"',
  ]) {
    assert.ok(
      sql.includes(`DROP POLICY IF EXISTS ${legacy}`),
      `the migration must drop the legacy blanket policy ${legacy}`
    );
  }

  // And it must create the restrictive replacements.
  for (const wanted of [
    '"Deny anon all on stores"',
    '"Deny anon all on team_members"',
    '"Public insert feedback"',
    '"Public insert scan events"',
  ]) {
    assert.ok(sql.includes(`CREATE POLICY ${wanted}`), `the migration must create ${wanted}`);
  }
});
