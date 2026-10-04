import React from "react";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck, Zap, IndianRupee } from "lucide-react";
import { getActivePlansOrDefaults } from "@/lib/billing-data";
import { paiseToRupees } from "@/lib/billing";
import { withGst } from "@/lib/plans";

// Prices are super-admin controlled and can change at any time, so this page
// reads the catalogue at request time rather than baking build-time numbers
// into the marketing site.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing | Credo — restaurant review & menu SaaS",
  description:
    "Straightforward monthly pricing for independent Indian restaurants. One QR for 5-star Google reviews and a live digital menu. GST invoice included.",
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export default async function PricingPage() {
  const plans = await getActivePlansOrDefaults();

  return (
    <div className="min-h-screen bg-cream bg-neo-grid font-sans text-black">
      <nav className="sticky top-0 z-50 border-b-4 border-black bg-white px-4 py-3.5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center border-[3px] border-black bg-neo-yellow font-black shadow-neo-xs">
              ⚡
            </span>
            <span>Credo</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 border-2 border-black bg-neo-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-neo-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={3} />
            Back
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block border-2 border-black bg-neo-yellow px-3 py-1 text-[11px] font-black uppercase tracking-widest shadow-neo-xs">
            Pricing
          </span>
          <h1 className="mt-4 text-4xl font-black uppercase leading-tight tracking-tight sm:text-5xl">
            One QR. Reviews &amp; menu. Per month.
          </h1>
          <p className="mt-4 text-sm font-bold leading-relaxed text-black/70">
            Prices in rupees, billed monthly or yearly. Every plan includes the
            printed table standee, the live digital menu, and a GST tax invoice
            your accountant can file.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-12 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const rupees = paiseToRupees(plan.priceInr);
            const gst = withGst(rupees, plan.gstPercent);
            const isAnnual = plan.period === "annual";
            const perMonth = isAnnual ? Math.round(rupees / 12) : rupees;
            return (
              <section
                key={plan.id}
                className={`flex flex-col border-4 border-black bg-white shadow-neo-md ${
                  plan.featured ? "lg:-translate-y-3" : ""
                }`}
              >
                {plan.featured && (
                  <div className="border-b-4 border-black bg-neo-green px-4 py-1.5 text-center text-[11px] font-black uppercase tracking-widest">
                    Most popular
                  </div>
                )}
                <div className="border-b-4 border-black bg-neo-yellow px-5 py-4">
                  <h2 className="text-lg font-black uppercase tracking-tight">{plan.name}</h2>
                  <p className="mt-1 text-xs font-bold text-black/70">{plan.tagline}</p>
                </div>

                <div className="border-b-4 border-black px-5 py-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-black tabular-nums">
                      {inr(rupees)}
                    </span>
                    <span className="text-xs font-black uppercase tracking-widest text-black/60">
                      /{isAnnual ? "year" : "month"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] font-bold text-black/60">
                    + {inr(gst - rupees)} GST ={" "}
                    <span className="font-black">{inr(gst)}</span> payable
                  </p>
                  {isAnnual && (
                    <p className="mt-0.5 text-[11px] font-bold text-black/50">
                      Works out to {inr(perMonth)}/month, billed once a year
                    </p>
                  )}
                </div>

                <ul className="flex-1 space-y-2.5 px-5 py-5">
                  <li className="flex items-start gap-2 text-xs font-black uppercase tracking-widest">
                    <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                    {plan.maxLocations} {plan.maxLocations === 1 ? "location" : "locations"}
                  </li>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-bold leading-relaxed">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="border-t-4 border-black p-5">
                  <a
                    href="mailto:sales@credo.app?subject=Credo%20%2F%20pricing%20enquiry"
                    className={`flex w-full items-center justify-center gap-2 border-4 border-black px-4 py-3 text-xs font-black uppercase tracking-widest shadow-neo transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                      plan.featured ? "bg-neo-red text-white" : "bg-neo-yellow text-black"
                    }`}
                  >
                    <IndianRupee className="h-3.5 w-3.5" strokeWidth={3} />
                    Start with {plan.name}
                  </a>
                  <p className="mt-2 text-center text-[10px] font-bold text-black/50">
                    No card needed. We set up your standee and QR.
                  </p>
                </div>
              </section>
            );
          })}
        </div>

        {/* Assurances */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              icon: <IndianRupee className="h-5 w-5" strokeWidth={2.5} />,
              title: "Priced in rupees",
              body: "Pay by UPI or bank transfer. Every invoice is a GST tax invoice carrying your GSTIN.",
            },
            {
              icon: <ShieldCheck className="h-5 w-5" strokeWidth={2.5} />,
              title: "No review gating",
              body: "Guests are never blocked from leaving a public Google review — whatever they tap, the Google option stays visible.",
            },
            {
              icon: <Zap className="h-5 w-5" strokeWidth={2.5} />,
              title: "Permanent QR",
              body: "Change your menu, dishes or brand later. The printed standee keeps working — no reprint.",
            },
          ].map((item) => (
            <div key={item.title} className="border-4 border-black bg-white p-5 shadow-neo-sm">
              <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-neo-blue">
                {item.icon}
              </div>
              <h3 className="mt-3 text-sm font-black uppercase tracking-tight">{item.title}</h3>
              <p className="mt-1.5 text-xs font-bold leading-relaxed text-black/70">{item.body}</p>
            </div>
          ))}
        </div>

        {/* FAQ — the questions a restaurant owner actually asks */}
        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-black uppercase tracking-tight">Questions</h2>
          <dl className="mt-5 space-y-4">
            {[
              [
                "Is this legal? Can you force 5-star reviews?",
                "No — and we don't. We pre-draft text so a guest can post in seconds instead of abandoning it, and we never hide the Google option from anyone. Guests who rate 1–3★ get a private route to your manager, not a blocked door.",
              ],
              [
                "What do I need to start?",
                "Your Google Business Profile Place ID and a manager's email. We generate your permanent QR and a print-ready 4x6\" table tent, then a demo page you can scan before you commit.",
              ],
              [
                "Do you take a commission on ad revenue or reservations?",
                "No. Flat monthly price per location, no per-scan fee, no setup cost.",
              ],
              [
                "What happens if I add more locations?",
                "Move up a tier. Your existing QR codes keep working — nothing to reprint.",
              ],
              [
                "Do I need to give you my customers' data?",
                "No. The scan page is anonymous. The only data we hold for a complaint is what the guest typed into the private firewall form.",
              ],
            ].map(([q, a]) => (
              <div key={q} className="border-4 border-black bg-white p-5 shadow-neo-sm">
                <dt className="text-sm font-black">{q}</dt>
                <dd className="mt-1.5 text-xs font-bold leading-relaxed text-black/70">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-4 border-black bg-white px-6 py-3 text-xs font-black uppercase tracking-widest shadow-neo"
          >
            See the 10-second diner flow
          </Link>
        </div>
      </main>
    </div>
  );
}
