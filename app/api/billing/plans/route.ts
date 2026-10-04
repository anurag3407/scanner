import { NextResponse } from "next/server";
import { getPlanConfigs, savePlanConfig } from "@/lib/billing-data";
import { normalizePlanInput } from "@/lib/billing-validation";
import { assertAdminAuth, assertSuperAdmin } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";

/**
 * The plan catalogue.
 *
 * READ is open to any console user — an owner must be able to see the price of
 * the plan they are being asked to buy. WRITE is platform-owner only: price is
 * the platform's revenue lever, and letting a tenant set it would let them buy
 * a ₹1 plan.
 *
 * Store admins only see plans that are on sale. A super admin sees the whole
 * table, including plans withdrawn from sale that existing subscribers are
 * still on.
 */
export async function GET() {
  const auth = await assertAdminAuth();
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    const plans = await getPlanConfigs();
    const visible = auth.user.isSuperAdmin ? plans : plans.filter((p) => p.isActive);
    return NextResponse.json({ plans: visible });
  } catch (err) {
    console.error("Failed to load plans", err);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}

/** Creates a plan. The id is the key subscriptions reference, so it is required. */
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

  const parsed = normalizePlanInput(body, "create");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const existing = await getPlanConfigs();
    if (existing.some((p) => p.id === parsed.value.id)) {
      return NextResponse.json(
        { error: `A plan with id "${parsed.value.id}" already exists` },
        { status: 409 }
      );
    }

    const plan = await savePlanConfig(parsed.value);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    console.error("Failed to create plan", err);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}

/**
 * Updates a plan. Only the supplied fields change, so editing a price cannot
 * blank the tagline or the feature list.
 *
 * A price change applies to new checkouts only — an existing subscription
 * carries the amount it was sold at, which is what "grandfathered" means.
 */
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
    return NextResponse.json({ error: "A plan id is required" }, { status: 400 });
  }

  const parsed = normalizePlanInput(body, "update");
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const existing = (await getPlanConfigs()).find((p) => p.id === parsed.value.id);
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const plan = await savePlanConfig(parsed.value);
    return NextResponse.json({ plan });
  } catch (err) {
    console.error("Failed to update plan", err);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}
