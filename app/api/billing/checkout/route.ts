import { NextResponse } from "next/server";
import { BillingError, startCheckout } from "@/lib/billing-service";
import { normalizeCheckoutInput } from "@/lib/billing-validation";
import { assertStoreAccess } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";
import { clientIdentifier, rateLimit } from "@/lib/rate-limit";

/**
 * Starts a subscription checkout for one location.
 *
 * The amount is computed server-side from the stored plan and coupon rows —
 * the client sends `storeId`, `planId` and an optional coupon code, and never
 * an amount. A client-supplied price would be a self-service discount.
 */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  // Bound order creation: each call writes a payment row and (usually) a
  // Razorpay order, so it is a write surface, not a read.
  const limiter = rateLimit(`billing-checkout:${clientIdentifier(req)}`, 20, 60_000);
  if (limiter.limited) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = normalizeCheckoutInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Authorize the location BEFORE any billing work: a store admin may only
  // subscribe a location they are assigned to.
  const auth = await assertStoreAccess(parsed.storeId);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const checkout = await startCheckout({
      storeId: parsed.storeId,
      planId: parsed.planId,
      couponCode: parsed.couponCode,
      gstin: parsed.gstin,
      actor: auth.user?.email,
    });

    return NextResponse.json(
      { checkout },
      { status: checkout.kind === "activated" ? 201 : 200 }
    );
  } catch (err) {
    if (err instanceof BillingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Checkout failed", err);
    return NextResponse.json(
      { error: "Could not start the checkout. Please try again." },
      { status: 502 }
    );
  }
}
