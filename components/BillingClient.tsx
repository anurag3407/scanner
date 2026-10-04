"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Percent,
  Plus,
  RefreshCw,
  Timer,
  X,
} from "lucide-react";
import type { Coupon, Payment, PlanConfig, StoreEntitlement, Subscription } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Razorpay (loaded on demand from checkout.razorpay.com)                     */
/* -------------------------------------------------------------------------- */

interface CheckoutSession {
  kind: "order" | "activated";
  razorpay?: {
    keyId: string;
    orderId: string;
    amountInr: number;
    currency: string;
    name: string;
    description: string;
  };
  subscription?: Subscription | null;
  entitlement: StoreEntitlement;
}

interface RazorpayCallback {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  notes?: Record<string, string>;
  prefill?: Record<string, string | undefined>;
  theme?: { color?: string };
  handler: (response: RazorpayCallback) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/** Loads checkout.js once. Resolves false instead of throwing on failure. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "1";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);

const dateLabel = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const inputClass =
  "mt-1 w-full border-[3px] border-black bg-white px-3 py-2 text-sm font-bold text-black";
const labelClass = "block text-[11px] font-black uppercase tracking-widest text-black/60";
const buttonClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 border-4 border-black px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-1 active:translate-y-1 active:shadow-none";

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init?.method || "GET",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "Network error" } as T };
  }
}

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface LocationOption {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  locations: LocationOption[];
  plans: PlanConfig[];
  coupons: Coupon[];
  isSuperAdmin: boolean;
  gatewayConfigured: boolean;
  webhookConfigured: boolean;
}

interface PlanDraft {
  name: string;
  tagline: string;
  priceRupees: string;
  period: "monthly" | "annual";
  maxLocations: string;
  gstPercent: string;
  features: string;
  featured: boolean;
  isActive: boolean;
  sortOrder: string;
}

const draftFrom = (plan: PlanConfig): PlanDraft => ({
  name: plan.name,
  tagline: plan.tagline,
  priceRupees: String(plan.priceInr / 100),
  period: plan.period,
  maxLocations: String(plan.maxLocations),
  gstPercent: String(plan.gstPercent),
  features: plan.features.join("\n"),
  featured: plan.featured === true,
  isActive: plan.isActive,
  sortOrder: String(plan.sortOrder),
});

export default function BillingClient({
  locations,
  plans: initialPlans,
  coupons: initialCoupons,
  isSuperAdmin,
  gatewayConfigured,
  webhookConfigured,
}: Props) {
  const [selected, setSelected] = useState(locations[0]?.id || "");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlement, setEntitlement] = useState<StoreEntitlement | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const [checkout, setCheckout] = useState({ planId: "", couponCode: "", gstin: "" });
  const [trialMinutes, setTrialMinutes] = useState("30");

  const [plans, setPlans] = useState(initialPlans);
  const [planDrafts, setPlanDrafts] = useState<Record<string, PlanDraft>>(() =>
    Object.fromEntries(initialPlans.map((p) => [p.id, draftFrom(p)]))
  );
  const [newPlan, setNewPlan] = useState({
    id: "",
    name: "",
    priceRupees: "",
    period: "monthly" as "monthly" | "annual",
    maxLocations: "1",
    tagline: "",
  });

  const [coupons, setCoupons] = useState(initialCoupons);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "percent" as "percent" | "amount",
    discountValue: "",
    maxRedemptions: "",
    expiresAt: "",
    planId: "",
    note: "",
  });

  const activePlans = useMemo(() => plans.filter((p) => p.isActive), [plans]);
  const location = useMemo(
    () => locations.find((l) => l.id === selected),
    [locations, selected]
  );
  // The chosen plan, falling back to the cheapest on sale without needing an
  // effect to write it into state.
  const selectedPlanId = checkout.planId || activePlans[0]?.id || "";

  const refresh = useCallback(async () => {
    if (!selected) return;
    const res = await api<{
      subscription: Subscription | null;
      entitlement: StoreEntitlement | null;
      payments: Payment[];
    }>(`/api/billing/subscription?storeId=${encodeURIComponent(selected)}`);
    if (res.ok) {
      setSubscription(res.data.subscription);
      setEntitlement(res.data.entitlement);
      setPayments(res.data.payments || []);
    }
  }, [selected]);

  useEffect(() => {
    // Deferred to a task: this effect synchronizes with the server, it must
    // not synchronously set state while React is still rendering.
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  /* ---- subscription actions ------------------------------------------- */

