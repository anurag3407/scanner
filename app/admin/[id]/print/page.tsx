import React from "react";
import { notFound } from "next/navigation";
import { getStoreByScanKey } from "@/lib/store";
import PrintableStandee from "@/components/PrintableStandee";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminPrintPage({ params }: Props) {
  const { id } = await params;
  // Accepts either the permanent store id (preferred, what the QR encodes) or a slug.
  const store = await getStoreByScanKey(id);

  if (!store) {
    notFound();
  }

  return <PrintableStandee store={store} />;
}
