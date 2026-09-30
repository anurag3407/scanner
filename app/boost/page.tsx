import React from "react";
import { getAllStores } from "@/lib/store";
import BoostSimulator from "@/components/BoostSimulator";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Live Review Boost Simulator | FastQR ReviewBoost",
  description: "Experience the frictionless 10-second Google review booster and reputation firewall live in action.",
};

export default async function BoostPage() {
  const stores = await getAllStores();

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-50 flex flex-col">
      {/* Top Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-50 py-3.5 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-lg text-zinc-900 tracking-tight">
            <span className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              ⚡
            </span>
            <span>ReviewBoost</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Home
            </Link>
            <Link
              href="/prospectus"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              SaaS Prospectus
            </Link>
            <Link
              href="/admin/stores"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:inline"
            >
              Standees
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-all shadow-sm"
            >
              Admin Suite
            </Link>
          </div>
        </div>
      </nav>

      {/* Simulator Content */}
      <main className="flex-1">
        <BoostSimulator initialStores={stores} />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-6 px-4 bg-white text-center text-xs text-zinc-500">
        <p>ReviewBoost SaaS Platform • Instant AI Pre-drafted Reviews &amp; Reputation Firewall</p>
      </footer>
    </div>
  );
}
