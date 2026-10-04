import React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAllStores, getStoresByIds, getAnalytics, getFeedbacks, getRevenueSummary } from "@/lib/store";
import { getSessionUser, scopedStoreIds } from "@/lib/auth";
import Link from "next/link";
import {
  ShieldAlert,
  Star,
  Printer,
  QrCode,
  IndianRupee,
  ExternalLink,
  Plus,
  Mail,
  MapPin,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Utensils,
} from "lucide-react";

export default async function AdminOverviewPage() {
  await connection();

  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Super admins see the whole platform; store admins only their locations.
  const scope = scopedStoreIds(user);

  const [stores, analytics, feedbacks, revenue] = await Promise.all([
    scope === null ? getAllStores() : getStoresByIds(scope),
    scope === null ? getAnalytics() : getAnalytics(undefined, scope),
    scope === null ? getFeedbacks() : getFeedbacks(undefined, scope),
    // Scoped exactly like every other read here — a store admin never sees
    // revenue for locations they are not assigned to.
    getRevenueSummary(scope),
  ]);

  // Indian numbering, because these are rupee amounts and the market is India.
  const formatInr = (rupees: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(rupees);

  const recentFeedbacks = feedbacks.slice(0, 5);
  const isSuperAdmin = user.isSuperAdmin;

  const metrics = [
    {
      // The only card on this page computed from recorded payments rather
      // than telemetry. It reads Rs 0 until a subscription is recorded,
      // which is the honest state of the business today.
      label: "Monthly Revenue",
      value: revenue.payingLocations > 0 ? formatInr(revenue.mrrRupees) : "Rs 0",
      sub: `${revenue.payingLocations} paying ${revenue.payingLocations === 1 ? "location" : "locations"}`,
      note: `Annualised ${formatInr(revenue.arrInr / 100)} · ${revenue.churnedLast30Days} churned (30d)`,
      bg: "bg-neo-yellow",
      icon: <IndianRupee className="h-5 w-5" strokeWidth={2.5} />,
      rotate: "-rotate-1",
    },
    {
      label: "Total Scans",
      value: String(analytics.totalScans),
      sub: "Diner scans",
      note: "Physical table camera scans",
      bg: "bg-neo-blue",
      icon: <TrendingUp className="h-5 w-5" strokeWidth={2.5} />,
      rotate: "rotate-1",
    },
    {
      label: "5★ Google Copies",
      value: String(analytics.positiveRedirections),
      sub: `${analytics.redirectionRate}% sent to Google`,
      note: "Verified positive review drafts",
      bg: "bg-neo-green",
      icon: <Star className="h-5 w-5 fill-black" strokeWidth={2.5} />,
      rotate: "-rotate-1",
    },
    {
      label: "Low Ratings Caught",
      value: String(feedbacks.length),
      sub: "Firewall intercepts",
      note: "Emailed to owners via Resend",
      bg: "bg-neo-red",
      icon: <ShieldAlert className="h-5 w-5" strokeWidth={2.5} />,
      rotate: "rotate-1",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-6 sm:p-10">
      {/* Top Banner */}
      <div className="flex flex-col items-start justify-between gap-4 border-4 border-black bg-black p-6 text-white shadow-neo-md sm:flex-row sm:items-center sm:p-8">
        <div className="space-y-2">
          <div className="inline-flex rotate-1 items-center gap-1.5 border-2 border-white bg-neo-yellow px-3 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-white-sm">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={3} />
            {isSuperAdmin ? "Platform Operations" : "Your Locations"}
          </div>
          <h1 className="mt-1 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            {isSuperAdmin ? (
              <>
                Restaurant <span className="text-neo-yellow">Standees</span> &amp;{" "}
                <span className="text-neo-red">Reviews</span>
              </>
            ) : (
              "Welcome back"
            )}
          </h1>
          <p className="max-w-2xl text-xs font-bold leading-relaxed text-white/70">
            Configure menus, keywords and sentence combinations, generate permanent QR table
            standees, and keep owners in the loop with instant email alerts on low ratings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/stores"
            className="border-4 border-white bg-neo-red px-5 py-3 text-xs font-black uppercase tracking-widest text-black shadow-neo-white-sm transition-all duration-100 ease-linear hover:bg-white active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            {isSuperAdmin ? (
              <>
                <Plus className="mr-1 inline h-4 w-4" strokeWidth={3} /> Add restaurant
              </>
            ) : (
              <>
                <QrCode className="mr-1 inline h-4 w-4" strokeWidth={3} /> Manage locations
              </>
            )}
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`border-4 border-black bg-white shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-neo-md ${m.rotate} hover:rotate-0`}
          >
            <div className={`flex items-center justify-between border-b-4 border-black ${m.bg} px-4 py-2.5`}>
              <span className="text-[11px] font-black uppercase tracking-widest text-black">{m.label}</span>
              <span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white text-black">
                {m.icon}
              </span>
            </div>
            <div className="p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums text-black">{m.value}</span>
                <span className="text-[11px] font-black uppercase tracking-widest text-black/60">{m.sub}</span>
              </div>
              <p className="mt-1.5 border-t-2 border-black pt-1.5 text-[11px] font-bold text-black/60">{m.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active Restaurants List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="inline-block -rotate-1 border-[3px] border-black bg-white px-3 py-1 text-xl font-black uppercase tracking-tight text-black shadow-neo-xs">
              Your active restaurants &amp; cafes
            </h2>
            <p className="mt-2 max-w-2xl text-xs font-bold text-black/70">
              Every location has one permanent QR code — print it once, and updated menus, dishes or
              sentence combinations never require a reprint.
            </p>
          </div>
          <Link
            href="/admin/stores"
            className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            Manage all <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
          </Link>
        </div>

        {stores.length === 0 ? (
          <div className="border-4 border-dashed border-black bg-white p-12 text-center shadow-neo-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 -rotate-3 items-center justify-center border-4 border-black bg-neo-yellow text-2xl shadow-neo-xs">
              🏪
            </div>
            <h3 className="text-lg font-black uppercase tracking-wide text-black">No restaurants added yet</h3>
            <p className="mx-auto mt-1 max-w-md text-xs font-bold text-black/70">
              Add your first client to generate their 1-year table standee, publish their live menu
              and configure their dish chips.
            </p>
            <Link
              href="/admin/stores"
              className="mt-5 inline-flex items-center gap-2 border-4 border-black bg-neo-red px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow active:translate-x-1 active:translate-y-1 active:shadow-none"
            >
              <Plus className="h-4 w-4" strokeWidth={3} /> Add restaurant location
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {stores.map((store) => (
              <div
                key={store.id}
                className="flex flex-col justify-between border-4 border-black bg-white p-6 shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-neo-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 -rotate-3 items-center justify-center border-[3px] border-black text-xl font-black text-white [text-shadow:2px_2px_0_#000]"
                        style={{ backgroundColor: store.brandColor || "#0d9488" }}
                      >
                        {store.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-black">{store.name}</h3>
                          <span className="border-2 border-black bg-neo-violet px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                            {store.category}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs font-bold text-black/60">
                          {store.tagline || store.category}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 border-2 border-black bg-cream px-2 py-1 font-mono text-[11px] font-black text-black shadow-neo-xs">
                      /r/{store.slug}
                    </span>
                  </div>

                  {/* Owner Alert inbox badge */}
                  <div className="mt-4 space-y-1.5 border-[3px] border-black bg-cream p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-black">
                      <Mail className="h-3.5 w-3.5 text-neo-green" strokeWidth={3} />
                      <span>
                        Owner inbox:{" "}
                        <strong className="font-black text-black">{store.managerEmail || "Not configured"}</strong>
                      </span>
                    </div>
                    {store.address && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-black/60">
                        <MapPin className="h-3.5 w-3.5 text-black" strokeWidth={3} />
                        <span className="truncate">{store.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Highlight Chips */}
                  <div className="mt-3">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-black/50">
                      Diner highlight chips ({store.chips.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {store.chips.slice(0, 4).map((chip, i) => (
                        <span
                          key={chip}
                          className={`border-2 border-black bg-white px-2 py-0.5 text-[11px] font-black text-black shadow-neo-xs ${
                            i % 2 === 0 ? "-rotate-1" : "rotate-1"
                          }`}
                        >
                          {chip}
                        </span>
                      ))}
                      {store.chips.length > 4 && (
                        <span className="border-2 border-black bg-neo-yellow px-2 py-0.5 text-[11px] font-black text-black shadow-neo-xs">
                          +{store.chips.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-[3px] border-black pt-4">
                  <Link
                    href={`/admin/stores/${store.id}/print`}
                    className="flex-1 border-[3px] border-black bg-black px-3 py-2.5 text-center text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    <Printer className="mr-1 inline h-3.5 w-3.5" strokeWidth={3} />
                    Print QR
                  </Link>

                  <Link
                    href={`/admin/stores/${store.id}/menu`}
                    className="border-[3px] border-black bg-neo-yellow px-3.5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    title="Update the live digital menu"
                  >
                    <Utensils className="mr-1 inline h-3.5 w-3.5" strokeWidth={3} />
                    Menu
                  </Link>

                  <Link
                    href={`/r/${store.slug}`}
                    target="_blank"
                    className="border-[3px] border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-violet active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    Test scan
                    <ExternalLink className="ml-1 inline h-3 w-3" strokeWidth={3} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Low-Rating Complaints (Firewall Inbox) */}
      <div className="space-y-4 border-4 border-black bg-white p-6 shadow-neo-md sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 -rotate-3 items-center justify-center border-[3px] border-black bg-neo-red shadow-neo-xs">
              <ShieldAlert className="h-5 w-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide text-black">
                Recent intercepted low ratings (1-3 stars)
              </h2>
              <p className="text-xs font-bold text-black/60">
                Caught before reaching Google Maps and dispatched via Resend email to the owner.
              </p>
            </div>
          </div>
          <Link
            href="/admin/feedback"
            className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            View all ({feedbacks.length})
          </Link>
        </div>

        {recentFeedbacks.length === 0 ? (
          <div className="border-[3px] border-dashed border-black bg-cream p-8 text-center text-xs font-black uppercase tracking-widest text-black/60">
            🛡️ Zero negative reviews reported yet. All diner ratings have been 4 or 5 stars!
          </div>
        ) : (
          <div>
            {recentFeedbacks.map((fb, idx) => (
              <div
                key={fb.id}
                className={`flex flex-col items-start justify-between gap-3 py-3.5 sm:flex-row sm:items-center ${
                  idx < recentFeedbacks.length - 1 ? "border-b-2 border-black" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wide text-black">{fb.storeName}</span>
                    <span className="border-2 border-black bg-neo-red px-2 py-0.5 font-mono text-[10px] font-black text-black">
                      {fb.rating}★
                    </span>
                    {fb.tableNumber && (
                      <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-black">
                        Table #{fb.tableNumber}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-1 text-xs font-bold italic text-black/70">&ldquo;{fb.message}&rdquo;</p>
                  <div className="text-[11px] font-bold text-black/50">
                    From: {fb.customerName || "Anonymous"} &bull; {fb.customerContact || "No contact"}
                  </div>
                </div>

                {fb.alert?.status === "sent" && (
                  <span className="shrink-0 rotate-1 border-2 border-black bg-neo-green px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                    Owner alerted
                  </span>
                )}
                {fb.alert?.status === "failed" && (
                  <span
                    className="shrink-0 border-2 border-black bg-neo-red px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs"
                    title={fb.alert.error}
                  >
                    Email failed
                  </span>
                )}
                {fb.alert?.status === "skipped" && (
                  <span
                    className="shrink-0 border-2 border-black bg-neo-yellow px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs"
                    title={fb.alert.error}
                  >
                    No owner email
                  </span>
                )}
                {!fb.alert && (
                  <span className="shrink-0 border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                    Alert pending
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
