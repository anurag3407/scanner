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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            Reputation Firewall Engine
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Private Manager Feedback Inbox
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Diners who rated 1–3 stars were intercepted here before posting a public 1-star Google review.
          </p>
        </div>

        {/* Protection Metric */}
        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold block">{feedbacks.length} Negative Reviews Intercepted</span>
            <span className="text-[11px] text-emerald-700">Prevented Google rating drops</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Intercepted
          </span>
          <div className="mt-1 text-2xl font-black text-zinc-900">{feedbacks.length}</div>
          <p className="text-[11px] text-zinc-500 mt-0.5">1-3 star dining experiences</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
            Needs GM Attention
          </span>
          <div className="mt-1 text-2xl font-black text-rose-600">{newCount}</div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Pending table-side resolution</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Resolved by Management
          </span>
          <div className="mt-1 text-2xl font-black text-emerald-700">{resolvedCount}</div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Guest reconciled on the spot</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-500">Filter Location:</span>
          <select
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Locations ({stores.length})</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "all" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            All ({feedbacks.length})
          </button>
          <button
            onClick={() => setStatusFilter("new")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "new" ? "bg-rose-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            New ({newCount})
          </button>
          <button
            onClick={() => setStatusFilter("resolved")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "resolved" ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Feedback Feed */}
      <div className="space-y-4">
        {filteredFeedbacks.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border border-zinc-200">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-zinc-900">No complaints matching filter</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Your tables are generating 5-star Google reviews seamlessly.
            </p>
          </div>
        ) : (
          filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className={`bg-white rounded-3xl p-6 border shadow-sm transition-all ${
                fb.status === "new" ? "border-amber-300 ring-1 ring-amber-100" : "border-zinc-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-amber-500 font-bold">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < fb.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`}
                      />
                    ))}
                  </div>

                  <div>
                    <span className="font-bold text-sm text-zinc-900 mr-2">{fb.storeName}</span>
                    {fb.tableNumber && (
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 text-xs font-mono font-bold">
                        Table #{fb.tableNumber}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      fb.status === "new"
                        ? "bg-rose-100 text-rose-700"
                        : fb.status === "reviewed"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {fb.status}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {new Date(fb.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Message content */}
              <div className="py-4">
                <p className="text-zinc-800 text-sm leading-relaxed bg-zinc-50/80 p-4 rounded-2xl border border-zinc-100 italic">
                  &ldquo;{fb.message}&rdquo;
                </p>
              </div>

              {/* Footer info & resolution buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-zinc-500">
                  <span className="font-semibold text-zinc-800">
                    Guest: {fb.customerName || "Anonymous Diner"}
                  </span>
                  {fb.customerContact && (
                    <span className="flex items-center gap-1 font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                      {fb.customerContact}
                    </span>
                  )}
                  {fb.alert?.status === "sent" && (
                    <span
                      className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium"
                      title={`Alerted: ${fb.alert.recipients.join(", ")}`}
                    >
                      <Check className="w-3 h-3 stroke-[3]" /> Owners alerted
                    </span>
                  )}
                  {fb.alert?.status === "failed" && (
                    <span
                      className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-medium"
                      title={fb.alert.error || "Email delivery failed"}
                    >
                      Alert failed
                    </span>
                  )}
                  {fb.alert?.status === "skipped" && (
                    <span
                      className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium"
                      title={fb.alert.error || "No owner email configured"}
                    >
                      No owner inbox
                    </span>
                  )}
                </div>

                {/* Status action toggles */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {fb.status !== "reviewed" && (
                    <button
                      onClick={() => handleUpdateStatus(fb.id, "reviewed")}
                      className="px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition-colors font-medium text-xs flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" /> Mark Contacted
                    </button>
                  )}
                  {fb.status !== "resolved" && (
                    <button
                      onClick={() => handleUpdateStatus(fb.id, "resolved")}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium text-xs flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                    </button>
                  )}
                  {fb.status === "resolved" && (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4 stroke-[3]" /> Reconciled &amp; Saved
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
