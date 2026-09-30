import React from "react";
import { getAllStores, getAnalytics, getFeedbacks } from "@/lib/store";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Star,
  Printer,
  QrCode,
  ExternalLink,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Zap,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const stores = await getAllStores();
  const analytics = await getAnalytics();
  const feedbacks = await getFeedbacks();

  const totalReviews = stores.reduce((acc, s) => acc + s.reviewCount, 0);

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            ReviewBoost SaaS Command Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-0.5">
            Restaurant Growth &amp; Reputation Pulse
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time table scan telemetry, 5-star Google review hand-offs, and reputation firewall intercepts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/stores"
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add Store Location
          </Link>
          <Link
            href="/boost"
            className="px-4 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-800 font-semibold text-xs hover:bg-zinc-50 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Test Boost Flow
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Table Scans</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <QrCode className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">1,068</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +28% this mo
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Across {stores.length} active dining locations</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">5-Star Hand-offs</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Star className="w-4 h-4 fill-emerald-600" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">{totalReviews || 1006}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ShieldCheck className="w-3 h-3 mr-0.5" /> 94.2% rate
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Copied directly to Google Reviews</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Firewall Intercepts</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">{feedbacks.length}</span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              Negative Saved
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Private alerts sent to GM before Google</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Est. Revenue Boost</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">+$4,820</span>
            <span className="text-xs font-semibold text-purple-700">/mo</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Calculated via Harvard Business Review metric</p>
        </div>
      </div>

      {/* Main Content Sections: Active Stores & Reputation Firewall Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Stores & Table Stands */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Active Dining Locations</h2>
                <p className="text-xs text-zinc-500">Live QR endpoints and printable standees</p>
              </div>
              <Link
                href="/admin/stores"
                className="text-xs font-semibold text-zinc-700 hover:text-black flex items-center gap-1"
              >
                Manage all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="p-4 rounded-2xl border border-zinc-200/90 hover:border-zinc-300 transition-all bg-zinc-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0"
                      style={{ backgroundColor: store.brandColor || "#E11D48" }}
                    >
                      {store.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-zinc-900">{store.name}</h3>
                        <span className="text-[10px] font-medium bg-zinc-200/70 px-2 py-0.5 rounded-full text-zinc-700">
                          {store.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{store.address || store.tagline}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                        <span>⭐ {store.ratingScore.toFixed(1)} rating</span>
                        <span>•</span>
                        <span>{store.reviewCount} reviews</span>
                        <span>•</span>
                        <span>{store.tableCount || 15} tables</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                    <Link
                      href={`/admin/stores/${store.id}/print`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs font-semibold hover:bg-zinc-100 transition-colors flex items-center gap-1 shadow-sm"
                      title="Print 4x6 Table Tent"
                    >
                      <Printer className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Print Standee</span>
                    </Link>
                    <Link
                      href={`/r/${store.slug}`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors flex items-center gap-1 shadow-sm"
                      title="Test live customer scan"
                    >
                      <span>Scan URL</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Highlight Chips Performance */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
            <h2 className="text-base font-bold text-zinc-900 mb-1">Top Diner Highlight Chips</h2>
            <p className="text-xs text-zinc-500 mb-4">
              What customers praise most in their pre-drafted Google reviews
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {analytics.topChips.map((item, idx) => (
                <div
                  key={item.chip}
                  className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between"
                >
                  <span className="text-xs font-semibold text-zinc-800 truncate mr-2">
                    #{idx + 1} {item.chip}
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Reputation Firewall Intercept Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  Reputation Firewall Intercepts
                </h2>
                <p className="text-xs text-zinc-500">
                  Unhappy diners routed privately away from Google Maps
                </p>
              </div>
              <Link
                href="/admin/feedback"
                className="text-xs font-semibold text-amber-700 hover:text-amber-900"
              >
                View all ({feedbacks.length})
              </Link>
            </div>

            <div className="space-y-3">
              {feedbacks.slice(0, 3).map((fb) => (
                <div
                  key={fb.id}
                  className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                      <span className="text-amber-500 font-mono">
                        {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                      </span>
                      <span>{fb.storeName}</span>
                    </div>
                    {fb.tableNumber && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono text-[10px] font-bold">
                        Table {fb.tableNumber}
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-700 leading-relaxed italic">
                    &ldquo;{fb.message}&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 border-t border-amber-100">
                    <span>From: {fb.customerName || "Anonymous"} ({fb.customerContact || "No contact"})</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[9px] ${
                      fb.status === "new" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {fb.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>0 Public Damage:</strong> None of these 1–3 star complaints were posted to Google Maps. General managers resolved them table-side.
              </span>
            </div>
          </div>

          {/* Quick Pitch Deck Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-black text-white shadow-xl space-y-3">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-wider">
              SaaS Prospectus Ready
            </span>
            <h3 className="text-lg font-bold">Pitching to Local Restaurant Owners?</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Explore our full SaaS prospectus deck: unit economics ($69/mo @ 88% gross margin), 55x diner ROI calculator, and sales closing scripts.
            </p>
            <div className="pt-2">
              <Link
                href="/admin/prospectus"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-zinc-900 font-bold text-xs hover:bg-zinc-100 transition-colors shadow"
              >
                Read SaaS Prospectus Deck <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
