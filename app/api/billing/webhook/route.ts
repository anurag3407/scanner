import { NextResponse } from "next/server";
import { confirmPayment, failPayment } from "@/lib/billing-service";
import { isRazorpayWebhookConfigured, verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook — the source of truth for "the money actually moved".
 *
 * Razorpay calls this endpoint unauthenticated (it cannot present a Clerk
 * session), so the ONLY gate is the HMAC signature over the raw request body.
 * It is deliberately excluded from the Clerk-protected API list in proxy.ts.
 *
 * Two rules make this safe:
 *   1. The signature is verified over the RAW body. Parsing first and
 *      re-serializing changes key order and whitespace and would break
 *      verification — so `req.text()` comes first, always.
 *   2. Delivery is at-least-once and out of order. Every handler below is
 *      idempotent through `confirmPayment`, which converges on the period end
 *      recorded when the order was created.
 *
 * Access is granted only on `payment.captured` / `order.paid` — an
 * authorization alone is not money in the bank.
 */

const MAX_SIGNATURE_HEADER = 256;

interface RazorpayWebhookPayload {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        error_description?: string;
      };
    };
    order?: { entity?: { id?: string } };
  };
}

export async function POST(req: Request) {
  if (!isRazorpayWebhookConfigured()) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = (req.headers.get("x-razorpay-signature") || "").slice(0, MAX_SIGNATURE_HEADER);

  if (!verifyWebhookSignature(rawBody, signature)) {
    // Do not log the body: it contains payment ids and customer contact data.
    console.warn("Rejected a Razorpay webhook with an invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    // A signed body that is not JSON cannot be fixed by a retry.
    console.warn("Razorpay webhook carried unparseable JSON");
    return NextResponse.json({ received: true });
  }

  const event = payload.event || "";
  const payment = payload.payload?.payment?.entity;
  const orderId = payment?.order_id || payload.payload?.order?.entity?.id || "";

  try {
    if ((event === "payment.captured" || event === "order.paid") && orderId) {
      const result = await confirmPayment({
        orderId,
        paymentId: payment?.id,
        signatureVerified: true,
        via: "webhook",
      });

      // An unknown order is not an error: the webhook may be shared with a
      // staging environment. Acknowledge so Razorpay stops retrying.
      if (!result.payment) {
        console.warn(`Razorpay webhook referenced an unknown order (${event})`);
      }
      return NextResponse.json({ received: true });
    }

    if (event === "payment.failed" && orderId) {
      await failPayment(orderId, payment?.error_description || "payment failed");
      return NextResponse.json({ received: true });
    }

    // payment.authorized, refunds, settlements, ... are acknowledged without
    // action. Authorization is not capture, and refund handling is a manual,
    // reconciling operation — never a reason to revoke access silently.
    return NextResponse.json({ received: true, ignored: event || "unknown" });
  } catch (err) {
    // A transient storage failure must be retried by Razorpay, so this is the
    // one case that returns a non-2xx.
    console.error("Failed to apply a Razorpay webhook", err);
    return NextResponse.json({ error: "Temporary failure" }, { status: 500 });
  }
}