  const startCheckout = async () => {
    if (!selected || !selectedPlanId) return;
    setBusy(true);
    setNotice(null);

    const res = await api<{ checkout: CheckoutSession; error?: string }>("/api/billing/checkout", {
      method: "POST",
      body: {
        storeId: selected,
        planId: selectedPlanId,
        couponCode: checkout.couponCode.trim() || undefined,
        gstin: checkout.gstin.trim() || undefined,
      },
    });

    if (!res.ok) {
      setNotice({ tone: "bad", text: res.data?.error || "Could not start the checkout." });
      setBusy(false);
      return;
    }

    const session = res.data.checkout;
    if (session.kind === "activated") {
      setNotice({
        tone: "ok",
        text: "Activated — that coupon covered the full amount, so no payment was needed.",
      });
      await refresh();
      setBusy(false);
      return;
    }

    const gateway = session.razorpay;
    if (!gateway) {
      setNotice({ tone: "bad", text: "The checkout order was missing. Please try again." });
      setBusy(false);
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) {
      setNotice({
        tone: "bad",
        text: "Could not load the Razorpay checkout. Check your connection, or record the transfer from Revenue & Billing.",
      });
      setBusy(false);
      return;
    }

    const razorpay = new window.Razorpay({
      key: gateway.keyId,
      amount: gateway.amountInr,
      currency: gateway.currency,
      name: gateway.name,
      description: gateway.description,
      order_id: gateway.orderId,
      notes: { storeId: selected },
      prefill: { name: location?.name },
      theme: { color: "#e11d48" },
      handler: async (response) => {
        const verified = await api<{ error?: string }>("/api/billing/verify", {
          method: "POST",
          body: {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
        });
        setNotice(
          verified.ok
            ? { tone: "ok", text: "Payment received — the subscription is active." }
            : {
                tone: "bad",
                text:
                  verified.data?.error ||
                  "Payment received but not confirmed yet. It will apply automatically from the gateway webhook.",
              }
        );
        await refresh();
        setBusy(false);
      },
      modal: {
        ondismiss: () => {
          setBusy(false);
          void refresh();
        },
      },
    });

    razorpay.on("payment.failed", (response) => {
      setNotice({
        tone: "bad",
        text: response?.error?.description || "The payment did not go through.",
      });
      void refresh();
      setBusy(false);
    });

    razorpay.open();
  };

  const startTrial = async () => {
    setBusy(true);
    const res = await api<{ error?: string }>("/api/billing/subscription", {
      method: "PATCH",
      body: { storeId: selected, action: "start_trial", trialMinutes: Number(trialMinutes) },
    });
    setNotice(
      res.ok
        ? { tone: "ok", text: "Trial restarted." }
        : { tone: "bad", text: res.data?.error || "Could not start the trial." }
    );
    await refresh();
    setBusy(false);
  };

  const cancelSubscription = async () => {
    if (!confirm(`End the subscription for ${location?.name}? The record is kept so churn stays measurable.`)) {
      return;
    }
    setBusy(true);
    const res = await api<{ error?: string }>("/api/billing/subscription", {
      method: "PATCH",
      body: { storeId: selected, action: "cancel" },
    });
    setNotice(
      res.ok
        ? { tone: "ok", text: "Subscription cancelled." }
        : { tone: "bad", text: res.data?.error || "Could not cancel." }
    );
    await refresh();
    setBusy(false);
  };

  /* ---- plan catalogue -------------------------------------------------- */

  const savePlan = async (plan: PlanConfig) => {
    const draft = planDrafts[plan.id];
    if (!draft) return;
    setBusy(true);
    const res = await api<{ plan?: PlanConfig; error?: string }>("/api/billing/plans", {
      method: "PATCH",
      body: {
        id: plan.id,
        name: draft.name,
        tagline: draft.tagline,
        priceRupees: draft.priceRupees,
        period: draft.period,
        maxLocations: Number(draft.maxLocations),
        gstPercent: Number(draft.gstPercent),
        features: draft.features.split("\n").map((f) => f.trim()).filter(Boolean),
        featured: draft.featured,
        isActive: draft.isActive,
        sortOrder: Number(draft.sortOrder),
      },
    });
    if (res.ok && res.data.plan) {
      const updated = res.data.plan;
      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setPlanDrafts((prev) => ({ ...prev, [updated.id]: draftFrom(updated) }));
      setNotice({ tone: "ok", text: `${updated.name} updated. New prices apply to the next checkout.` });
    } else {
      setNotice({ tone: "bad", text: res.data?.error || "Could not save the plan." });
    }
    setBusy(false);
  };

  const createPlan = async () => {
    setBusy(true);
    const res = await api<{ plan?: PlanConfig; error?: string }>("/api/billing/plans", {
      method: "POST",
      body: { ...newPlan, maxLocations: Number(newPlan.maxLocations) },
    });
    if (res.ok && res.data.plan) {
      const created = res.data.plan;
      setPlans((prev) => [...prev, created]);
      setPlanDrafts((prev) => ({ ...prev, [created.id]: draftFrom(created) }));
      setNewPlan({ id: "", name: "", priceRupees: "", period: "monthly", maxLocations: "1", tagline: "" });
      setNotice({ tone: "ok", text: `${created.name} is now on sale.` });
    } else {
      setNotice({ tone: "bad", text: res.data?.error || "Could not create the plan." });
    }
    setBusy(false);
  };

  /* ---- coupons --------------------------------------------------------- */

  const createCoupon = async () => {
    setBusy(true);
    const res = await api<{ coupon?: Coupon; error?: string }>("/api/billing/coupons", {
      method: "POST",
      body: {
        code: newCoupon.code,
        discountType: newCoupon.discountType,
        discountValue: newCoupon.discountValue,
        maxRedemptions: newCoupon.maxRedemptions || undefined,
        expiresAt: newCoupon.expiresAt || undefined,
        planId: newCoupon.planId || undefined,
        note: newCoupon.note || undefined,
      },
    });
    if (res.ok && res.data.coupon) {
      const created = res.data.coupon;
      setCoupons((prev) => [created, ...prev]);
      setNewCoupon({
        code: "",
        discountType: "percent",
        discountValue: "",
        maxRedemptions: "",
        expiresAt: "",
        planId: "",
        note: "",
      });
      setNotice({ tone: "ok", text: `Coupon ${created.code} created.` });
    } else {
      setNotice({ tone: "bad", text: res.data?.error || "Could not create the coupon." });
    }
    setBusy(false);
  };

  const toggleCoupon = async (coupon: Coupon) => {
    setBusy(true);
    const res = await api<{ coupon?: Coupon; error?: string }>("/api/billing/coupons", {
      method: "PATCH",
      body: { id: coupon.id, isActive: !coupon.isActive },
    });
    if (res.ok && res.data.coupon) {
      const updated = res.data.coupon;
      setCoupons((prev) => prev.map((c) => (c.id === updated.id ? { ...updated, timesRedeemed: coupon.timesRedeemed } : c)));
    } else {
      setNotice({ tone: "bad", text: res.data?.error || "Could not update the coupon." });
    }
    setBusy(false);
  };

  /* ---- render ---------------------------------------------------------- */

  if (locations.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6 sm:p-10">
        <h1 className="text-3xl font-black uppercase tracking-tight">Billing &amp; Plans</h1>
        <p className="mt-3 border-4 border-black bg-white p-5 text-sm font-bold text-black/70 shadow-neo-sm">
          No locations are assigned to you yet. A super admin creates a location and assigns it
          before billing applies.
        </p>
      </main>
    );
  }

