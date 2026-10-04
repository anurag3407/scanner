/**
 * Razorpay — the payment gateway.
 *
 * Plain REST + HMAC rather than the vendor SDK: the only three things this app
 * needs are "create an order", "verify a checkout signature" and "verify a
 * webhook signature", and each is a handful of lines against the documented
 * API. An SDK would add a dependency that has to work on Cloudflare Workers
 * (`nodejs_compat` is enabled in wrangler.jsonc, so `node:crypto` is available)
 * for no capability we do not already have.
 *
 * Two different secrets are used and they must not be confused:
 *   - `RAZORPAY_KEY_SECRET` signs the checkout handshake
 *     (HMAC-SHA256 of "order_xxx|pay_xxx").
 *   - `RAZORPAY_WEBHOOK_SECRET` signs webhook deliveries
 *     (HMAC-SHA256 of the RAW request body).
 *
 * Every verification is constant-time (`timingSafeEqual`) and fails closed: a
 * missing secret, a missing signature or malformed input all return `false`
 * rather than throwing, because the caller must never mistake an error path for
 * a verified payment.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
const REQUEST_TIMEOUT_MS = 15_000;

/** Raised when Razorpay refuses a request. Carries the gateway's message. */
export class RazorpayError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "RazorpayError";
    this.status = status;
  }
}

export interface RazorpayOrder {
  id: string;
  /** Integer paise. Razorpay's API uses the same subunit convention we do. */
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
}

/** Razorpay's checkout `key_id`; safe to expose to the browser. */
export function getRazorpayKeyId(): string {
  return (process.env.RAZORPAY_KEY_ID || "").trim();
}

/** Server-only secret. Never send this to the client, never log it. */
function getRazorpayKeySecret(): string {
  return (process.env.RAZORPAY_KEY_SECRET || "").trim();
}

function getWebhookSecret(): string {
  return (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
}

/** True when orders can actually be created (key id + secret present). */
export function isRazorpayConfigured(): boolean {
  return Boolean(getRazorpayKeyId() && getRazorpayKeySecret());
}

/** True when webhook deliveries can be verified. */
export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(getWebhookSecret());
}

/* -------------------------------------------------------------------------- */
/* REST                                                                       */
/* -------------------------------------------------------------------------- */

type FetchLike = typeof fetch;

// Injectable seam: tests exercise the route handlers without a network by
// swapping this out. Production always uses the global fetch.
let fetchImpl: FetchLike = fetch;

/** Test seam. Pass `null` to restore the global fetch. */
export function setRazorpayFetchForTests(next: FetchLike | null): void {
  fetchImpl = next ?? fetch;
}

const toIntegerPaise = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

/**
 * Creates a Razorpay order for `amountInr` (integer paise).
 *
 * An order must exist before checkout is opened; Razorpay refuses a payment
 * without one, and the order id is the key we hang idempotency on.
 */
export async function createRazorpayOrder(input: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
  currency?: string;
}): Promise<RazorpayOrder> {
  if (!isRazorpayConfigured()) {
    throw new RazorpayError("Razorpay is not configured", 503);
  }

  const amount = toIntegerPaise(input.amountInr);
  if (amount <= 0) {
    throw new RazorpayError("An order must be for a positive amount", 400);
  }

  const credentials = Buffer.from(
    `${getRazorpayKeyId()}:${getRazorpayKeySecret()}`,
    "utf-8"
  ).toString("base64");

  let response: Response;
  try {
    response = await fetchImpl(`${RAZORPAY_API_BASE}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: input.currency || "INR",
        receipt: input.receipt,
        notes: input.notes || {},
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new RazorpayError(
      `Could not reach Razorpay: ${err instanceof Error ? err.message : "network error"}`
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | (Partial<RazorpayOrder> & { error?: { description?: string } })
    | null;

  if (!response.ok || !payload?.id) {
    throw new RazorpayError(
      payload?.error?.description || `Razorpay rejected the order (${response.status})`,
      response.status === 401 ? 502 : response.status
    );
  }

  return {
    id: String(payload.id),
    amount: toIntegerPaise(payload.amount),
    currency: String(payload.currency || "INR"),
    status: String(payload.status || "created"),
    receipt: payload.receipt ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Signature verification                                                     */
/* -------------------------------------------------------------------------- */

function safeEqual(expected: string, received: string): boolean {
  const left = Buffer.from(expected, "utf-8");
  const right = Buffer.from(received, "utf-8");
  // Length is not secret; comparing unequal buffers throws in timingSafeEqual.
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Verifies the checkout callback signature.
 *
 * The browser hands back `razorpay_payment_id` / `razorpay_order_id` /
 * `razorpay_signature`. The signature is HMAC-SHA256 of
 * `${orderId}|${paymentId}` under the key secret; anything else (a forged
 * callback, a replayed signature for a different order) is rejected.
 *
 * The optional `secret` override exists for tests only. Production always uses
 * the configured key secret.
 */
export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string = getRazorpayKeySecret()
): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqual(expected, signature.trim().toLowerCase());
}

/**
 * Verifies a webhook delivery.
 *
 * The signature covers the RAW body bytes — parsing the JSON first and
 * re-stringifying it reorders keys and changes whitespace, which silently
 * breaks verification. Callers must read `await req.text()` and pass that
 * string here before doing anything else with the payload.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string = getWebhookSecret()
): boolean {
  if (!rawBody || !signatureHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf-8").digest("hex");
  return safeEqual(expected, signatureHeader.trim().toLowerCase());
}
