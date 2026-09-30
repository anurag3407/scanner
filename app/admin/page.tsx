import React from "react";
import { connection } from "next/server";
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
  Mail,
  MapPin,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";

export default async function AdminOverviewPage() {
  await connection();

  const [stores, analytics, feedbacks] = await Promise.all([
    getAllStores(),
    getAnalytics(),
    getFeedbacks(),
  ]);

  const recentFeedbacks = feedbacks.slice(0, 5);

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 sm:p-8 rounded-3xl text-white shadow-md border border-zinc-700/50">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-amber-300 backdrop-blur-sm border border-white/10">
            <Sparkles className="w-3.5 h-3.5" /> Offline QR Agency Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Restaurant Standees &amp; Reviews
          </h1>
          <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
            Configure restaurant dishes, generate single 1-year QR table standees, and protect client reputations with instant Resend email alerts on low ratings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/stores"
            className="px-5 py-3 rounded-2xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-100 transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add Restaurant
          </Link>
          <Link
            href="/boost"
            className="px-4 py-3 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-zinc-200 font-semibold text-xs hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <QrCode className="w-4 h-4 text-amber-400" /> Interactive Demo
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Restaurants</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <QrCode className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">{stores.length}</span>
            <span className="text-xs text-zinc-500 font-medium">Active Outlets</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Live table standees deployed</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Scans</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">{analytics.totalScans}</span>
            <span className="text-xs text-zinc-500 font-medium">Diner Scans</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Physical table camera scans</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">5★ Google Copies</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Star className="w-4 h-4 fill-emerald-600" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">{analytics.positiveRedirections}</span>
            <span className="text-xs text-emerald-600 font-semibold">{analytics.redirectionRate}% sent to Google</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Verified positive review drafts</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Low Ratings Caught</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900">{feedbacks.length}</span>
            <span className="text-xs text-rose-600 font-semibold">Firewall Intercepts</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Emailed to owners via Resend</p>
        </div>
      </div>

      {/* Active Restaurants List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Your Active Restaurants &amp; Cafes</h2>
            <p className="text-xs text-zinc-500">
              Each store has a single permanent QR code you can print and sell offline.
            </p>
          </div>
          <Link
            href="/admin/stores"
            className="text-xs font-semibold text-zinc-700 hover:text-black flex items-center gap-1"
          >
            Manage All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stores.length === 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto text-2xl">
              🏪
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-bold text-zinc-900">No restaurants added yet</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Add your first client to generate their 1-year table standee and configure their dish chips.
              </p>
            </div>
            <Link
              href="/admin/stores"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Restaurant Location
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stores.map((store) => (
              <div
                key={store.id}
                className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0"
                        style={{ backgroundColor: store.brandColor || "#0d9488" }}
                      >
                        {store.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 text-base">{store.name}</h3>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                            {store.category}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{store.tagline || store.category}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-semibold shrink-0">
                      /r/{store.slug}
                    </span>
                  </div>

                  {/* Owner Alert Gmail badge */}
                  <div className="mt-4 p-3 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Owner Gmail: <strong className="text-zinc-900">{store.managerEmail || "Not configured"}</strong></span>
                    </div>
                    {store.address && (
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="truncate">{store.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Highlight Chips */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Diner Highlight Chips ({store.chips.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {store.chips.slice(0, 4).map((chip) => (
                        <span
                          key={chip}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-medium"
                        >
                          {chip}
                        </span>
                      ))}
                      {store.chips.length > 4 && (
                        <span className="text-[11px] px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500">
                          +{store.chips.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/stores/${store.id}/print`}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Print Standee QR</span>
                  </Link>

                  <Link
                    href={`/r/${store.slug}`}
                    target="_blank"
                    className="py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Test Scan</span>
                    <ExternalLink className="w-3 h-3 text-zinc-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Low-Rating Complaints (Firewall Inbox) */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                Recent Intercepted Low Ratings (1-3 Stars)
              </h2>
              <p className="text-xs text-zinc-500">
                These complaints were caught before reaching Google Maps and dispatched via Resend email to the owner.
              </p>
            </div>
          </div>
          <Link
            href="/admin/feedback"
            className="text-xs font-semibold text-zinc-600 hover:text-black flex items-center gap-1"
          >
            View All ({feedbacks.length})
          </Link>
        </div>

        {recentFeedbacks.length === 0 ? (
          <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-xs text-zinc-500">
            🛡️ Zero negative reviews reported yet. All diner ratings have been 4 or 5 stars!
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {recentFeedbacks.map((fb) => (
              <div key={fb.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 text-xs">{fb.storeName}</span>
                    <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                      {fb.rating}★ Rating
                    </span>
                    {fb.tableNumber && (
                      <span className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                        Table #{fb.tableNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 line-clamp-1 italic">&ldquo;{fb.message}&rdquo;</p>
                  <div className="text-[11px] text-zinc-400">
                    From: {fb.customerName || "Anonymous"} &bull; {fb.customerContact || "No contact"}
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  Resend Alert Emailed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
