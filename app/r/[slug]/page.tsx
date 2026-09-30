import React from "react";
import { getStoreBySlug } from "@/lib/store";
import CustomerReviewFlow from "@/components/CustomerReviewFlow";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Store as StoreIcon } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}

export default async function CustomerScanPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { table } = await searchParams;

  // A database hiccup must never show a diner a crash page. Fall back to a
  // calm "try again" screen instead (never to stale or fake review content).
  let store = null;
  try {
    store = await getStoreBySlug(slug);
  } catch (err) {
    console.error("Failed to load store for scan page", err);

    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-zinc-200 text-center shadow-lg">
          <div className="w-14 h-14 bg-zinc-100 text-zinc-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Just a moment</h1>
          <p className="text-sm text-zinc-500 mt-2">
            We couldn&apos;t load this review page right now. Please refresh in a few seconds.
          </p>
          <div className="mt-6">
            <Link
              href={`/r/${slug}`}
              className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!store) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-zinc-200 text-center shadow-lg">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <StoreIcon className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Restaurant Not Found</h1>
          <p className="text-sm text-zinc-500 mt-2">
            The QR code you scanned for &ldquo;{slug}&rdquo; is not active or has moved.
          </p>
          <div className="mt-6 space-y-2">
            <Link
              href="/boost"
              className="block w-full py-2.5 px-4 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-black transition-colors"
            >
              Try Demo Simulator
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 pt-2 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to ReviewBoost Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-100 via-zinc-50 to-zinc-100 py-6 sm:py-12 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mb-3 flex items-center justify-between text-xs text-zinc-400 px-2">
        <Link href="/" className="hover:text-zinc-700 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> FastQR ReviewBoost
        </Link>
        {table && <span className="font-mono bg-zinc-200/70 text-zinc-700 px-2 py-0.5 rounded-full">Table #{table}</span>}
      </div>

      <CustomerReviewFlow store={store} initialTable={table || ""} />
    </main>
  );
}
