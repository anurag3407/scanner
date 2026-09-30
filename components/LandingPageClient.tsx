"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Star,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Printer,
  CheckCircle2,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Store } from "@/lib/types";

interface Props {
  sampleStore: Store | null;
}

export default function LandingPageClient({ sampleStore }: Props) {
  // Live Hero Widget State
  const [rating, setRating] = useState<number>(5);
  const [selectedChips, setSelectedChips] = useState<string[]>(
    sampleStore ? sampleStore.chips.slice(0, 2) : []
  );
  const [copied, setCopied] = useState<boolean>(false);

  // ROI Calculator State
  const [monthlyGuests, setMonthlyGuests] = useState<number>(2400);
  const [averageCheck, setAverageCheck] = useState<number>(45);

  // Calculated ROI
  const estimatedReviewsPerMonth = Math.round(monthlyGuests * 0.055);
  const estimatedRevenueLift = Math.round(monthlyGuests * averageCheck * 0.05); // ~5% lift per Harvard Business Review
  const roiMultiplier = Math.round(estimatedRevenueLift / 69);

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter((c) => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to the legacy path below
      }
    }
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textArea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleTestCopy = async () => {
    await copyToClipboard(getSimulatedReview());
    setCopied(true);
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}
    setTimeout(() => setCopied(false), 3000);
  };

  // Pre-draft text for simulator widget
  const getSimulatedReview = () => {
    const chipsStr = selectedChips.length > 0 ? selectedChips.join(" and ") : "the food and hospitality";
    return `Hands down one of the best dining experiences I've had! The ${chipsStr} was prepared to perfection. Super fast and attentive service. 10/10 recommend to anyone visiting!`;
  };

  return (
    <div className="w-full">
      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-rose-200/40 via-amber-200/40 to-emerald-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="text-center max-w-4xl mx-auto">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900 text-white text-xs font-semibold mb-6 shadow-md hover:bg-black transition-all">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>⚡ Zero-Friction Google Review Engine</span>
            <span className="text-zinc-400">•</span>
            <span className="text-amber-300">0ms first draft</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-zinc-900 tracking-tight leading-[1.08]">
            Turn Table Diners into{" "}
            <span className="bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 bg-clip-text text-transparent">
              5-Star Google Reviews
            </span>{" "}
            in 10 Seconds Flat.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate customer writer&apos;s block with 1-tap pre-drafted reviews, and shield your restaurant from negative public ratings with our intelligent <strong>Reputation Firewall</strong>.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/boost"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-zinc-900 text-white font-bold text-sm hover:bg-black transition-all shadow-xl hover:shadow-zinc-900/20 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-current" />
              <span>Try Live Interactive Simulator</span>
            </Link>

            <Link
              href="/admin"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white border border-zinc-300 text-zinc-800 font-bold text-sm hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Explore Admin Suite</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>

          {/* Social Proof Mini Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> No App Download Required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 100% Google Policy Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Print-Ready 4x6&quot; Table Tents
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE HERO SIMULATOR WIDGET */}
        {/* ========================================================================= */}
        <div className="mt-14 max-w-xl mx-auto">
          <div className="text-center mb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              👇 Live Interactive Guest Scanner Demo
            </span>
          </div>

          {!sampleStore ? (
            <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-zinc-300 text-center">
              <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h3 className="font-bold text-zinc-900">
                Add your first location to activate the live demo
              </h3>
              <p className="text-xs text-zinc-500 mt-1.5 max-w-sm mx-auto">
                The interactive scanner runs on your real restaurant data — QR destination,
                highlight chips, and Google Place ID.
              </p>
              <Link
                href="/admin/stores"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-black transition-all"
              >
                Add a restaurant location <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (

          <div className="bg-white rounded-3xl p-6 border-2 border-zinc-900 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-sm"
                  style={{ backgroundColor: sampleStore.brandColor }}
                >
                  {sampleStore.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 leading-tight">{sampleStore.name}</h3>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Table #7 • Google Review Partner
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                0ms Pre-Drafted
              </span>
            </div>

            {/* Stars */}
            <div className="my-5 text-center">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Tap to simulate guest rating:
              </p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1.5 rounded-lg hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        rating >= star ? "text-amber-400 fill-amber-400" : "text-zinc-200"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-medium text-zinc-500 mt-1">
                {rating >= 4 ? "⭐⭐⭐⭐⭐ Happy diner (5/5)" : "⚠️ Dissatisfied diner (Reputation Firewall active!)"}
              </p>
            </div>

            {/* If 4-5 stars: Positive Flow */}
            {rating >= 4 ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-zinc-600 block mb-1.5">
                    Tap to personalize highlights:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {sampleStore.chips.map((chip) => {
                      const active = selectedChips.includes(chip);
                      return (
                        <button
                          key={chip}
                          onClick={() => toggleChip(chip)}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                            active
                              ? "bg-zinc-900 text-white shadow-sm"
                              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 leading-relaxed italic">
                  &ldquo;{getSimulatedReview()}&rdquo;
                </div>

                <button
                  onClick={handleTestCopy}
                  className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                      <span>Copied! Opening Google Reviews...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-300" />
                      <span>Test 1-Tap Google Reviews Hand-off</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* If 1-3 stars: Reputation Firewall Active */
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-zinc-900">
                      Reputation Firewall Shield Activated!
                    </h4>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      The public Google button is immediately hidden. The guest is prompted to message the General Manager privately to fix the issue on-site.
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-[11px] text-zinc-600 font-mono">
                  [Private GM Alert]: &ldquo;Table #7 reported slow service — resolved on site.&rdquo;
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* THE 3-STEP FLYWHEEL SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              How ReviewBoost Works
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-2">
              The 10-Second Table-to-Google Review Pipeline
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-3">
              We eliminated every ounce of friction between finishing dessert and posting a verified 5-star Google review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-zinc-800/60 border border-zinc-700/60 relative space-y-4">
              <span className="w-10 h-10 rounded-2xl bg-zinc-700 text-white font-black text-sm flex items-center justify-center">
                01
              </span>
              <h3 className="text-xl font-bold">1-Second Camera Scan</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Guest points standard phone camera at the 4x6&quot; table tent. No app download or account creation required. Native instant web load.
              </p>
              <div className="pt-2 text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> 100% native QR compatibility
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-zinc-800/60 border border-zinc-700/60 relative space-y-4">
              <span className="w-10 h-10 rounded-2xl bg-zinc-700 text-white font-black text-sm flex items-center justify-center">
                02
              </span>
              <h3 className="text-xl font-bold">AI Pre-Draft &amp; Chips</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                A natural, enthusiast-level 5-star review is already pre-written at 0ms. Diners tap chips (&ldquo;Crispy Crust&rdquo;, &ldquo;Alex (Server)&rdquo;) to personalize it in &lt;400ms.
              </p>
              <div className="pt-2 text-xs font-mono text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Zero writer&apos;s block
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-zinc-800/60 border border-zinc-700/60 relative space-y-4">
              <span className="w-10 h-10 rounded-2xl bg-zinc-700 text-white font-black text-sm flex items-center justify-center">
                03
              </span>
              <h3 className="text-xl font-bold">1-Tap Google Reviews Post</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Guest clicks &ldquo;Copy &amp; Open Google&rdquo;. The review is copied to clipboard and deep-links directly into the official Google write review modal. Done!
              </p>
              <div className="pt-2 text-xs font-mono text-blue-400 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Draft copied, Google review box opened
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* REPUTATION FIREWALL SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent rounded-3xl p-8 sm:p-14 border border-amber-200/80">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                Reputation Firewall Architecture
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
                Stop Negative 1-Star Reviews Before They Ever Reach Google Maps.
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                When a customer experiences poor service, they want to be heard. If there is no immediate outlet, they vent on Google Reviews where it permanently damages your ranking.
              </p>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Our <strong>Reputation Firewall</strong> dynamically detects when a diner selects 1, 2, or 3 stars. The public Google link is hidden instantly and replaced with a private direct channel to the General Manager.
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-amber-200">
                  <span className="font-bold text-zinc-900 block mb-0.5">Private GM SMS / Email Alerts</span>
                  <span className="text-zinc-500">Manager is notified before the guest even pays the bill.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-amber-200">
                  <span className="font-bold text-zinc-900 block mb-0.5">Turn Frustrated Diners into Loyalists</span>
                  <span className="text-zinc-500">Solve complaints table-side to prevent public reputational loss.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-zinc-200 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-zinc-100">
                <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> What the Firewall Does
                </span>
                <span className="text-zinc-400 font-mono">Every Table, Every Service</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">1–3 star diners intercepted</span>
                  <span className="text-base font-black text-amber-600">Routed Privately</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">Complaints delivered to the GM</span>
                  <span className="text-base font-black text-emerald-600">Before Google</span>
                </div>
                <div className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">Table number attached</span>
                  <span className="text-base font-black text-zinc-900">Table-Side Fix</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* INTERACTIVE ROI CALCULATOR SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600">
            Harvard Business Review Formula
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight mt-1">
            Calculate Your Restaurant Revenue Jump
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 mt-2">
            Each 1-star rating increase drives a 5% to 9% revenue lift according to Harvard Business School. See your projected returns below.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-zinc-200 shadow-xl max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Sliders */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Monthly Dine-In Guests:
                  </label>
                  <span className="font-mono font-bold text-zinc-900 text-sm">
                    {monthlyGuests.toLocaleString()} guests
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={8000}
                  step={100}
                  value={monthlyGuests}
                  onChange={(e) => setMonthlyGuests(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                  <span>500</span>
                  <span>4,000</span>
                  <span>8,000+</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Average Check / Ticket Size:
                  </label>
                  <span className="font-mono font-bold text-zinc-900 text-sm">
                    ${averageCheck}
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={150}
                  step={5}
                  value={averageCheck}
                  onChange={(e) => setAverageCheck(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                  <span>$15 (Casual/Cafe)</span>
                  <span>$60 (Dinner)</span>
                  <span>$150+ (Fine Dining)</span>
                </div>
              </div>
            </div>

            {/* Calculated Output Box */}
            <div className="p-6 rounded-3xl bg-zinc-900 text-white space-y-4">
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Projected Monthly Growth
              </span>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs text-zinc-400">New 5-Star Reviews:</span>
                  <span className="text-xl font-black text-white">+{estimatedReviewsPerMonth} /mo</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs text-zinc-400">Google Map Pack Rank:</span>
                  <span className="text-base font-bold text-amber-300">#1 - #3 Placement</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs text-zinc-400">Est. Additional Revenue:</span>
                  <span className="text-2xl font-black text-emerald-400">+${estimatedRevenueLift.toLocaleString()} /mo</span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs text-zinc-400">ReviewBoost ROI:</span>
                  <span className="text-lg font-black text-purple-300">{roiMultiplier}x Return</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PHYSICAL HARDWARE & PRINTABLE STANDEE SHOWCASE */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50 border-y border-zinc-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                Turnkey Hardware &amp; Stands
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight">
                Print-Ready 4x6&quot; Standees in 3 Clicks
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                No waiting 2 weeks for expensive custom hardware. Our built-in standee generator creates print-ready 4x6&quot; foldable table tents and counter acrylic inserts with embedded high-contrast QR codes and cutting/folding guides.
              </p>
              <ul className="space-y-2 text-xs text-zinc-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Dual-sided foldable table tent format with center crease guide
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Acrylic counter stand plaque for host stand &amp; bar counter
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Embedded Table # tracking so complaints are resolved on-site
                </li>
              </ul>

              <div className="pt-3">
                <Link
                  href="/admin/stores"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 text-white font-bold text-xs hover:bg-black transition-all shadow-md"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  Open the Printable Table Tent Generator
                </Link>
              </div>
            </div>              <div className="lg:col-span-6 flex justify-center">
                <div className="bg-white p-6 rounded-3xl border-2 border-zinc-900 shadow-2xl max-w-sm w-full text-center space-y-3">
                  <div
                    className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md"
                    style={{ backgroundColor: sampleStore?.brandColor || "#E11D48" }}
                  >
                    {(sampleStore?.name || "Your Restaurant").charAt(0)}
                  </div>
                  <h4 className="font-black text-xl text-zinc-900">
                    {sampleStore?.name || "Your Restaurant"}
                  </h4>
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <div className="bg-zinc-100 p-4 rounded-2xl border border-zinc-200 inline-block my-2">
                  <div className="w-36 h-36 bg-zinc-900 rounded-xl flex items-center justify-center text-white text-xs font-mono">
                    [High Contrast QR]
                  </div>
                </div>
                <p className="text-xs font-bold text-zinc-900">Scan to Review in 10 Seconds</p>
                <p className="text-[10px] text-zinc-500">Foldable 4x6&quot; Table Tent • Free Print Engine</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PRICING TIERS SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-zinc-900 tracking-tight mt-1">
            Simple Plans That Pay For Themselves in 48 Hours
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 mt-2">
            No long term contracts. 14-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Starter Plan */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Starter</h3>
                <p className="text-xs text-zinc-500 mt-0.5">For single cafes &amp; neighborhood diners</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">$29</span>
                <span className="text-xs text-zinc-500 font-semibold">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> 1 Restaurant location
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Up to 500 table scans / month
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Instant 0ms pre-drafted reviews
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Reputation Firewall protection
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Printable 4x6&quot; table standees
                </li>
              </ul>
            </div>
            <Link
              href="/admin/stores"
              className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs text-center transition-colors block"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Pro Plan (Most Popular) */}
          <div className="bg-white rounded-3xl p-8 border-2 border-zinc-900 shadow-2xl space-y-6 relative flex flex-col justify-between">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-zinc-900 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </span>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Pro Operator</h3>
                <p className="text-xs text-zinc-500 mt-0.5">For busy restaurants &amp; multi-unit venues</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">$69</span>
                <span className="text-xs text-zinc-500 font-semibold">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-800 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" /> Up to 3 Locations included
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" /> Unlimited table scans
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" /> Gemini 2.5 Flash custom tuning
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" /> Instant GM SMS &amp; Email alerts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" /> Table # incident tracking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" /> Priority print standee templates
                </li>
              </ul>
            </div>
            <Link
              href="/admin/stores"
              className="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-xs text-center transition-colors block shadow-md"
            >
              Start 14-Day Free Pro Trial
            </Link>
          </div>

          {/* Franchise / Enterprise Plan */}
          <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Franchise &amp; Agency</h3>
                <p className="text-xs text-zinc-500 mt-0.5">For hospitality groups &amp; local SEO agencies</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-zinc-900">$199</span>
                <span className="text-xs text-zinc-500 font-semibold">/ month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-zinc-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Up to 10 locations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Multi-manager role permissions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> White-label standee generator
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Custom domain support
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" /> Dedicated onboarding specialist
                </li>
              </ul>
            </div>
            <Link
              href="/prospectus"
              className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs text-center transition-colors block"
            >
              Review Enterprise Prospectus
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SAAS PROSPECTUS TEASER */}
      {/* ========================================================================= */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-zinc-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
              INVESTOR &amp; FRANCHISE PROSPECTUS
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Looking at the Business Model &amp; Unit Economics?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Read our full SaaS prospectus detailing the $4.8B market opportunity, 88% gross margins, viral table QR loop, and unit economics ($1,656 LTV vs &lt;$250 CAC).
            </p>
          </div>
          <Link
            href="/prospectus"
            className="px-6 py-3.5 rounded-2xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-100 transition-colors shrink-0 shadow-lg"
          >
            Read Full SaaS Prospectus Deck
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAQ SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Everything you need to know about Google compliance, QR hardware, and setup.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200">
            <h4 className="font-bold text-zinc-900 text-sm mb-1">
              Is this compliant with Google Review policies?
            </h4>
            <p className="text-zinc-600 leading-relaxed">
              Yes, 100%. We do not gate or bribe reviews. We write a real, authentic draft to the customer&apos;s clipboard and open the official Google Review dialog where the customer makes the final edit and submits directly through their Google account.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200">
            <h4 className="font-bold text-zinc-900 text-sm mb-1">
              Do my guests need to download an app or register?
            </h4>
            <p className="text-zinc-600 leading-relaxed">
              No. Guests simply open the native camera app on any iPhone or Android and scan the table QR code. The webpage loads in milliseconds with zero login screens.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200">
            <h4 className="font-bold text-zinc-900 text-sm mb-1">
              What if my internet or AI service has a temporary hiccup?
            </h4>
            <p className="text-zinc-600 leading-relaxed">
              Our 0ms deterministic heuristic engine runs locally on the edge. Even if external AI endpoints or networks are unreachable, review generation and clipboard hand-off succeed instantly.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-zinc-200">
            <h4 className="font-bold text-zinc-900 text-sm mb-1">
              How do I get physical table tents for my tables?
            </h4>
            <p className="text-zinc-600 leading-relaxed">
              You can immediately generate and print 4x6&quot; foldable table tents from your admin dashboard using standard paper, cardstock, or acrylic table inserts.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
