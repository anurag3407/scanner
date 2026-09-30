import React from "react";
import { notFound } from "next/navigation";
import { getStoreById, getAllStores } from "@/lib/store";
import PrintableStandee from "@/components/PrintableStandee";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStorePrintPage({ params }: Props) {
  const { id } = await params;
  let store = await getStoreById(id);

  if (!store) {
    const stores = await getAllStores();
    store = stores.find((s) => s.slug === id || s.id === id) || null;
  }

  if (!store) {
    notFound();
  }

  return <PrintableStandee store={store} />;
}
