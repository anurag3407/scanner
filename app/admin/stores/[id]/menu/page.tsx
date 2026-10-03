import React from "react";
import { notFound, redirect } from "next/navigation";
import { getStoreByScanKey } from "@/lib/store";
import { getMenuItems } from "@/lib/menu";
import { MenuItem } from "@/lib/types";
import { getSessionUser, hasStoreAccess } from "@/lib/auth";
import MenuManagerClient from "@/components/MenuManagerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Menu | Credo Scanner",
  description: "Update your digital menu in real time — same QR, zero reprints.",
};

export default async function AdminStoreMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const store = await getStoreByScanKey(id);
  if (!store) {
    notFound();
  }

  // Store admins may only manage menus of their assigned locations.
  if (!hasStoreAccess(user, store.id)) {
    redirect("/admin/stores");
  }

  let items: MenuItem[] = [];
  try {
    items = await getMenuItems(store.id);
  } catch (err) {
    console.error("Failed to load menu for admin page", err);
    // Rendered as an inline error state by the client component.
    items = [];
  }

  return <MenuManagerClient store={store} initialItems={items} />;
}
