import React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAllStores, getStoresByIds, getRevenueSummary, getSubscriptions } from "@/lib/store";
import { getPlanConfigs } from "@/lib/billing-data";
import { getSessionUser, scopedStoreIds } from "@/lib/auth";
import { isValidGstin } from "@/lib/validation";
import RevenueClient from "@/components/RevenueClient";

export const metadata = { title: "Revenue & Billing | Credo Admin" };

export default async function AdminRevenuePage() {
  await connection();

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  // Same scoping as every other console read: a store admin only ever sees
  // revenue for the locations assigned to them.
  const scope = scopedStoreIds(user);

  const [stores, summary, subscriptions, plans] = await Promise.all([
    scope === null ? getAllStores() : getStoresByIds(scope),
    getRevenueSummary(scope),
    getSubscriptions(scope),
    // The catalogue the amounts in the form are read from, so a price changed
    // in /admin/billing cannot be contradicted by what an operator records.
    getPlanConfigs(),
  ]);

  // Surfaced here so an operator learns about it BEFORE clicking Invoice and
  // hitting a 503. Reading the env var server-side keeps the value off the client.
  const supplierConfigured = isValidGstin(process.env.SUPPLIER_GSTIN || "");

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-6 sm:p-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-black uppercase tracking-tight text-black sm:text-4xl">
          Revenue &amp; Billing
        </h1>
        <p className="max-w-2xl text-sm font-bold text-black/60">
          Every rupee here comes from a recorded payment — nothing is estimated. Record
          a transfer below once a restaurant pays; the tax invoice is generated from
          the same record.
        </p>
      </div>

      <RevenueClient
        stores={stores.map((s) => ({ id: s.id, name: s.name, address: s.address }))}
        initialSubscriptions={subscriptions}
        initialSummary={summary}
        isSuperAdmin={user.isSuperAdmin}
        supplierGstinConfigured={supplierConfigured}
        plans={plans}
      />
    </main>
  );
}
