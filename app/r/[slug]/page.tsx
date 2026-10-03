import React from "react";
import { getStoreByScanKey, toPublicStore } from "@/lib/store";
import { getPublicMenu, getPublicMenuItems } from "@/lib/menu";
import CustomerScanExperience from "@/components/CustomerScanExperience";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Store as StoreIcon } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; view?: string }>;
}

export default async function CustomerScanPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { table, view } = await searchParams;

  // A database hiccup must never show a diner a crash page. Fall back to a
  // calm "try again" screen instead (never to stale or fake review content).
  let store = null;
  try {
    store = await getStoreByScanKey(slug);
  } catch (err) {
    console.error("Failed to load store for scan page", err);

    return (
      <main className="flex min-h-screen items-center justify-center bg-cream bg-neo-grid p-4">
        <div className="w-full max-w-md border-4 border-black bg-white p-8 text-center shadow-neo-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] border-black bg-neo-yellow shadow-neo-xs">
            <RefreshCw className="h-7 w-7 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wide text-black">Just a moment</h1>
          <p className="mt-2 text-sm font-bold text-black/70">
            We couldn&apos;t load this page right now. Please refresh in a few seconds.
          </p>
          <div className="mt-6">
            <Link
              href={`/r/${slug}`}
              className="inline-flex w-full items-center justify-center gap-1.5 border-4 border-black bg-black px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={3} /> Try again
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream bg-neo-grid p-4">
        <div className="w-full max-w-md border-4 border-black bg-white p-8 text-center shadow-neo-md">
          <div className="mx-auto mb-4 flex h-14 w-14 -rotate-3 items-center justify-center border-[3px] border-black bg-neo-violet shadow-neo-xs">
            <StoreIcon className="h-7 w-7 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wide text-black">Restaurant not found</h1>
          <p className="mt-2 text-sm font-bold text-black/70">
            This QR is not active or has moved. Please ask our staff for a fresh code.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={3} /> Back to Credo
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // A menu failure must not take down the review flow — degrade to "no menu
  // published" and the experience component routes straight to the review tab.
  let menu: { items: Awaited<ReturnType<typeof getPublicMenuItems>>; version: string } = {
    items: [],
    version: "",
  };
  try {
    menu = await getPublicMenu(store.id);
  } catch (err) {
    console.error("Failed to load menu for scan page", err);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream bg-neo-grid px-4 py-6 sm:py-10">
      <div className="mb-4 flex w-full max-w-md items-center justify-between px-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={3} /> Credo
        </Link>
        {table && (
          <span className="rotate-2 border-2 border-black bg-neo-yellow px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
            Table #{table}
          </span>
        )}
      </div>

      {/* Only the public projections are handed to the client: the full records
          carry the owner's inbox and phone, which must never be serialized
          into an unauthenticated page. */}
      <CustomerScanExperience
        store={toPublicStore(store)}
        initialMenuItems={menu.items}
        initialMenuVersion={menu.version}
        initialTable={table || ""}
        initialView={view === "menu" || view === "review" ? view : undefined}
      />
    </main>
  );
}
