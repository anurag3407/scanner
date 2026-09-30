import React from "react";
import { notFound } from "next/navigation";
import { getStoreById, getAllStores } from "@/lib/store";
import PrintableStandee from "@/components/PrintableStandee";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminPrintPage({ params }: Props) {
  const { id } = await params;
  let store = await getStoreById(id);

  // If not found by ID, attempt match by slug as well
  if (!store) {
    const stores = await getAllStores();
    store = stores.find((s) => s.slug === id || s.id === id) || null;
  }

  if (!store) {
    notFound();
  }

  return <PrintableStandee store={store} />;
}
