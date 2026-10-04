import { NextResponse } from "next/server";
import { getCouponById, getCoupons, saveCoupon } from "@/lib/billing-data";
import { normalizeCouponInput } from "@/lib/billing-validation";
import { assertSuperAdmin } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";

/**
 * Coupons.
 *
 * Platform-owner only for every method. A coupon is a discount on the
 * platform's own revenue: it is issued by support or sales, never by the
 * tenant who benefits from it. Store admins therefore cannot list codes either
 * — an enumeration endpoint would let them hunt for a valid code.
 */
export async function GET() {
  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    return NextResponse.json({ coupons: await getCoupons() });
  } catch (err) {
    console.error("Failed to load coupons", err);
    return NextResponse.json({ error: "Failed to load coupons" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = normalizeCouponInput(body, "create");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const coupon = await saveCoupon(parsed.value, auth.user?.email);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (err) {
    // A duplicate code is a user error, not a server error — surface it as 409.
    const message = err instanceof Error ? err.message : "Failed to create coupon";
    const status = /already exists/i.test(message) ? 409 : 500;
    if (status === 500) console.error("Failed to create coupon", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "A coupon id is required" }, { status: 400 });
  }

  // The code is the coupon's identity to the customer; it cannot be changed
  // after issue, so an update that carries `code` only validates it.
  const parsed = normalizeCouponInput(body, "update");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const existing = await getCouponById(body.id);
    if (!existing) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    const coupon = await saveCoupon(
      { ...parsed.value, id: body.id, code: existing.code },
      existing.createdBy || auth.user?.email
    );
    return NextResponse.json({ coupon });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update coupon";
    const status = /already exists/i.test(message) ? 409 : 500;
    if (status === 500) console.error("Failed to update coupon", err);
    return NextResponse.json({ error: message }, { status });
  }
}
