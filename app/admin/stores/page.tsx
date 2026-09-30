import React from "react";
import { connection } from "next/server";
import { getAllStores } from "@/lib/store";
import StoreManagementClient from "@/components/StoreManagementClient";

export const metadata = {
  title: "Restaurant Locations & Standees | ReviewBoost Admin",
  description: "Manage dining locations, customize chips, and print 4x6 table tents.",
};

export default async function StoresPage() {
  await connection();

  const stores = await getAllStores();

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full">
      <StoreManagementClient initialStores={stores} />
    </main>
  );
}