  const selectedPlan = activePlans.find((p) => p.id === selectedPlanId) || activePlans[0];
  const quotedTotal = selectedPlan
    ? selectedPlan.priceInr +
      Math.round((selectedPlan.priceInr * selectedPlan.gstPercent) / 100)
    : 0;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-6 sm:p-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-black uppercase tracking-tight text-black sm:text-4xl">
          Billing &amp; Plans
        </h1>
        <p className="max-w-2xl text-sm font-bold text-black/60">
          Menu customisation stays unlocked while a location is in trial or paid. Prices and
          coupons are set here and apply to the next checkout — no redeploy.
        </p>
      </div>

      {(!gatewayConfigured || !webhookConfigured) && (
        <div className="flex items-start gap-3 border-4 border-black bg-neo-yellow p-4 text-xs font-bold shadow-neo-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
          <p className="leading-relaxed">
            {!gatewayConfigured && (
              <>
                <strong>Online payments are not configured.</strong> Set RAZORPAY_KEY_ID and
                RAZORPAY_KEY_SECRET to take money online.{" "}
              </>
            )}
            {!webhookConfigured && (
              <>
                <strong>The gateway webhook is not configured.</strong> Without
                RAZORPAY_WEBHOOK_SECRET, a payment only applies if the customer finishes in the
                browser — a customer who closes the tab would not be activated.
              </>
            )}
            Until then, record bank transfers by hand from Revenue &amp; Billing.
          </p>
        </div>
      )}

