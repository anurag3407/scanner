"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Store as StoreType,
  AnalyticsSummary,
} from "@/lib/types";
import {
  QrCode,
  Star,
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Printer,
  ChevronDown,
  Sparkles,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Database,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

interface Props {
  initialAnalytics: AnalyticsSummary;
  stores: StoreType[];
  selectedStoreId?: string;
}

export default function AnalyticsClient({
  initialAnalytics,
  stores,
  selectedStoreId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [storeQuery, setStoreQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentStore = selectedStoreId
    ? stores.find((s) => s.id === selectedStoreId)
    : null;

  // Filter stores for searchable dropdown
  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(storeQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(storeQuery.toLowerCase()) ||
    (s.address && s.address.toLowerCase().includes(storeQuery.toLowerCase()))
  );

  const handleSelectStore = (storeId?: string) => {
    setIsDropdownOpen(false);
    setStoreQuery("");
    startTransition(() => {
      if (storeId) {
        router.push(`/admin/analytics?storeId=${encodeURIComponent(storeId)}`);
      } else {
        router.push("/admin/analytics");
      }
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Safe percentage calculation
  const conversionRate = initialAnalytics.redirectionRate;
  const maxDailyScans = Math.max(1, ...initialAnalytics.dailyActivity.map((d) => d.scans));
  const weeklyReviews = initialAnalytics.dailyActivity.reduce((sum, d) => sum + d.reviews, 0);

  // Time format helper
  const formatEventTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header & Store Selector */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold mb-2">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Real DB Live Telemetry (Supabase)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Review &amp; QR Analytics
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Live guest scans, 5★ Google Review hand-offs, and intercepted feedback directly from the database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-zinc-900" : ""}`} />
              <span>{isPending ? "Syncing..." : "Refresh Live"}</span>
            </button>
          </div>
        </div>

        {/* Store Selector Dropdown */}
        <div className="pt-2 border-t border-zinc-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl">
              <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                Filter by Restaurant:
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 rounded-2xl text-left text-sm font-semibold text-zinc-900 transition-all cursor-pointer focus:ring-2 focus:ring-zinc-900 focus:outline-none"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: currentStore?.brandColor || "#10B981" }}
                    />
                    <span className="truncate">
                      {currentStore ? currentStore.name : "🏪 All Restaurants (Platform Total — 103 Locations)"}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-zinc-200 p-2 animate-in fade-in slide-in-from-top-2 duration-150 max-h-96 overflow-hidden flex flex-col">
                    <div className="relative p-1 mb-1">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                      <input
                        type="text"
                        placeholder="Search restaurant by name or location..."
                        value={storeQuery}
                        onChange={(e) => setStoreQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-3 py-2 bg-zinc-50 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                        autoFocus
                      />
                    </div>

                    <div className="overflow-y-auto space-y-1 pr-1 flex-1">
                      <button
                        type="button"
                        onClick={() => handleSelectStore(undefined)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                          !selectedStoreId
                            ? "bg-zinc-900 text-white"
                            : "hover:bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>🏪</span>
                          <span>All Restaurants (Platform Total)</span>
                        </span>
                        {!selectedStoreId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>

                      <div className="border-t border-zinc-100 my-1 pt-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 py-1 block">
                          Restaurants ({filteredStores.length})
                        </span>
                      </div>

                      {filteredStores.map((s) => {
                        const isSelected = s.id === selectedStoreId;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSelectStore(s.id)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                              isSelected
                                ? "bg-zinc-900 text-white font-bold"
                                : "hover:bg-zinc-100 text-zinc-800 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: s.brandColor || "#E11D48" }}
                              />
                              <div className="truncate">
                                <div className="truncate font-semibold">{s.name}</div>
                                <div className={`text-[10px] truncate ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                                  {s.category} {s.address ? `• ${s.address}` : ""}
                                </div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions for Selected Store */}
            {currentStore && (
              <div className="flex items-center gap-2 pt-2 sm:pt-6">
                <Link
                  href={`/r/${currentStore.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Review Page</span>
                </Link>

                <Link
                  href={`/admin/stores/${currentStore.id}/print`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Table Standee</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Clean Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Scans */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Table QR Scans</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-zinc-900">
            {initialAnalytics.totalScans.toLocaleString()}
          </div>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            {currentStore ? `Scans at ${currentStore.name}` : "Total scans across dining tables"}
          </p>
        </div>

        {/* Metric 2: 5-Star Reviews */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">5★ Google Reviews</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Star className="w-5 h-5 fill-emerald-500 text-emerald-500" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-zinc-900">
            {initialAnalytics.positiveRedirections.toLocaleString()}
          </div>
          <p className="text-xs text-emerald-700 mt-1 font-medium">
            1-tap review hand-offs to Google
          </p>
        </div>

        {/* Metric 3: Conversion Rate */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600">Review Conversion</span>
            <div className="w-9 h-9 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-zinc-900">
            {conversionRate}%
          </div>
          <p className="text-xs text-violet-700 mt-1 font-medium">
            {initialAnalytics.totalScans > 0
              ? `${initialAnalytics.positiveRedirections} of ${initialAnalytics.totalScans} diners posted review`
              : "Awaiting first scan"}
          </p>
        </div>

        {/* Metric 4: Reputation Firewall */}
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Private Feedback</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-zinc-900">
            {initialAnalytics.firewallIntercepts.toLocaleString()}
          </div>
          <p className="text-xs text-amber-700 mt-1 font-medium">
            1–3★ complaints caught privately
          </p>
        </div>
      </div>

      {/* Two Column Layout: Dishes / Highlights & Weekly Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Most Loved Dishes */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900">Most Loved Dishes &amp; Features</h2>
                <p className="text-xs text-zinc-500">
                  {currentStore
                    ? `Top mentions by diners at ${currentStore.name}`
                    : "Menu items most frequently highlighted by diners"}
                </p>
              </div>
            </div>

            {initialAnalytics.avgChipsPerReview > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-[11px] font-semibold">
                Avg. {initialAnalytics.avgChipsPerReview} items/review
              </span>
            )}
          </div>

          {initialAnalytics.topChips.length === 0 ? (
            <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 space-y-2">
              <Sparkles className="w-6 h-6 text-zinc-400 mx-auto" />
              <p className="text-xs font-semibold text-zinc-700">No dish selections recorded yet</p>
              <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                When diners scan table QR codes and tap highlights (e.g. Kulhad Chai, Maggi, Pizza), they will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {initialAnalytics.topChips.map((item, idx) => {
                const maxCount = initialAnalytics.topChips[0]?.count || 1;
                const percent = Math.max(10, Math.round((item.count / maxCount) * 100));

                return (
                  <div
                    key={item.chip}
                    className="p-3 rounded-2xl bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-100 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-900 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px] font-bold font-mono">
                          {idx + 1}
                        </span>
                        <span>{item.chip}</span>
                      </span>
                      <span className="font-mono font-bold text-zinc-700 bg-white px-2 py-0.5 rounded-md border border-zinc-200 text-[11px]">
                        {item.count} {item.count === 1 ? "review" : "reviews"}
                      </span>
                    </div>

                    <div className="w-full bg-zinc-200/80 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-zinc-900 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Weekly Activity Trend */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Weekly Table Activity</h2>
                  <p className="text-xs text-zinc-500">Scans and reviews over the last 7 days</p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200/60">
                {weeklyReviews} reviews this week
              </span>
            </div>

            {/* Daily Bars */}
            <div className="flex items-end justify-between gap-2 h-40 pt-4 px-2">
              {initialAnalytics.dailyActivity.map((day) => {
                const heightPercent = Math.min(Math.round((day.scans / maxDailyScans) * 100), 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">{day.scans}</span>
                    <div
                      className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-xl transition-all"
                      style={{ height: `${Math.max(heightPercent, day.scans > 0 ? 8 : 4)}%` }}
                      title={`${day.date}: ${day.scans} scans, ${day.reviews} reviews`}
                    />
                    <span className="text-[11px] font-semibold text-zinc-600">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>🟢 Green bar = QR Scans</span>
            <span className="font-semibold text-zinc-700">
              Avg Rating: {initialAnalytics.averageRating > 0 ? `${initialAnalytics.averageRating} ★` : "5.0 ★"}
            </span>
          </div>
        </div>
      </div>

      {/* Real Live Database Events Feed */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Recent Live Guest Activity</h2>
              <p className="text-xs text-zinc-500">
                Real-time activity recorded in Supabase PostgreSQL
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-semibold text-zinc-400">
            Live Stream
          </span>
        </div>

        {(!initialAnalytics.recentEvents || initialAnalytics.recentEvents.length === 0) ? (
          <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 space-y-2">
            <p className="text-xs font-semibold text-zinc-700">No activity recorded for this selection yet</p>
            {currentStore && (
              <p className="text-[11px] text-zinc-500">
                Scan the QR code at <strong className="text-zinc-800">{currentStore.name}</strong> to generate your first live event.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-100">
                  <th className="pb-2.5">Time</th>
                  <th className="pb-2.5">Restaurant</th>
                  <th className="pb-2.5">Guest Action</th>
                  <th className="pb-2.5">Rating</th>
                  <th className="pb-2.5">Selected Dishes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {initialAnalytics.recentEvents.map((ev) => {
                  const evStore = stores.find((s) => s.id === ev.storeId);
                  const storeName = evStore ? evStore.name : ev.storeId;

                  let badgeColor = "bg-zinc-100 text-zinc-700";
                  let actionLabel = "Guest Interaction";

                  if (ev.type === "copy_open") {
                    badgeColor = "bg-emerald-100 text-emerald-800 font-bold";
                    actionLabel = "⭐ Copied 5★ Review & Opened Google";
                  } else if (ev.type === "scan") {
                    badgeColor = "bg-blue-100 text-blue-800 font-bold";
                    actionLabel = "📱 Scanned Table QR Code";
                  } else if (ev.type === "firewall_intercept") {
                    badgeColor = "bg-amber-100 text-amber-800 font-bold";
                    actionLabel = "🛡️ Private Feedback Intercepted";
                  } else if (ev.type === "chip_toggle") {
                    badgeColor = "bg-purple-100 text-purple-800";
                    actionLabel = "🏷️ Selected Dish Highlights";
                  }

                  return (
                    <tr key={ev.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 font-mono text-zinc-400 whitespace-nowrap">
                        {formatEventTime(ev.timestamp)}
                      </td>
                      <td className="py-3 font-bold text-zinc-900 whitespace-nowrap">
                        {storeName}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 ${badgeColor}`}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="py-3 font-bold whitespace-nowrap">
                        <span className="text-amber-500">{"★".repeat(ev.rating || 5)}</span>
                      </td>
                      <td className="py-3 text-zinc-600 max-w-xs truncate">
                        {ev.chips && ev.chips.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ev.chips.map((chip) => (
                              <span
                                key={chip}
                                className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[10px] font-medium"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
