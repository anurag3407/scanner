import React from "react";
import { notFound, redirect } from "next/navigation";
import { getStoreByScanKey } from "@/lib/store";
import { getSessionUser, hasStoreAccess } from "@/lib/auth";
import PrintableStandee from "@/components/PrintableStandee";

export const dynamic = "force-dynamic";

export default async function AdminStorePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const store = await getStoreByScanKey(id);
  if (!store) {
    notFound();
  }

  // Scope the standee to the caller's assignments (see app/admin/[id]/print).
  if (!hasStoreAccess(user, store.id)) {
    redirect("/admin/stores");
  }

  return <PrintableStandee store={store} />;
}