      {notice && (
        <div
          className={`flex items-start gap-3 border-4 border-black p-4 text-xs font-bold shadow-neo-sm ${
            notice.tone === "ok" ? "bg-neo-green" : "bg-neo-red text-white"
          }`}
        >
          {notice.tone === "ok" ? (
            <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={3} />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
          )}
          <p className="leading-relaxed">{notice.text}</p>
        </div>
      )}

      {/* ---------------- Location + subscription ---------------- */}
      <section className="space-y-4">
        <label className="block">
          <span className={labelClass}>Location</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={inputClass}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-4 border-4 border-black bg-white p-5 shadow-neo-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-widest">Current subscription</h2>
              <button
                type="button"
                onClick={() => void refresh()}
                className="cursor-pointer border-2 border-black bg-cream p-1.5 shadow-neo-xs"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>

            {entitlement ? (
              <>
                <p
                  className={`inline-block border-2 border-black px-2.5 py-1 font-mono text-[11px] font-black uppercase tracking-widest ${
                    entitlement.entitled ? "bg-neo-green" : "bg-neo-red text-white"
                  }`}
                >
                  {entitlement.entitled ? entitlement.state : "locked"}
                </p>
                <dl className="space-y-1.5 text-xs font-bold text-black/70">
                  <div className="flex justify-between gap-4">
                    <dt>Plan</dt>
                    <dd className="font-black text-black">
                      {subscription?.plan ? `${entitlement.planName} (${subscription.plan})` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Recurring</dt>
                    <dd className="font-black text-black">
                      {subscription ? `${inr(subscription.mrrInr)} / month` : "—"}
                    </dd>
                  </div>
                  {entitlement.state === "trial" && (
                    <div className="flex justify-between gap-4">
                      <dt>Trial ends</dt>
                      <dd className="font-black text-black">
                        {dateLabel(entitlement.trialEndsAt)} ({entitlement.trialMinutesRemaining} min left)
                      </dd>
                    </div>
                  )}
                  {(entitlement.state === "active" || entitlement.state === "paused") && (
                    <div className="flex justify-between gap-4">
                      <dt>Paid until</dt>
                      <dd className="font-black text-black">
                        {dateLabel(entitlement.currentPeriodEnd)} ({entitlement.daysRemaining} days left)
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt>Locations included</dt>
                    <dd className="font-black text-black">{entitlement.maxLocations}</dd>
                  </div>
                </dl>
                {entitlement.reason && (
                  <p className="border-2 border-black bg-cream p-2.5 text-[11px] font-bold leading-relaxed text-black/70">
                    {entitlement.reason}
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs font-bold text-black/60">Loading subscription…</p>
            )}

            {isSuperAdmin && (
              <div className="space-y-3 border-t-[3px] border-black pt-4">
                <span className={labelClass}>Platform owner actions</span>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="text-[11px] font-bold text-black/60">Trial minutes</span>
                    <input
                      type="number"
                      min={5}
                      value={trialMinutes}
                      onChange={(e) => setTrialMinutes(e.target.value)}
                      className="mt-1 w-32 border-[3px] border-black bg-white px-3 py-2 text-sm font-bold"
                    />
                  </label>
                  <button type="button" disabled={busy} onClick={() => void startTrial()} className={`${buttonClass} bg-neo-yellow`}>
                    <Timer className="h-3.5 w-3.5" strokeWidth={3} /> Start trial
                  </button>
                  <button type="button" disabled={busy} onClick={() => void cancelSubscription()} className={`${buttonClass} bg-white`}>
                    <X className="h-3.5 w-3.5" strokeWidth={3} /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 border-4 border-black bg-white p-5 shadow-neo-sm">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <CreditCard className="h-4 w-4" strokeWidth={2.5} /> Subscribe / renew
            </h2>

            <label className="block">
              <span className={labelClass}>Plan</span>
              <select
                value={selectedPlanId}
                onChange={(e) => setCheckout((c) => ({ ...c, planId: e.target.value }))}
                className={inputClass}
              >
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {inr(plan.priceInr)} / {plan.period === "annual" ? "year" : "month"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>
                Coupon <span className="font-bold normal-case text-black/40">(optional)</span>
              </span>
              <input
                value={checkout.couponCode}
                onChange={(e) => setCheckout((c) => ({ ...c, couponCode: e.target.value }))}
                placeholder="LAUNCH10"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                GSTIN <span className="font-bold normal-case text-black/40">(for your tax invoice)</span>
              </span>
              <input
                value={checkout.gstin}
                onChange={(e) => setCheckout((c) => ({ ...c, gstin: e.target.value }))}
                placeholder="29ABCDE1234F1Z5"
                className={inputClass}
              />
            </label>

            <div className="flex items-center justify-between border-t-[3px] border-black pt-3 text-xs font-bold">
              <span className="text-black/60">Due now (incl. GST)</span>
              <span className="font-black text-black">{inr(quotedTotal)}</span>
            </div>

            <button
              type="button"
              disabled={busy || !selectedPlan}
              onClick={() => void startCheckout()}
              className={`${buttonClass} w-full ${entitlement?.entitled ? "bg-white" : "bg-neo-red text-white"}`}
            >
              <CreditCard className="h-3.5 w-3.5" strokeWidth={3} />
              {busy ? "Working…" : `Pay ${inr(quotedTotal)}`}
            </button>
            <p className="text-[11px] font-bold text-black/50">
              Renewing early adds a period to the one you have paid for — nothing is lost.
            </p>
          </div>
        </div>

        <div className="border-4 border-black bg-white p-5 shadow-neo-sm">
          <h2 className="text-sm font-black uppercase tracking-widest">Payment history</h2>
          {payments.length === 0 ? (
            <p className="mt-2 text-xs font-bold text-black/60">
              No payments recorded for this location yet.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-xs">
                <thead>
                  <tr className="border-b-[3px] border-black font-black uppercase tracking-widest">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Coupon</th>
                    <th className="py-2">Confirmed by</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b-2 border-black/10 font-bold">
                      <td className="py-2 pr-3">{dateLabel(p.paidAt || p.createdAt)}</td>
                      <td className="py-2 pr-3">{p.planId}</td>
                      <td className="py-2 pr-3">{inr(p.amountInr)}</td>
                      <td className="py-2 pr-3 uppercase">{p.status}</td>
                      <td className="py-2 pr-3">{p.couponCode || "—"}</td>
                      <td className="py-2">
                        {p.confirmedVia || "—"}
                        {!p.signatureVerified && p.status === "paid" ? " (unsigned!)" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Plans (super admin) ---------------- */}
      {isSuperAdmin && (
        <section className="space-y-4">
          <h2 className="text-2xl font-black uppercase tracking-tight">Plan catalogue</h2>
          <p className="max-w-2xl text-xs font-bold text-black/60">
            Prices are stored, not compiled in. Existing subscribers keep the amount they were
            sold at; everyone else sees the new price on their next checkout.
          </p>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {plans.map((plan) => {
              const draft = planDrafts[plan.id];
              if (!draft) return null;
              return (
                <div
                  key={plan.id}
                  className={`space-y-3 border-4 border-black p-5 shadow-neo-sm ${
                    plan.isActive ? "bg-white" : "bg-cream"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[11px] font-black uppercase tracking-widest text-black/50">
                      {plan.id}
                    </span>
                    <span className="flex items-center gap-2">
                      {plan.featured && (
                        <span className="border-2 border-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase">
                          Featured
                        </span>
                      )}
                      {!plan.isActive && (
                        <span className="border-2 border-black bg-neo-red px-2 py-0.5 text-[10px] font-black uppercase text-white">
                          Withdrawn
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Name</span>
                      <input
                        value={draft.name}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, name: e.target.value } }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Price (₹)</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={draft.priceRupees}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, priceRupees: e.target.value } }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Billed</span>
                      <select
                        value={draft.period}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({
                            ...prev,
                            [plan.id]: { ...draft, period: e.target.value as "monthly" | "annual" },
                          }))
                        }
                        className={inputClass}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelClass}>Locations</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.maxLocations}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({
                            ...prev,
                            [plan.id]: { ...draft, maxLocations: e.target.value },
                          }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>GST %</span>
                      <input
                        type="number"
                        min={0}
                        max={28}
                        step="0.01"
                        value={draft.gstPercent}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, gstPercent: e.target.value } }))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Order</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.sortOrder}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, sortOrder: e.target.value } }))
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Tagline</span>
                    <input
                      value={draft.tagline}
                      onChange={(e) =>
                        setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, tagline: e.target.value } }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Features (one per line)</span>
                    <textarea
                      rows={4}
                      value={draft.features}
                      onChange={(e) =>
                        setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, features: e.target.value } }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                      <input
                        type="checkbox"
                        checked={draft.featured}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, featured: e.target.checked } }))
                        }
                      />
                      Featured
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(e) =>
                          setPlanDrafts((prev) => ({ ...prev, [plan.id]: { ...draft, isActive: e.target.checked } }))
                        }
                      />
                      On sale
                    </label>
                    <button type="button" disabled={busy} onClick={() => void savePlan(plan)} className={`${buttonClass} ml-auto bg-neo-yellow`}>
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 border-4 border-black bg-white p-5 shadow-neo-sm">
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Plus className="h-4 w-4" strokeWidth={3} /> New plan
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Id</span>
                <input
                  value={newPlan.id}
                  onChange={(e) => setNewPlan((p) => ({ ...p, id: e.target.value }))}
                  placeholder="growth"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Name</span>
                <input
                  value={newPlan.name}
                  onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Price (₹)</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={newPlan.priceRupees}
                  onChange={(e) => setNewPlan((p) => ({ ...p, priceRupees: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Billed</span>
                <select
                  value={newPlan.period}
                  onChange={(e) => setNewPlan((p) => ({ ...p, period: e.target.value as "monthly" | "annual" }))}
                  className={inputClass}
                >
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Locations</span>
                <input
                  type="number"
                  min={1}
                  value={newPlan.maxLocations}
                  onChange={(e) => setNewPlan((p) => ({ ...p, maxLocations: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Tagline</span>
                <input
                  value={newPlan.tagline}
                  onChange={(e) => setNewPlan((p) => ({ ...p, tagline: e.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
            <button type="button" disabled={busy} onClick={() => void createPlan()} className={`${buttonClass} bg-neo-yellow`}>
              <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Create plan
            </button>
          </div>
        </section>
      )}

      {/* ---------------- Coupons (super admin) ---------------- */}
      {isSuperAdmin && (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
            <Percent className="h-6 w-6" strokeWidth={2.5} /> Coupons
          </h2>
          <p className="max-w-2xl text-xs font-bold text-black/60">
            Discounts are applied before GST, so the customer is taxed only on what they actually
            pay. Redemption counts come from the ledger, never a counter, so a retried payment
            cannot use up an extra slot.
          </p>

          <div className="overflow-x-auto border-4 border-black bg-white p-5 shadow-neo-sm">
            {coupons.length === 0 ? (
              <p className="text-xs font-bold text-black/60">No coupons issued yet.</p>
            ) : (
              <table className="w-full min-w-[42rem] text-left text-xs">
                <thead>
                  <tr className="border-b-[3px] border-black font-black uppercase tracking-widest">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Discount</th>
                    <th className="py-2 pr-3">Used</th>
                    <th className="py-2 pr-3">Expires</th>
                    <th className="py-2 pr-3">Scope</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="border-b-2 border-black/10 font-bold">
                      <td className="py-2 pr-3 font-mono">{coupon.code}</td>
                      <td className="py-2 pr-3">
                        {coupon.discountType === "percent"
                          ? `${coupon.discountValue}%`
                          : `${inr(coupon.discountValue)}`}
                      </td>
                      <td className="py-2 pr-3">
                        {coupon.timesRedeemed}
                        {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
                      </td>
                      <td className="py-2 pr-3">{coupon.expiresAt ? dateLabel(coupon.expiresAt) : "never"}</td>
                      <td className="py-2 pr-3">
                        {[coupon.planId, coupon.storeId].filter(Boolean).join(" · ") || "any"}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleCoupon(coupon)}
                          className={`cursor-pointer border-2 border-black px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                            coupon.isActive ? "bg-neo-green" : "bg-neo-red text-white"
                          }`}
                        >
                          {coupon.isActive ? "Live — withdraw" : "Withdrawn — restore"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-3 border-4 border-black bg-white p-5 shadow-neo-sm">
            <h3 className="text-sm font-black uppercase tracking-widest">Issue a coupon</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block">
                <span className={labelClass}>Code</span>
                <input
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon((c) => ({ ...c, code: e.target.value }))}
                  placeholder="LAUNCH10"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Type</span>
                <select
                  value={newCoupon.discountType}
                  onChange={(e) =>
                    setNewCoupon((c) => ({ ...c, discountType: e.target.value as "percent" | "amount" }))
                  }
                  className={inputClass}
                >
                  <option value="percent">Percentage off</option>
                  <option value="amount">Fixed amount off</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>{newCoupon.discountType === "percent" ? "Percent" : "Amount (₹)"}</span>
                <input
                  type="number"
                  min={0}
                  step={newCoupon.discountType === "percent" ? "1" : "0.5"}
                  value={newCoupon.discountValue}
                  onChange={(e) => setNewCoupon((c) => ({ ...c, discountValue: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Limit (blank = unlimited)</span>
                <input
                  type="number"
                  min={1}
                  value={newCoupon.maxRedemptions}
                  onChange={(e) => setNewCoupon((c) => ({ ...c, maxRedemptions: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Expires</span>
                <input
                  type="date"
                  value={newCoupon.expiresAt}
                  onChange={(e) => setNewCoupon((c) => ({ ...c, expiresAt: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className={labelClass}>Plan (blank = any)</span>
                <select
                  value={newCoupon.planId}
                  onChange={(e) => setNewCoupon((c) => ({ ...c, planId: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Any plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Note (why it was issued)</span>
              <input
                value={newCoupon.note}
                onChange={(e) => setNewCoupon((c) => ({ ...c, note: e.target.value }))}
                placeholder="Launch promotion, March"
                className={inputClass}
              />
            </label>
            <button type="button" disabled={busy} onClick={() => void createCoupon()} className={`${buttonClass} bg-neo-yellow`}>
              <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Issue coupon
            </button>
          </div>
        </section>
      )}
    </main>
  );
}