"use client";

import { useMemo, useState } from "react";
import { IndianRupee, FileText, Plus, X, RefreshCw, AlertTriangle } from "lucide-react";
import { PERIOD_DAYS } from "@/lib/plans";
import type { PlanConfig, RevenueSummary, Subscription, SubscriptionStatus } from "@/lib/types";

interface StoreOption {
  id: string;
  name: string;
  address?: string;
}

interface Props {
  stores: StoreOption[];
  initialSubscriptions: Subscription[];
  initialSummary: RevenueSummary;
  isSuperAdmin: boolean;
  /** Whether SUPPLIER_GSTIN is configured server-side. Gates invoice generation. */
  supplierGstinConfigured: boolean;
  /**
   * The live plan catalogue.
   *
   * This form used to carry its own hardcoded ₹999/₹2,999/₹14,999 presets, so
   * a price change in /admin/billing silently stopped matching the amounts an
   * operator could record here. MRR is stored per month, so an annual plan is
   * normalised down to its monthly equivalent before it is offered as a value.
   */
  plans: PlanConfig[];
}

/** Monthly-equivalent price in whole rupees for the manual MRR field. */
const monthlyRupeesFor = (plan?: PlanConfig): number =>
  plan ? Math.round((plan.priceInr * 30) / PERIOD_DAYS[plan.period] / 100) : 0;

const inr = (rupees: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);

