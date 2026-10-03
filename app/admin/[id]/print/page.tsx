import React from "react";
import { notFound, redirect } from "next/navigation";
import { getStoreByScanKey } from "@/lib/store";
import { getSessionUser, hasStoreAccess } from "@/lib/auth";
import PrintableStandee from "@/components/PrintableStandee";

export const dynamic = "force-dynamic";

export default async function AdminPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Accepts either the permanent store id (preferred, what the QR encodes) or a slug.
  const store = await getStoreByScanKey(id);
  if (!store) {
    notFound();
  }

  // The standee page was previously unscoped, so any console user could render
  // (and therefore read the owner details of) a location they are not assigned
  // to by simply walking /admin/<other-store-id>/print.
  if (!hasStoreAccess(user, store.id)) {
    redirect("/admin/stores");
  }

  return <PrintableStandee store={store} />;
}
