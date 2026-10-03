/**
 * Fixed-window rate limiter for the public, unauthenticated endpoints.
 *
 * `/api/events` and `/api/feedback` accept anonymous POSTs from anyone holding a
 * store's QR URL. Without a limit, one attacker can flood the telemetry table,
 * blow the Supabase row quota, and repeatedly trigger outbound Resend emails to
 * a store's owner inbox at cost.
 *
 * State is module memory: exact on a single Node process, best-effort on
 * serverless (each isolate keeps its own counters). That is enough to blunt
 * scripted abuse; for a hard global guarantee also front the Worker with a
 * Cloudflare rate-limiting rule.
 *
 * This module intentionally does NOT `import "server-only"`: the test suite
 * imports the route handlers that depend on it, and tsx resolves the real npm
 * package (which throws outside a bundler). The module holds no secrets and is
 * only ever reached from Route Handlers.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

// Cap on tracked keys so an attacker rotating spoofed IPs cannot grow the map
// without bound. When hit, expired entries are evicted first.
const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function evictIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return;
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  /** Seconds until the current window resets. */
  retryAfter: number;
}

/**
 * Consumes one token for `key` within a `windowMs` window.
 * `limit` is the maximum number of accepted requests per window.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    evictIfNeeded();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: Math.max(0, limit - 1), retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      limited: true,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return {
    limited: false,
    remaining: Math.max(0, limit - existing.count),
    retryAfter: 0,
  };
}

/**
 * Derives a stable client identity from proxy headers.
 *
 * Only `cf-connecting-ip` is trusted: Cloudflare overwrites it, so it cannot be
 * forged when the Worker is reachable only through Cloudflare.
 *
 * `x-forwarded-for` / `x-real-ip` are deliberately NOT used as bucket keys.
 * They are ordinary request headers, so a script can rotate them per request
 * and land in a fresh bucket every time — which disables rate limiting
 * completely for the public, cost-bearing endpoints. Measured: 500 requests
 * with a rotating XFF were never throttled against a 120/minute limit.
 *
 * Deployments without Cloudflare should set `RATE_LIMIT_TRUSTED_IP_HEADER` to
 * the name of a header their proxy genuinely overwrites. Without such a setting
 * every client shares the "unknown" bucket, which is safe (it throttles) but
 * blunt.
 */
export function clientIdentifier(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return `cf:${cfIp.trim()}`;

  const trustedHeader = (process.env.RATE_LIMIT_TRUSTED_IP_HEADER || "").trim();
  if (trustedHeader) {
    const value = req.headers.get(trustedHeader);
    if (value && value.trim()) return `${trustedHeader}:${value.trim()}`;
  }

  return "unknown";
}

/** Test seam: drops all counters so each test starts from a clean window. */
export function __resetRateLimits(): void {
  buckets.clear();
}
