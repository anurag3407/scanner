import React from "react";
import ProspectusClient from "@/components/ProspectusClient";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

export const metadata = {
  title: "SaaS Investment & Pitch Prospectus | ReviewBoost",
  description: "Institutional B2B SaaS prospectus: unit economics, TAM, restaurant ROI, viral QR loop, and market valuation.",
};

export default function PublicProspectusPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans text-zinc-900 print:bg-white">
      {/* Top Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-50 py-3.5 px-4 sm:px-8 print:hidden">
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
              href="/boost"
              className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Live /boost</span>
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

      {/* Main Prospectus Body */}
      <main className="flex-1 print:p-0">
        <ProspectusClient />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-6 px-4 bg-white text-center text-xs text-zinc-500 print:hidden">
        <p>ReviewBoost SaaS Platform • Confidential Investment Prospectus &amp; Enterprise Overview</p>
      </footer>
    </div>
  );
}
