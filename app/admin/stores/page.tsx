import React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAllStores, getStoresByIds } from "@/lib/store";
import { getSessionUser, scopedStoreIds } from "@/lib/auth";
import StoreManagementClient from "@/components/StoreManagementClient";

export const metadata = {
  title: "Restaurant Locations & Standees | Credo Admin",
  description: "Manage dining locations, customize chips, and print 4x6 table tents.",
};

export default async function StoresPage() {
  await connection();

  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const scope = scopedStoreIds(user);
  const stores = scope === null ? await getAllStores() : await getStoresByIds(scope);

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full">
      <StoreManagementClient initialStores={stores} isSuperAdmin={user.isSuperAdmin} />
    </main>
  );
}
