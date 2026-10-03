import React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAnalytics, getAllStores, getStoresByIds } from "@/lib/store";
import { getSessionUser, hasStoreAccess, scopedStoreIds } from "@/lib/auth";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Review & QR Analytics | Credo Admin",
  description: "Track customer scans, chip selections, redirection conversion rates, and reputation firewall metrics from real database events.",
};

interface Props {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  await connection();

  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { storeId } = await searchParams;
  // A store admin must never be able to view another location's numbers.
  const selectedStoreId = storeId && hasStoreAccess(user, storeId) ? storeId : undefined;
  const scope = scopedStoreIds(user);

  const [analytics, stores] = await Promise.all([
    selectedStoreId
      ? getAnalytics(selectedStoreId)
      : scope === null
        ? getAnalytics()
        : getAnalytics(undefined, scope),
    scope === null ? getAllStores() : getStoresByIds(scope),
  ]);

  return (
    <AnalyticsClient
      initialAnalytics={analytics}
      stores={stores}
      selectedStoreId={selectedStoreId}
    />
  );
}
