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
    (s.name || "").toLowerCase().includes(storeQuery.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(storeQuery.toLowerCase()) ||
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

  const metrics = [
    {
      label: "Table QR Scans",
      value: initialAnalytics.totalScans.toLocaleString(),
      note: currentStore ? `Scans at ${currentStore.name}` : "Total scans across dining tables",
      bg: "bg-neo-blue",
      icon: <QrCode className="h-5 w-5" strokeWidth={2.5} />,
      noteClass: "text-black/60",
      rotate: "-rotate-1",
    },
    {
      label: "5★ Google Reviews",
      value: initialAnalytics.positiveRedirections.toLocaleString(),
      note: "1-tap review hand-offs to Google",
      bg: "bg-neo-green",
      icon: <Star className="h-5 w-5 fill-black" strokeWidth={2.5} />,
      noteClass: "text-black/60",
      rotate: "rotate-1",
    },
    {
      label: "Review Conversion",
      value: `${conversionRate}%`,
      note:
        initialAnalytics.totalScans > 0
          ? `${initialAnalytics.positiveRedirections} of ${initialAnalytics.totalScans} diners posted review`
          : "Awaiting first scan",
      bg: "bg-neo-violet",
      icon: <TrendingUp className="h-5 w-5" strokeWidth={2.5} />,
      noteClass: "text-black/60",
      rotate: "-rotate-1",
    },
    {
      label: "Private Feedback",
      value: initialAnalytics.firewallIntercepts.toLocaleString(),
      note: "1–3★ complaints caught privately",
      bg: "bg-neo-yellow",
      icon: <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />,
      noteClass: "text-black/60",
      rotate: "rotate-1",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-8">
      {/* Top Header & Store Selector */}
      <div className="space-y-6 border-4 border-black bg-white p-6 shadow-neo-md sm:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 inline-flex -rotate-1 items-center gap-1.5 border-[3px] border-black bg-neo-green px-3 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
              <Database className="h-3.5 w-3.5" strokeWidth={3} />
              <span>Real DB live telemetry (Supabase)</span>
              <span className="ml-1 h-2 w-2 animate-pulse bg-black" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-black sm:text-4xl">
              Review &amp; QR Analytics
            </h1>
            <p className="mt-1 text-xs font-bold text-black/70 sm:text-sm">
              Live guest scans, 5★ Google Review hand-offs, and intercepted feedback directly from
              the database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex cursor-pointer items-center gap-1.5 border-[3px] border-black bg-neo-yellow px-3.5 py-2 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-white disabled:cursor-wait disabled:opacity-50 enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none"
              title="Refresh database records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} strokeWidth={3} />
              <span>{isPending ? "Syncing..." : "Refresh live"}</span>
            </button>
          </div>
        </div>

        {/* Store Selector Dropdown */}
        <div className="border-t-[3px] border-black pt-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-xl flex-1">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-black">
                <Filter className="h-3.5 w-3.5" strokeWidth={3} />
                Filter by restaurant:
              </label>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex w-full cursor-pointer items-center justify-between border-[3px] border-black bg-cream px-4 py-3 text-left text-sm font-bold text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="h-3 w-3 shrink-0 border-2 border-black"
                      style={{ backgroundColor: currentStore?.brandColor || "#6BCB77" }}
                    />
                    <span className="truncate font-black uppercase tracking-wide">
                      {currentStore ? currentStore.name : "🏪 All Restaurants (Platform Total)"}
                    </span>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-black" strokeWidth={3} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-30 mt-2 flex max-h-96 w-full flex-col overflow-hidden border-4 border-black bg-white shadow-neo-lg">
                    <div className="relative mb-1 p-1">
                      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-black" strokeWidth={3} />
                      <input
                        type="text"
                        placeholder="Search restaurant by name or location..."
                        value={storeQuery}
                        onChange={(e) => setStoreQuery(e.target.value)}
                        className="w-full border-[3px] border-black bg-cream py-2 pl-8 pr-3 text-xs font-bold text-black placeholder-black/40 focus:bg-neo-yellow focus:outline-none"
                        autoFocus
                      />
                    </div>

                    <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => handleSelectStore(undefined)}
                        className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-xs transition-colors ${
                          !selectedStoreId
                            ? "bg-black font-black uppercase tracking-wide text-white"
                            : "font-bold text-black hover:bg-neo-yellow"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>🏪</span>
                          <span>All Restaurants (Platform Total)</span>
                        </span>
                        {!selectedStoreId && <CheckCircle2 className="h-3.5 w-3.5 text-neo-green" strokeWidth={3} />}
                      </button>

                      <div className="my-1 border-t-2 border-black pt-1">
                        <span className="block px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black/50">
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
                            className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-xs transition-colors ${
                              isSelected
                                ? "bg-black font-black text-white"
                                : "font-bold text-black hover:bg-neo-yellow"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="h-2.5 w-2.5 shrink-0 border-2 border-black"
                                style={{ backgroundColor: s.brandColor || "#E11D48" }}
                              />
                              <div className="truncate">
                                <div className="truncate">{s.name}</div>
                                <div className={`truncate text-[10px] font-bold ${isSelected ? "text-white/70" : "text-black/50"}`}>
                                  {s.category} {s.address ? `• ${s.address}` : ""}
                                </div>
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 className="ml-2 h-3.5 w-3.5 shrink-0 text-neo-green" strokeWidth={3} />}
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
              <div className="flex items-center gap-3 pt-2 sm:pt-6">
                <Link
                  href={`/r/${currentStore.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 border-[3px] border-black bg-black px-3 py-2 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={3} />
                  <span>Open review page</span>
                </Link>

                <Link
                  href={`/admin/stores/${currentStore.id}/print`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 border-[3px] border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <Printer className="h-3.5 w-3.5" strokeWidth={3} />
                  <span>Print standee</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 Clean Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`relative overflow-hidden border-4 border-black bg-white shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-neo-md ${m.rotate} hover:rotate-0`}
          >
            <div className={`mb-2 flex items-center justify-between border-b-4 border-black ${m.bg} px-4 py-2`}>
              <span className="text-[11px] font-black uppercase tracking-widest text-black">{m.label}</span>
              <span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black">
                {m.icon}
              </span>
            </div>
            <div className="p-4 pt-0">
              <div className="text-3xl font-black tabular-nums text-black sm:text-4xl">{m.value}</div>
              <p className={`mt-1 border-t-2 border-black pt-1.5 text-xs font-bold ${m.noteClass}`}>{m.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Dishes / Highlights & Weekly Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Most Loved Dishes */}
        <div className="space-y-4 border-4 border-black bg-white p-6 shadow-neo-sm sm:p-7 lg:col-span-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 -rotate-3 items-center justify-center border-[3px] border-black bg-neo-yellow shadow-neo-xs">
                <UtensilsCrossed className="h-4 w-4" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-black">
                  Most loved dishes &amp; features
                </h2>
                <p className="text-xs font-bold text-black/60">
                  {currentStore
                    ? `Top mentions by diners at ${currentStore.name}`
                    : "Menu items most frequently highlighted by diners"}
                </p>
              </div>
            </div>

            {initialAnalytics.avgChipsPerReview > 0 && (
              <span className="shrink-0 rotate-1 border-2 border-black bg-neo-violet px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                Avg. {initialAnalytics.avgChipsPerReview} items/review
              </span>
            )}
          </div>

          {initialAnalytics.topChips.length === 0 ? (
            <div className="space-y-2 border-[3px] border-dashed border-black bg-cream p-8 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-black/40" strokeWidth={2.5} />
              <p className="text-xs font-black uppercase tracking-wide text-black">
                No dish selections recorded yet
              </p>
              <p className="mx-auto max-w-sm text-[11px] font-bold text-black/60">
                When diners scan table QR codes and tap highlights (e.g. Kulhad Chai, Maggi, Pizza),
                they will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {initialAnalytics.topChips.map((item, idx) => {
                const maxCount = initialAnalytics.topChips[0]?.count || 1;
                const percent = Math.max(10, Math.round((item.count / maxCount) * 100));

                return (
                  <div key={item.chip} className="space-y-2 border-[3px] border-black bg-cream p-3 shadow-neo-xs transition-all">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-black text-black">
                        <span className="flex h-5 w-5 items-center justify-center border-2 border-black bg-white font-mono text-[10px] font-black text-black">
                          {idx + 1}
                        </span>
                        <span>{item.chip}</span>
                      </span>
                      <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[11px] font-black text-black shadow-neo-xs">
                        {item.count} {item.count === 1 ? "review" : "reviews"}
                      </span>
                    </div>

                    <div className="h-3 w-full overflow-hidden border-2 border-black bg-white">
                      <div
                        className="h-full bg-neo-green transition-all duration-500"
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
        <div className="flex flex-col justify-between space-y-4 border-4 border-black bg-white p-6 shadow-neo-sm sm:p-7 lg:col-span-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 rotate-3 items-center justify-center border-[3px] border-black bg-neo-blue shadow-neo-xs">
                  <Clock className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wide text-black">Weekly table activity</h2>
                  <p className="text-xs font-bold text-black/60">Scans and reviews over the last 7 days</p>
                </div>
              </div>

              <span className="shrink-0 -rotate-1 border-2 border-black bg-neo-green px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                {weeklyReviews} reviews this week
              </span>
            </div>

            {/* Daily Bars */}
            <div className="flex h-40 items-end justify-between gap-2 px-2 pt-4">
              {initialAnalytics.dailyActivity.map((day) => {
                const heightPercent = Math.min(Math.round((day.scans / maxDailyScans) * 100), 100);
                return (
                  <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <span className="font-mono text-[10px] font-black text-black">{day.scans}</span>
                    <div
                      className="w-full border-2 border-black bg-neo-yellow transition-all hover:bg-neo-red"
                      style={{ height: `${Math.max(heightPercent, day.scans > 0 ? 8 : 4)}%` }}
                      title={`${day.date}: ${day.scans} scans, ${day.reviews} reviews`}
                    />
                    <span className="text-[11px] font-black uppercase text-black">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t-[3px] border-black pt-3 text-xs font-bold text-black/60">
            <span>🟨 Yellow bar = QR scans</span>
            <span className="font-black uppercase tracking-wide text-black">
              Avg rating: {initialAnalytics.averageRating > 0 ? `${initialAnalytics.averageRating} ★` : "5.0 ★"}
            </span>
          </div>
        </div>
      </div>

      {/* Real Live Database Events Feed */}
      <div className="space-y-4 border-4 border-black bg-white p-6 shadow-neo-md sm:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 -rotate-3 items-center justify-center border-[3px] border-black bg-neo-violet shadow-neo-xs">
              <Database className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide text-black">Recent live guest activity</h2>
              <p className="text-xs font-bold text-black/60">Real-time activity recorded in Supabase PostgreSQL</p>
            </div>
          </div>

          <span className="rotate-1 border-2 border-black bg-neo-green px-2 py-0.5 font-mono text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
            Live Stream
          </span>
        </div>

        {(!initialAnalytics.recentEvents || initialAnalytics.recentEvents.length === 0) ? (
          <div className="space-y-2 border-[3px] border-dashed border-black bg-cream p-8 text-center">
            <p className="text-xs font-black uppercase tracking-wide text-black">
              No activity recorded for this selection yet
            </p>
            {currentStore && (
              <p className="text-[11px] font-bold text-black/60">
                Scan the QR code at <strong className="text-black">{currentStore.name}</strong> to
                generate your first live event.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border-[3px] border-black">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-[3px] border-black bg-neo-yellow text-[10px] font-black uppercase tracking-widest text-black">
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Restaurant</th>
                  <th className="px-3 py-2.5">Guest action</th>
                  <th className="px-3 py-2.5">Rating</th>
                  <th className="px-3 py-2.5">Selected dishes</th>
                </tr>
              </thead>
              <tbody>
                {initialAnalytics.recentEvents.map((ev, idx) => {
                  const evStore = stores.find((s) => s.id === ev.storeId);
                  const storeName = evStore ? evStore.name : ev.storeId;

                  let badgeBg = "bg-white";
                  let actionLabel = "Guest interaction";

                  if (ev.type === "copy_open") {
                    badgeBg = "bg-neo-green";
                    actionLabel = "⭐ Copied 5★ review & opened Google";
                  } else if (ev.type === "scan") {
                    badgeBg = "bg-neo-blue text-white";
                    actionLabel = "📱 Scanned table QR code";
                  } else if (ev.type === "firewall_intercept") {
                    badgeBg = "bg-neo-red";
                    actionLabel = "🛡️ Private feedback intercepted";
                  } else if (ev.type === "chip_toggle") {
                    badgeBg = "bg-neo-violet";
                    actionLabel = "🏷️ Selected dish highlights";
                  } else if (ev.type === "menu_view") {
                    badgeBg = "bg-neo-yellow";
                    actionLabel = "🍽️ Opened the live menu";
                  } else if (ev.type === "feedback_submit") {
                    badgeBg = "bg-neo-red";
                    actionLabel = "🛡️ Private feedback submitted";
                  }

                  return (
                    <tr
                      key={ev.id}
                      className={`transition-colors hover:bg-cream ${idx < initialAnalytics.recentEvents.length - 1 ? "border-b-2 border-black" : ""}`}
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-mono font-bold text-black/60">
                        {formatEventTime(ev.timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-black text-black">{storeName}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className={`inline-flex items-center gap-1 border-2 border-black px-2.5 py-1 text-[11px] font-black shadow-neo-xs ${badgeBg}`}>
                          {actionLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-black">
                        {/* Clamp: `rating` is read straight off a JSON/DB row with no
                            runtime bound, and a negative or huge value would make
                            `String.repeat` throw and blank the whole page. */}
                        <span className="text-black">
                          {"★".repeat(Math.max(1, Math.min(5, Math.trunc(Number(ev.rating) || 5))))}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-3 py-3">
                        {ev.chips && ev.chips.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ev.chips.map((chip, i) => (
                              <span
                                key={chip}
                                className={`border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black text-black shadow-neo-xs ${
                                  i % 2 === 0 ? "-rotate-1" : "rotate-1"
                                }`}
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold italic text-black/40">—</span>
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
