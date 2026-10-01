import React from "react";
import { notFound } from "next/navigation";
import { getStoreByScanKey } from "@/lib/store";
import PrintableStandee from "@/components/PrintableStandee";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStorePrintPage({ params }: Props) {
  const { id } = await params;
  const store = await getStoreByScanKey(id);

  if (!store) {
    notFound();
  }

  return <PrintableStandee store={store} />;
}
