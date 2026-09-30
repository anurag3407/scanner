import React from "react";
import { connection } from "next/server";
import { getAnalytics } from "@/lib/store";
import {
  BarChart3,
  Zap,
  Award,
  Clock,
} from "lucide-react";

export const metadata = {
  title: "Scan Analytics & Telemetry | ReviewBoost Admin",
  description: "Track customer scans, chip selections, redirection conversion rates, and reputation firewall metrics.",
};

export default async function AnalyticsPage() {
  await connection();

  const analytics = await getAnalytics();

  const chipEngagementRate =
    analytics.totalScans > 0
      ? Math.round((analytics.chipToggles / analytics.totalScans) * 100)
      : 0;
  const interceptRate =
    analytics.totalScans > 0
      ? Math.round((analytics.firewallIntercepts / analytics.totalScans) * 100)
      : 0;

  const maxDailyScans = Math.max(1, ...analytics.dailyActivity.map((d) => d.scans));
  const weeklyHandoffs = analytics.dailyActivity.reduce((sum, d) => sum + d.reviews, 0);
  const peakDay = analytics.dailyActivity.reduce(
    (best, day) => (day.scans > best.scans ? day : best),
    analytics.dailyActivity[0]
  );

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-1">
          <BarChart3 className="w-3.5 h-3.5" />
          Scan Telemetry
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
          Review Generation &amp; Conversion Analytics
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Measure guest engagement at dining tables, review customization, and Google Reviews hand-off rate.
        </p>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          The Table-to-Google Review Conversion Funnel
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 relative">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Step 1</span>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {analytics.totalScans.toLocaleString()}
            </div>
            <p className="text-xs font-semibold text-zinc-700 mt-0.5">Table QR Scans</p>
            <p className="text-[11px] text-zinc-400 mt-1">100% guest initiation</p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 relative">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Step 2</span>
            <div className="text-2xl font-black text-blue-950 mt-1">
              {analytics.chipToggles.toLocaleString()}
            </div>
            <p className="text-xs font-semibold text-blue-900 mt-0.5">Highlight Chips Tapped</p>
            <p className="text-[11px] text-blue-600 mt-1">
              {analytics.totalScans > 0
                ? `${chipEngagementRate}% of scans personalized`
                : "Awaiting first scan"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 relative">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Step 3A</span>
            <div className="text-2xl font-black text-emerald-950 mt-1">
              {analytics.positiveRedirections.toLocaleString()}
            </div>
            <p className="text-xs font-semibold text-emerald-900 mt-0.5">1-Tap Google Hand-offs</p>
            <p className="text-[11px] text-emerald-600 mt-1">
              {analytics.totalScans > 0 ? `${analytics.redirectionRate}% hand-off rate` : "Awaiting first scan"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 relative">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Step 3B</span>
            <div className="text-2xl font-black text-amber-950 mt-1">
              {analytics.firewallIntercepts.toLocaleString()}
            </div>
            <p className="text-xs font-semibold text-amber-900 mt-0.5">Reputation Firewall Shield</p>
            <p className="text-[11px] text-amber-700 mt-1">
              {analytics.totalScans > 0
                ? `${interceptRate}% intercepted privately`
                : "Awaiting first scan"}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Top Dish / Server Chips Leaderboard */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900">Most Selected Feature Chips</h2>
              <p className="text-xs text-zinc-500">
                Menu highlights and server names most frequently selected by diners
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-mono font-semibold">
              Live Aggregate
            </span>
          </div>

          {analytics.topChips.length === 0 ? (
            <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-xl p-4">
              No chip selections recorded yet. Data appears here as diners tap highlight chips on
              their table QR page.
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topChips.map((item, idx) => {
                const maxCount = analytics.topChips[0]?.count || 1;
                const percent = Math.round((item.count / maxCount) * 100);

                return (
                  <div key={item.chip} className="p-3 rounded-2xl bg-zinc-50/70 border border-zinc-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-[10px] font-mono">
                          {idx + 1}
                        </span>
                        {item.chip}
                      </span>
                      <span className="font-mono text-zinc-600 font-semibold">{item.count} mentions</span>
                    </div>
                    <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
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

        {/* Right: Daily Activity & Google Maps SEO Lift */}
        <div className="lg:col-span-5 space-y-6">
          {/* Daily Scan Volume */}
          <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Weekly Table Activity
            </h2>

            <div className="flex items-end justify-between gap-2 h-36 pt-4 px-2">
              {analytics.dailyActivity.map((day) => {
                const heightPercent = Math.min(Math.round((day.scans / maxDailyScans) * 100), 100);
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-mono text-zinc-500">{day.scans}</span>
                    <div
                      className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all"
                      style={{ height: `${Math.max(heightPercent, day.scans > 0 ? 4 : 0)}%` }}
                      title={`${day.date}: ${day.scans} scans`}
                    />
                    <span className="text-xs font-semibold text-zinc-700">{day.date}</span>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-100">
              <span>
                {analytics.totalScans > 0
                  ? `Peak activity: ${peakDay.date} (${peakDay.scans} scans)`
                  : "No scan activity in the last 7 days"}
              </span>
              <span className="font-semibold text-emerald-600">
                {weeklyHandoffs} hand-offs this week
              </span>
            </div>
          </div>

          {/* Google Maps Impact Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-zinc-950 text-white rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                Local SEO Impact
              </span>
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-base font-bold">Google Maps 3-Pack Advantage</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Google algorithms rank local restaurants based on review recency, keyword velocity (dishes mentioned in reviews), and overall star count.
            </p>
            <div className="pt-2 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-white/10">
                <div className="text-lg font-black text-emerald-400">
                  {weeklyHandoffs}
                </div>
                <div className="text-[10px] text-zinc-300">Hand-offs This Week</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/10">
                <div className="text-lg font-black text-amber-300">
                  {analytics.averageRating > 0 ? `${analytics.averageRating.toFixed(1)}★` : "—"}
                </div>
                <div className="text-[10px] text-zinc-300">Avg Diner Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
