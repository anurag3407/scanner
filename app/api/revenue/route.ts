import { NextResponse } from "next/server";
import { getRevenueSummary, getSubscriptions } from "@/lib/store";
import { addPeriod } from "@/lib/billing";
import { DEFAULT_TRIAL_MINUTES } from "@/lib/plans";
import { assertAdminAuth, assertSuperAdmin, scopedStoreIds } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/csrf";
import { normalizeSubscriptionInput } from "@/lib/validation";

/**
 * Recurring revenue, derived from live subscriptions.
 *
 * This is the first endpoint where the numbers come from recorded payments
 * rather than a hardcoded slider. Until now MRR, churn and plan mix were
 * undefined, because no payment was ever written down.
 */
export async function GET() {
  const auth = await assertAdminAuth();
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
  }

  try {
    // Scoped exactly like every other console read: a store admin can never
    // widen their own view by calling this directly.
    const scope = scopedStoreIds(auth.user);
    const summary = await getRevenueSummary(scope);
    const subscriptions = await getSubscriptions(scope);
    return NextResponse.json({ summary, subscriptions });
  } catch (err) {
    console.error("Failed to load revenue summary", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Records a subscription by hand.
 *
 * There is no payment gateway yet (see REVENUE-GAPS.md, Gap 1), so the founder
 * receives a UPI or bank transfer and records it here. That is deliberately
 * enough to make revenue real today; a gateway later writes to the same table.
 *
 * PLATFORM-OWNER ONLY, deliberately. The UI hides the form from store admins,
 * but hiding a control is not access control: without this gate any store admin
 * could POST their own subscription to MRR. Billing is the platform's revenue
 * ledger, so it follows the same rule as creating and deleting locations.
 *
 * A store admin may still READ their own revenue (GET is scoped), which is what
 * makes the number on their dashboard meaningful without letting them write it.
 */
export async function POST(req: Request) {
  // Cookie-authenticated mutation: reject cross-site callers outright.
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
  }

  // Billing writes are platform-owner only, matching location creation.
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

  const normalized = normalizeSubscriptionInput(body);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  // A super admin owns every location, so the per-store scope check that
  // guards a store admin is unnecessary here: `null` means "no filter".
  const scope = null;

  // Entitlement is derived from the clock, so a record needs a real window.
  // "Payment received today" means one paid period from today; without this a
  // hand-recorded subscription would read as expired the instant it was saved
  // and lock the location's menu.
  const now = new Date();
  const record = {
    ...normalized.value,
    currentPeriodEnd:
      normalized.value.status === "active" || normalized.value.status === "paused"
        ? normalized.value.currentPeriodEnd ||
          addPeriod(now, normalized.value.billingPeriod).toISOString()
        : normalized.value.currentPeriodEnd,
    trialStartedAt:
      normalized.value.status === "trial"
        ? normalized.value.trialStartedAt || now.toISOString()
        : normalized.value.trialStartedAt,
    trialMinutes:
      normalized.value.status === "trial"
        ? normalized.value.trialMinutes ?? DEFAULT_TRIAL_MINUTES
        : normalized.value.trialMinutes,
  };

  try {
    const { upsertSubscription } = await import("@/lib/store");
    const subscription = await upsertSubscription(record);
    const summary = await getRevenueSummary(scope);
    return NextResponse.json({ subscription, summary }, { status: 201 });
  } catch (err) {
    console.error("Failed to save subscription", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
