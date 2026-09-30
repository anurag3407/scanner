import React from "react";
import { connection } from "next/server";
import { getAllStores } from "@/lib/store";
import LandingPageClient from "@/components/LandingPageClient";

export const metadata = {
  title: "ReviewBoost | Turn Table Diners into 5-Star Google Reviews in 10s",
  description:
    "Zero-friction 5-star Google Review engine, interactive feature chips, 1-tap Google hand-off, and intelligent reputation firewall for restaurants.",
};

export default async function HomePage() {
  await connection();

  // The marketing site stays up even if the database is unreachable
  let stores: Awaited<ReturnType<typeof getAllStores>> = [];
  try {
    stores = await getAllStores();
  } catch (err) {
    console.error("Landing page could not load stores", err);
  }
  const sampleStore = stores[0] ?? null;

  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white">
      <LandingPageClient sampleStore={sampleStore} />
    </main>
  );
}
