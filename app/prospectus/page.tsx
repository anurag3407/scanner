import React from "react";
import ProspectusClient from "@/components/ProspectusClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "SaaS Investment & Pitch Prospectus | Credo",
  description: "Institutional B2B SaaS prospectus: unit economics, TAM, restaurant ROI, viral QR loop, and market valuation.",
};

export default function PublicProspectusPage() {
  return (
    <div className="min-h-screen bg-cream bg-neo-grid flex flex-col font-sans text-black print:bg-white">
      {/* Top Navbar */}
      <nav className="w-full border-b-4 border-black bg-white sticky top-0 z-50 py-3.5 px-4 sm:px-8 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-lg text-zinc-900 tracking-tight">
            <span className="w-8 h-8 border-[3px] border-black bg-neo-yellow text-black flex items-center justify-center font-black text-sm shadow-neo-xs">
              ⚡
            </span>
            <span>Credo</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Home
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
      <footer className="border-t-[3px] border-black py-6 px-4 bg-white text-center text-xs font-black uppercase tracking-widest text-black/60 print:hidden">
        <p>Credo SaaS Platform • Confidential Investment Prospectus &amp; Enterprise Overview</p>
      </footer>
    </div>
  );
}
