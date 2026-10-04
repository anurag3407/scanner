import { NextResponse } from "next/server";
import {
  beginTrial,
  cancelStoreSubscription,
  getStoreEntitlement,
  getStoreSubscription,
  listPaymentsForStore,
} from "@/lib/billing-service";
import { isStoreId, normalizeTrialMinutes } from "@/lib/billing-validation";
import { assertAdminAuth, assertStoreAccess, assertSuperAdmin } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";
import { clientIdentifier, rateLimit } from "@/lib/rate-limit";

/**
 * One location's billing state: the stored subscription, the derived
 * entitlement (what it may do right now) and its payment history.
 *
 * Read is scoped exactly like every other console read — `assertStoreAccess`
 * plus the billing service reading the row for that store, so a store admin
 * cannot widen their view by passing another location's id.
 */
export async function GET(req: Request) {
  const auth = await assertAdminAuth();
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  const storeId = new URL(req.url).searchParams.get("storeId") || "";
  if (!isStoreId(storeId)) {
    return NextResponse.json({ error: "A valid storeId is required" }, { status: 400 });
  }

  const access = await assertStoreAccess(storeId);
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status || 401 });
  }

  try {
    const [subscription, entitlement, payments] = await Promise.all([
      getStoreSubscription(storeId),
      getStoreEntitlement(storeId),
      listPaymentsForStore(storeId),
    ]);

    return NextResponse.json({ subscription, entitlement, payments });
  } catch (err) {
    console.error("Failed to load subscription", err);
    return NextResponse.json({ error: "Failed to load subscription" }, { status: 500 });
  }
}

/**
 * Platform-owner actions on a location's billing:
 *   - `start_trial` (re)starts the free trial, with an optional length in minutes.
 *   - `cancel`      ends the subscription and records the churn.
 *
 * Both are super-admin only. A tenant can buy access, but only the platform can
 * grant free access or end the record — otherwise a store admin could mint
 * themselves an unlimited trial.
 */
export async function PATCH(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  const limiter = rateLimit(`billing-subscription:${clientIdentifier(req)}`, 30, 60_000);
  if (limiter.limited) {
    return NextResponse.json(
      { error: "Too many billing updates. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limiter.retryAfter) } }
    );
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

  if (!isStoreId(body.storeId)) {
    return NextResponse.json({ error: "A valid storeId is required" }, { status: 400 });
  }
  const storeId = body.storeId;

  try {
    if (body.action === "start_trial") {
      const parsed = normalizeTrialMinutes(body.trialMinutes ?? undefined);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const subscription = await beginTrial(storeId, parsed.trialMinutes);
      return NextResponse.json({
        subscription,
        entitlement: await getStoreEntitlement(storeId),
      });
    }

    if (body.action === "cancel") {
      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim().slice(0, 200)
          : "cancelled by platform owner";
      const subscription = await cancelStoreSubscription(storeId, reason);
      if (!subscription) {
        return NextResponse.json({ error: "No subscription to cancel" }, { status: 404 });
      }
      return NextResponse.json({
        subscription,
        entitlement: await getStoreEntitlement(storeId),
      });
    }

    return NextResponse.json(
      { error: "action must be start_trial or cancel" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Failed to update subscription", err);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
