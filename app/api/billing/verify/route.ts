import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/billing-service";
import { getPaymentByOrder } from "@/lib/billing-data";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { assertStoreAccess } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";
import { clientIdentifier, rateLimit } from "@/lib/rate-limit";

const MAX_FIELD = 128;

/**
 * Confirms a checkout the browser just completed.
 *
 * The browser is untrusted here: it hands back `razorpay_payment_id` /
 * `razorpay_order_id` / `razorpay_signature`, and the ONLY thing that makes
 * those trustworthy is the HMAC. Nothing is activated until the signature
 * verifies under the key secret. The webhook is a second, independent path to
 * the same state (`confirmPayment` is idempotent), so a browser that closes
 * before this call still activates the subscription.
 *
 * The store is resolved from the STORED payment row, never from the request, so
 * a caller cannot nominate a location they do not own.
 */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const limiter = rateLimit(`billing-verify:${clientIdentifier(req)}`, 30, 60_000);
  if (limiter.limited) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const readField = (value: unknown): string =>
    typeof value === "string" ? value.trim().slice(0, MAX_FIELD) : "";

  const orderId = readField(body.razorpay_order_id ?? body.orderId);
  const paymentId = readField(body.razorpay_payment_id ?? body.paymentId);
  const signature = readField(body.razorpay_signature ?? body.signature);

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json(
      { error: "orderId, paymentId and signature are required" },
      { status: 400 }
    );
  }

  // Fail closed: a bad (or replayed-for-another-order) signature must not
  // touch a payment row.
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
    return NextResponse.json({ error: "Payment signature verification failed" }, { status: 400 });
  }

  try {
    const payment = await getPaymentByOrder(orderId);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const auth = await assertStoreAccess(payment.storeId);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const result = await confirmPayment({
      orderId,
      paymentId,
      signatureVerified: true,
      via: "checkout",
    });

    return NextResponse.json({
      payment: result.payment,
      subscription: result.subscription,
      entitlement: result.entitlement,
    });
  } catch (err) {
    console.error("Payment verification failed", err);
    return NextResponse.json(
      {
        error:
          "Your payment went through but could not be recorded yet. It will be applied automatically — contact support if it does not appear shortly.",
      },
      { status: 500 }
    );
  }
}
