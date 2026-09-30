import React from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getAllStores } from "@/lib/store";
import LandingPageClient from "@/components/LandingPageClient";
import { Zap, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata = {
  title: "ReviewBoost | Turn Table Diners into 5-Star Google Reviews in 10s",
  description: "AI pre-drafted reviews, interactive feature chips, 1-tap Google hand-off, and intelligent reputation firewall for restaurants and retail.",
};

export default async function HomePage() {
  await connection();

  const stores = await getAllStores();
  // The live demo widget always uses a real configured location. When none
  // exist yet the landing page shows a setup prompt instead of fake data.
  const sampleStore = stores[0] ?? null;

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-amber-200 selection:text-zinc-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight text-zinc-900">
            <span className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
              ⚡
            </span>
            <span>ReviewBoost</span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-600">
            <Link href="/boost" className="hover:text-zinc-900 transition-colors flex items-center gap-1 text-amber-600">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Live /boost Simulator</span>
            </Link>
            <Link href="/admin/stores" className="hover:text-zinc-900 transition-colors">
              Table Standees
            </Link>
            <Link href="/admin/feedback" className="hover:text-zinc-900 transition-colors">
              Firewall Shield
            </Link>
            <Link href="/prospectus" className="hover:text-zinc-900 transition-colors text-indigo-600 font-bold">
              SaaS Prospectus
            </Link>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/boost"
              className="hidden sm:inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-colors"
            >
              Simulator
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Admin Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <LandingPageClient sampleStore={sampleStore} />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-950 text-zinc-400 py-12 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-black text-base">
              <span className="w-6 h-6 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-xs">
                ⚡
              </span>
              <span>FastQR / ReviewBoost</span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              The zero-friction restaurant review generator and reputation firewall. Converting diners into Google 5-star reviews in 10 seconds.
            </p>
          </div>

          <div>
            <span className="font-bold text-white uppercase text-[11px] tracking-wider block mb-3">
              Platform
            </span>
            <ul className="space-y-2">
              <li>
                <Link href="/boost" className="hover:text-white transition-colors">
                  Interactive /boost Simulator
                </Link>
              </li>
              {stores[0] && (
                <li>
                  <Link href={`/r/${stores[0].slug}`} target="_blank" className="hover:text-white transition-colors">
                    Live Guest Scan Page
                  </Link>
                </li>
              )}
              <li>
                <Link href="/admin/stores" className="hover:text-white transition-colors">
                  4x6&quot; Table Tent Generator
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-white uppercase text-[11px] tracking-wider block mb-3">
              Management &amp; Analytics
            </span>
            <ul className="space-y-2">
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Overview Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/stores" className="hover:text-white transition-colors">
                  Multi-Location Stores
                </Link>
              </li>
              <li>
                <Link href="/admin/feedback" className="hover:text-white transition-colors">
                  Reputation Firewall Inbox
                </Link>
              </li>
              <li>
                <Link href="/admin/analytics" className="hover:text-white transition-colors">
                  Scan Telemetry &amp; Top Chips
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <span className="font-bold text-white uppercase text-[11px] tracking-wider block mb-3">
              Commercial &amp; Investors
            </span>
            <ul className="space-y-2">
              <li>
                <Link href="/prospectus" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                  SaaS Investment Prospectus
                </Link>
              </li>
              <li className="text-[11px] text-zinc-500 pt-1">
                Google compliant • Zero app download • 100% Free-Tier &amp; Gemini 2.5 Flash friendly
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[11px]">
          <p>© {new Date().getFullYear()} FastQR ReviewBoost Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Google Places Verified Deep-Linking
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
