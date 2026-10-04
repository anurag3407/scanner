import React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAllStores, getStoresByIds } from "@/lib/store";
import { getCoupons, getPlanConfigs } from "@/lib/billing-data";
import { getSessionUser, scopedStoreIds } from "@/lib/auth";
import { isRazorpayConfigured, isRazorpayWebhookConfigured } from "@/lib/razorpay";
import BillingClient from "@/components/BillingClient";

export const metadata = { title: "Billing & Plans | Credo Admin" };

/**
 * The billing console.
 *
 * Three jobs, all in one place because they are the same decision from three
 * sides:
 *   - a tenant subscribes, renews or sees why their menu is locked;
 *   - the platform owner sets the price of what is sold (at runtime, not on a
 *     deploy) and issues coupons;
 *   - the platform owner grants a trial or ends a subscription.
 *
 * Reads are scoped exactly like the rest of the console: a store admin only
 * ever sees the locations assigned to them, and only the platform owner sees
 * coupons at all.
 */
export default async function AdminBillingPage() {
  await connection();

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const scope = scopedStoreIds(user);
  const stores = scope === null ? await getAllStores() : await getStoresByIds(scope);

  const [plans, coupons] = await Promise.all([
    getPlanConfigs(),
    user.isSuperAdmin ? getCoupons() : Promise.resolve([]),
  ]);

  return (
    <BillingClient
      locations={stores.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      plans={plans}
      coupons={coupons}
      isSuperAdmin={user.isSuperAdmin}
      // Booleans, never the secrets: the browser needs to know whether online
      // payment will work, not the key that makes it work.
      gatewayConfigured={isRazorpayConfigured()}
      webhookConfigured={isRazorpayWebhookConfigured()}
    />
  );
}