import React from "react";
import { connection } from "next/server";
import { getAllStores } from "@/lib/store";
import LandingPageClient from "@/components/LandingPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ReviewBoost | Turn Table Diners into 5-Star Google Reviews in 10s",
  description:
    "Zero-friction 5-star Google Review engine, interactive feature chips, 1-tap Google hand-off, and intelligent reputation firewall for restaurants.",
};

export default async function HomePage() {
  await connection();

  let stores: Awaited<ReturnType<typeof getAllStores>> = [];
  try {
    stores = await getAllStores();
  } catch (err) {
    console.error("Landing page could not load stores", err);
  }

  // Feature CSB NIT Patna Bihta or first store
  const sampleStore =
    stores.find((s) => s.slug === "csb-nit-patna-bihta") ||
    stores[0] ||
    null;

  return (
    <main className="min-h-screen bg-cream text-black">
      <LandingPageClient
        sampleStore={sampleStore}
        totalStoresCount={stores.length || 103}
      />
    </main>
  );
}
