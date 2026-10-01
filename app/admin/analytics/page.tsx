import React from "react";
import { connection } from "next/server";
import { getAnalytics, getAllStores } from "@/lib/store";
import AnalyticsClient from "./AnalyticsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Review & QR Analytics | ReviewBoost Admin",
  description: "Track customer scans, chip selections, redirection conversion rates, and reputation firewall metrics from real database events.",
};

interface Props {
  searchParams: Promise<{ storeId?: string }>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  await connection();
  const { storeId } = await searchParams;

  const [analytics, stores] = await Promise.all([
    getAnalytics(storeId),
    getAllStores(),
  ]);

  return (
    <AnalyticsClient
      initialAnalytics={analytics}
      stores={stores}
      selectedStoreId={storeId}
    />
  );
}
