"use client";

import React, { useState } from "react";
import { FeedbackSubmission, Store } from "@/lib/types";
import { ShieldCheck, ShieldAlert, Star, CheckCircle, Clock, Check } from "lucide-react";

interface Props {
  initialFeedbacks: FeedbackSubmission[];
  stores: Store[];
}

export default function FeedbackInboxClient({ initialFeedbacks, stores }: Props) {
  const [feedbacks, setFeedbacks] = useState<FeedbackSubmission[]>(initialFeedbacks);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedStoreId !== "all" && fb.storeId !== selectedStoreId) return false;
    if (statusFilter !== "all" && fb.status !== statusFilter) return false;
    return true;
  });

  const handleUpdateStatus = async (id: string, newStatus: FeedbackSubmission["status"]) => {
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        setFeedbacks((prev) =>
          prev.map((fb) => (fb.id === id ? { ...fb, status: newStatus } : fb))
        );
      }
    } catch {
      alert("Failed to update status");
    }
  };

  const newCount = feedbacks.filter((f) => f.status === "new").length;
  const resolvedCount = feedbacks.filter((f) => f.status === "resolved").length;

  const stats = [
    {
      label: "Total intercepted",
      value: feedbacks.length,
      note: "1-3 star dining experiences",
      bg: "bg-neo-yellow",
      valueClass: "text-black",
    },
    {
      label: "Needs GM attention",
      value: newCount,
      note: "Pending table-side resolution",
      bg: "bg-neo-red",
      valueClass: "text-black",
    },
    {
      label: "Resolved by management",
      value: resolvedCount,
      note: "Guest reconciled on the spot",
      bg: "bg-neo-green",
      valueClass: "text-black",
    },
  ];

  const statusBadge = (status: string) =>
    status === "new"
      ? "bg-neo-red text-black"
      : status === "reviewed"
      ? "bg-neo-yellow text-black"
      : "bg-neo-green text-black";

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex -rotate-1 items-center gap-1.5 border-[3px] border-black bg-neo-violet px-2.5 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={3} />
            Reputation firewall engine
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black">
            Private manager feedback inbox
          </h1>
          <p className="mt-1 text-xs font-bold text-black/70">
            Diners who rated 1–3 stars were intercepted here before posting a public 1-star Google
            review.
          </p>
        </div>

        {/* Protection Metric */}
        <div className="flex items-center gap-3 border-4 border-black bg-neo-green p-3 text-xs text-black shadow-neo-sm">
          <ShieldCheck className="h-6 w-6 shrink-0" strokeWidth={2.5} />
          <div>
            <span className="block font-black uppercase tracking-wide">
              {feedbacks.length} negative reviews intercepted
            </span>
            <span className="text-[11px] font-bold text-black/70">Prevented Google rating drops</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`border-4 border-black bg-white shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-neo-md ${
              i === 0 ? "-rotate-1" : i === 1 ? "rotate-1" : "-rotate-1"
            } hover:rotate-0`}
          >
            <div className={`border-b-4 border-black ${s.bg} px-4 py-2`}>
              <span className="text-[11px] font-black uppercase tracking-widest text-black">{s.label}</span>
            </div>
            <div className="p-4">
              <div className={`text-3xl font-black tabular-nums ${s.valueClass}`}>{s.value}</div>
              <p className="mt-0.5 text-[11px] font-bold text-black/60">{s.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-4 border-black bg-white p-3 text-xs shadow-neo-sm">
        <div className="flex items-center gap-2">
          <span className="font-black uppercase tracking-widest text-black/60">Filter location:</span>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="cursor-pointer border-[3px] border-black bg-cream p-1.5 text-xs font-bold text-black shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
          >
            <option value="all">All Locations ({stores.length})</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {(
            [
              { id: "all", label: `All (${feedbacks.length})`, activeBg: "bg-black text-white" },
              { id: "new", label: `New (${newCount})`, activeBg: "bg-neo-red text-black" },
              { id: "resolved", label: `Resolved (${resolvedCount})`, activeBg: "bg-neo-green text-black" },
            ] as { id: string; label: string; activeBg: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`cursor-pointer border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-neo-xs transition-all duration-100 ease-linear active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                statusFilter === f.id ? f.activeBg : "bg-white text-black hover:bg-neo-yellow"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Feed */}
      <div className="space-y-5">
        {filteredFeedbacks.length === 0 ? (
          <div className="border-4 border-dashed border-black bg-white p-12 text-center shadow-neo-sm">
            <ShieldCheck className="mx-auto mb-2 h-10 w-10 text-black" strokeWidth={2.5} />
            <h3 className="font-black uppercase tracking-wide text-black">No complaints matching filter</h3>
            <p className="mt-1 text-xs font-bold text-black/60">
              Your tables are generating 5-star Google reviews seamlessly.
            </p>
          </div>
        ) : (
          filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className={`border-4 border-black bg-white p-6 shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-neo-md ${
                fb.status === "new" ? "bg-neo-yellow" : "bg-white"
              }`}
            >
              <div className="flex flex-col items-start justify-between gap-3 border-b-[3px] border-black pb-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 stroke-[1.5] ${
                          i < fb.rating ? "fill-neo-yellow text-black" : "fill-white text-black/30"
                        }`}
                      />
                    ))}
                  </div>

                  <div>
                    <span className="mr-2 text-sm font-black uppercase tracking-wide text-black">{fb.storeName}</span>
                    {fb.tableNumber && (
                      <span className="border-2 border-black bg-white px-2 py-0.5 font-mono text-xs font-black text-black shadow-neo-xs">
                        Table #{fb.tableNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`border-2 border-black px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs ${statusBadge(
                      fb.status
                    )}`}
                  >
                    {fb.status}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-black/50">
                    {new Date(fb.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Message content */}
              <div className="py-4">
                <p className="border-[3px] border-black bg-cream p-4 text-sm font-bold italic leading-relaxed text-black">
                  &ldquo;{fb.message}&rdquo;
                </p>
              </div>

              {/* Footer info & resolution buttons */}
              <div className="flex flex-col items-start justify-between gap-4 pt-2 text-xs sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-3 font-bold text-black/60">
                  <span className="font-black uppercase tracking-wide text-black">
                    Guest: {fb.customerName || "Anonymous Diner"}
                  </span>
                  {fb.customerContact && (
                    <span className="border-2 border-black bg-white px-2 py-0.5 font-mono font-bold text-black shadow-neo-xs">
                      {fb.customerContact}
                    </span>
                  )}
                  {fb.alert?.status === "sent" && (
                    <span
                      className="flex items-center gap-1 border-2 border-black bg-neo-green px-2 py-0.5 font-black uppercase tracking-widest text-black shadow-neo-xs"
                      // `alert` is a raw JSONB column, so `recipients` can be
                      // absent on rows written by an older code path. Guard the
                      // array instead of assuming the type held.
                      title={`Alerted: ${(fb.alert.recipients || []).join(", ")}`}
                    >
                      <Check className="h-3 w-3" strokeWidth={4} /> Owners alerted
                    </span>
                  )}
                  {fb.alert?.status === "failed" && (
                    <span
                      className="border-2 border-black bg-neo-red px-2 py-0.5 font-black uppercase tracking-widest text-black shadow-neo-xs"
                      title={fb.alert.error || "Email delivery failed"}
                    >
                      Alert failed
                    </span>
                  )}
                  {fb.alert?.status === "skipped" && (
                    <span
                      className="border-2 border-black bg-neo-yellow px-2 py-0.5 font-black uppercase tracking-widest text-black shadow-neo-xs"
                      title={fb.alert.error || "No owner email configured"}
                    >
                      No owner inbox
                    </span>
                  )}
                </div>

                {/* Status action toggles */}
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  {fb.status !== "reviewed" && (
                    <button
                      onClick={() => handleUpdateStatus(fb.id, "reviewed")}
                      className="flex cursor-pointer items-center gap-1 border-[3px] border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      <Clock className="h-3.5 w-3.5" strokeWidth={3} /> Mark contacted
                    </button>
                  )}
                  {fb.status !== "resolved" && (
                    <button
                      onClick={() => handleUpdateStatus(fb.id, "resolved")}
                      className="flex cursor-pointer items-center gap-1 border-[3px] border-black bg-neo-green px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      <CheckCircle className="h-3.5 w-3.5" strokeWidth={3} /> Mark resolved
                    </button>
                  )}
                  {fb.status === "resolved" && (
                    <span className="flex items-center gap-1 font-black uppercase tracking-widest text-black">
                      <Check className="h-4 w-4" strokeWidth={4} /> Reconciled &amp; saved
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
