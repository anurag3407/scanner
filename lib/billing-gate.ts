/**
 * The server-side entitlement gate.
 *
 * Menu customisation is a paid capability: a location may edit its menu while
 * its subscription is in trial or active, and not after. This gate lives in the
 * route handlers, not in the console UI — a hidden button is not access
 * control, and the same API is reachable with curl.
 *
 * Reads are deliberately NOT gated. A lapsed location's public menu keeps
 * serving diners (the QR keeps working), the owner can still see their data,
 * and a super admin can still inspect it. Only the writes lock.
 */

import { NextResponse } from "next/server";
import { getStoreEntitlement } from "./billing-service";
import type { StoreEntitlement } from "./types";

/** The response body every gated route returns when the location has lapsed. */
export interface SubscriptionRequiredBody {
  error: string;
  code: "subscription_required";
  entitlement: StoreEntitlement;
}

/**
 * Returns a `402 Payment Required` response when the location may not
 * customise its menu, or `null` when the caller may proceed.
 *
 * 402 rather than 403 on purpose: the client distinguishes "you are not
 * allowed" (403, a permissions problem) from "this location has not paid"
 * (402, a billing problem the owner can fix by subscribing).
 */
export async function requireMenuEntitlement(storeId: string): Promise<NextResponse | null> {
  const entitlement = await getStoreEntitlement(storeId);
  if (entitlement.entitled) return null;

  const body: SubscriptionRequiredBody = {
    error:
      entitlement.reason ||
      "An active subscription is required to customise this location's menu.",
    code: "subscription_required",
    entitlement,
  };

  return NextResponse.json(body, { status: 402 });
}