const dateLabel = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function RevenueClient({
  stores,
  initialSubscriptions,
  initialSummary,
  isSuperAdmin,
  supplierGstinConfigured,
  plans,
}: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [subs, setSubs] = useState(initialSubscriptions);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);

  const [form, setForm] = useState({
    storeId: stores[0]?.id || "",
    plan: plans[0]?.id || "solo",
    mrrRupees: String(monthlyRupeesFor(plans[0])),
    billingPeriod: "monthly",
    gstin: "",
    status: "active" as SubscriptionStatus,
  });

  const byStore = useMemo(() => {
    const m = new Map<string, Subscription>();
    for (const s of subs) m.set(s.storeId, s);
    return m;
  }, [subs]);

  const pickPlan = (plan: string) =>
    setForm((f) => ({ ...f, plan, mrrRupees: String(monthlyRupeesFor(planById.get(plan))) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not save");
        return;
      }
      setSummary(data.summary);
      setSubs((prev) => [...prev.filter((s) => s.storeId !== form.storeId), data.subscription]);
      setShowForm(false);
      // Keep the amount the operator just typed for the next location.
      setForm((f) => ({ ...f, gstin: "" }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (storeId: string, storeName: string) => {
    if (!confirm(`Mark ${storeName} as churned? The record is kept so churn stays measurable.`)) return;
    setError("");
    try {
      const res = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, plan: byStore.get(storeId)?.plan || "solo", status: "churned", mrrRupees: 0, endedAt: new Date().toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not update");
        return;
      }
      setSummary(data.summary);
      setSubs((prev) => [...prev.filter((s) => s.storeId !== storeId), data.subscription]);
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const paying = subs.filter((s) => s.status === "active" || s.status === "trial");
  const churned = subs.filter((s) => s.status === "churned");

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Monthly Revenue", value: inr(summary.mrrRupees), note: "From recorded payments", bg: "bg-neo-yellow" },
          { label: "Annualised", value: inr(summary.arrInr / 100), note: "MRR x 12, not recognised revenue", bg: "bg-neo-blue" },
          { label: "Paying Locations", value: String(summary.payingLocations), note: `${summary.churnedLast30Days} churned in 30d`, bg: "bg-neo-green" },
          { label: "Churned (all time)", value: String(churned.length), note: "Records retained, never deleted", bg: "bg-neo-red" },
        ].map((m) => (
          <div key={m.label} className="border-4 border-black bg-white shadow-neo-sm">
            <div className={`flex items-center justify-between border-b-4 border-black ${m.bg} px-4 py-2.5`}>
              <span className="text-[11px] font-black uppercase tracking-widest text-black">{m.label}</span>
              <IndianRupee className="h-4 w-4 text-black" strokeWidth={3} />
            </div>
            <div className="p-4">
              <div className="text-3xl font-black tabular-nums text-black">{m.value}</div>
              <p className="mt-1.5 border-t-2 border-black pt-1.5 text-[11px] font-bold text-black/60">{m.note}</p>
            </div>
          </div>
        ))}
      </div>

      {!supplierGstinConfigured && (
        <div className="border-4 border-black bg-neo-yellow px-4 py-3 text-xs font-bold leading-relaxed text-black">
          <strong>Tax invoices are unavailable.</strong> Set{" "}
          <code className="border border-black bg-white px-1">SUPPLIER_GSTIN</code> to your
          own 15-character GSTIN (and <code className="border border-black bg-white px-1">SUPPLIER_NAME</code>)
          in the environment. Payments can still be recorded below.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 border-4 border-black bg-neo-red px-4 py-3 text-sm font-black text-black">
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={3} />
          <span>{error}</span>
        </div>
      )}

      {/* Record a payment */}
      <div className="border-4 border-black bg-white shadow-neo-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-black bg-neo-green px-4 py-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-black">Billing Records</h2>
            <p className="text-[11px] font-bold text-black/60">
              Record a UPI or bank transfer here once payment lands.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 border-4 border-black bg-neo-yellow px-3 py-2 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {showForm ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" strokeWidth={3} />}
            {showForm ? "Cancel" : "Record payment"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="space-y-4 p-4">
            {stores.length === 0 ? (
              <p className="text-xs font-bold text-black/60">
                No locations yet. Add a restaurant first.
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-widest text-black/60">Location</span>
                  <select
                    value={form.storeId}
                    onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                    className="mt-1 w-full border-[3px] border-black bg-white px-3 py-2 text-sm font-bold text-black"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-black/60">Plan</span>
                    <select
                      value={form.plan}
                      onChange={(e) => pickPlan(e.target.value)}
                      className="mt-1 w-full border-[3px] border-black bg-white px-3 py-2 text-sm font-bold text-black"
                    >
                      {plans.length === 0 && <option value="solo">Solo — 1 location</option>}
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} — {plan.maxLocations} location
                          {plan.maxLocations === 1 ? "" : "s"} ({inr(monthlyRupeesFor(plan))}/mo)
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-black/60">Amount (₹/month)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.mrrRupees}
                      onChange={(e) => setForm({ ...form, mrrRupees: e.target.value })}
                      className="mt-1 w-full border-[3px] border-black bg-white px-3 py-2 text-sm font-bold text-black"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-black/60">Billing period</span>
                    <select
                      value={form.billingPeriod}
                      onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}
                      className="mt-1 w-full border-[3px] border-black bg-white px-3 py-2 text-sm font-bold text-black"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-black/60">
                      Customer GSTIN <span className="font-bold normal-case text-black/40">(needed for the tax invoice)</span>
                    </span>
                    <input
                      value={form.gstin}
                      onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                      placeholder="29ABCDE1234F1Z5"
                      maxLength={15}
                      className="mt-1 w-full border-[3px] border-black bg-white px-3 py-2 text-sm font-bold uppercase text-black placeholder:text-black/25"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving || !form.storeId}
                  className="flex w-full items-center justify-center gap-2 border-4 border-black bg-neo-yellow px-4 py-3 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 sm:w-auto"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={3} /> : <Plus className="h-3.5 w-3.5" strokeWidth={3} />}
                  {saving ? "Saving…" : "Save record"}
                </button>
              </>
            )}
          </form>
        )}

        {/* Records table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b-4 border-black bg-cream">
              <tr>
                <th className="px-4 py-2.5 font-black uppercase tracking-widest">Location</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-widest">Plan</th>
                <th className="px-4 py-2.5 text-right font-black uppercase tracking-widest">MRR</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-widest">Status</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-widest">Since</th>
                <th className="px-4 py-2.5 font-black uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-bold text-black/50">
                    No billing records yet. Revenue reads ₹0 until the first payment is recorded.
                  </td>
                </tr>
              ) : (
                [...paying, ...churned].map((s) => {
                  const store = stores.find((x) => x.id === s.storeId);
                  const live = s.status !== "churned";
                  return (
                    <tr key={s.id} className="border-b-2 border-black/10">
                      <td className="px-4 py-3 font-bold text-black">{store?.name || s.storeId}</td>
                      <td className="px-4 py-3 font-bold text-black/70">{s.plan}</td>
                      <td className="px-4 py-3 text-right font-black tabular-nums text-black">
                        {inr(s.mrrInr / 100)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase ${
                            s.status === "active"
                              ? "bg-neo-green"
                              : s.status === "trial"
                                ? "bg-neo-blue"
                                : s.status === "churned"
                                  ? "bg-neo-red"
                                  : "bg-cream"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-black/60">{dateLabel(s.startedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/api/revenue/invoice?storeId=${encodeURIComponent(s.storeId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={
                              !supplierGstinConfigured
                                ? "Supplier GSTIN is not configured"
                                : s.gstin
                                  ? "Generate GST tax invoice"
                                  : "Requires the customer's GSTIN on file"
                            }
                            className={`flex items-center gap-1 border-2 border-black px-2 py-1 text-[10px] font-black uppercase ${
                              s.gstin && supplierGstinConfigured
                                ? "bg-neo-yellow"
                                : "pointer-events-none bg-cream opacity-40"
                            }`}
                            aria-disabled={!(s.gstin && supplierGstinConfigured)}
                          >
                            <FileText className="h-3 w-3" strokeWidth={3} /> Invoice
                          </a>
                          {isSuperAdmin && live && (
                            <button
                              type="button"
                              onClick={() => cancel(s.storeId, store?.name || s.storeId)}
                              className="border-2 border-black bg-cream px-2 py-1 text-[10px] font-black uppercase hover:bg-neo-red"
                            >
                              Churn
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
