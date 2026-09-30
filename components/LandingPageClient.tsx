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
  Smartphone,
  Sliders,
  BarChart3,
  Scale,
  Zap,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Store } from "@/lib/types";

interface Props {
  sampleStore: Store | null;
}

export default function LandingPageClient({ sampleStore }: Props) {
  // Live Demo Widget State
  const [rating, setRating] = useState<number>(5);
  const [selectedChips, setSelectedChips] = useState<string[]>(
    sampleStore ? sampleStore.chips.slice(0, 2) : ["Speciality Cold Brew", "Avocado Toast"]
  );
  const [copied, setCopied] = useState<boolean>(false);

  // ROI Calculator State
  const [monthlyGuests, setMonthlyGuests] = useState<number>(2400);
  const [averageCheck, setAverageCheck] = useState<number>(45);

  // Calculated ROI based on Harvard Business Review (Luca, HBS: 5% - 9% revenue lift per 1 full star)
  const estimatedReviewsPerMonth = Math.round(monthlyGuests * 0.055);
  const estimatedRevenueLift = Math.round(monthlyGuests * averageCheck * 0.054);
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
      } catch {}
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
        particleCount: 80,
        spread: 65,
        origin: { y: 0.7 },
      });
    } catch {}
    setTimeout(() => setCopied(false), 3000);
  };

  const getSimulatedReview = () => {
    const chipsStr = selectedChips.length > 0 ? selectedChips.join(" and ") : "the signature dishes";
    return `Hands down one of the best dining experiences I've had in a long time! The ${chipsStr} was prepared to perfection. Fast, welcoming service and wonderful atmosphere. 10/10 recommend!`;
  };

  return (
    <div className="w-full bg-[#0B0B0E] text-white selection:bg-[#FF5400] selection:text-white relative">
      {/* ========================================================================= */}
      {/* FLOATING NAVBAR (Reference Screenshot 1) */}
      {/* ========================================================================= */}
      <div className="max-w-6xl mx-auto pt-5 px-4 sticky top-4 z-50">
        <header className="bg-[#121214]/90 backdrop-blur-md rounded-2xl border border-white/10 px-6 py-3.5 flex items-center justify-between shadow-2xl">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF5400] via-amber-500 to-purple-600 flex items-center justify-center shadow-lg shadow-orange-600/30 group-hover:scale-105 transition-transform">
              <span className="w-3 h-3 rounded-full bg-white shadow-inner" />
            </div>
            <span className="font-display uppercase text-2xl tracking-tight text-white">
              REVIEWBOOST
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Link href="#advantage" className="hover:text-white transition-colors">
              KEY ADVANTAGE
            </Link>
            <Link href="#features" className="hover:text-white transition-colors">
              FEATURES
            </Link>
            <Link href="#calculator" className="hover:text-white transition-colors">
              ROI CALCULATOR
            </Link>
            <Link href="/boost" className="hover:text-[#FF5400] transition-colors flex items-center gap-1 text-[#FF5400]">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>SIMULATOR</span>
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              ADMIN
            </Link>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-3">
            <Link
              href="/boost"
              className="bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/30 active:scale-95"
            >
              TRY DEMO
            </Link>
          </div>
        </header>
      </div>

      {/* ========================================================================= */}
      {/* HERO SECTION (Reference Screenshot 1) */}
      {/* ========================================================================= */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto overflow-hidden text-center">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-hero-grid opacity-30 pointer-events-none -z-10" />

        {/* Ambient Top Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-gradient-to-tr from-[#FF5400]/15 via-purple-600/10 to-amber-500/10 rounded-full blur-[110px] pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto">
          {/* Main Massive Condensed Headline with floating badge */}
          <div className="relative inline-block text-center mx-auto mb-6">
            <h1 className="font-display uppercase text-5xl sm:text-7xl lg:text-[6.75rem] leading-[0.92] tracking-tight text-white drop-shadow-sm">
              ZERO-FRICTION
              <br />
              5-STAR GOOGLE
              <br />
              REVIEW ENGINE
            </h1>

            {/* Overlapping Floating Orange Circle Badge (From Screenshot 1) */}
            <div className="absolute -right-3 sm:-right-8 bottom-3 sm:bottom-6 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#FF5400] flex items-center justify-center shadow-2xl shadow-orange-600/50 transform rotate-12 pointer-events-none">
              <div className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-sm" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/70 shadow-sm" />
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="mt-4 text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Turn dining table patrons into verified 5-star Google Reviews in 10 seconds flat.
            0ms pre-drafted reviews, 1-tap dish tags, and an intelligent <strong>Reputation Firewall</strong>.
          </p>

          {/* Main Orange Action CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/boost"
              className="bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-sm sm:text-base uppercase tracking-wider px-9 py-4 rounded-xl shadow-2xl shadow-orange-600/35 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>TRY LIVE SIMULATOR</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/admin"
              className="bg-[#141418] hover:bg-zinc-800 text-zinc-200 border border-white/10 font-display text-sm uppercase tracking-wider px-7 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>EXPLORE ADMIN SUITE</span>
            </Link>
          </div>

          {/* Social Proof Tags */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 uppercase font-bold tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              0ms First Draft
            </span>
            <span className="text-zinc-600">•</span>
            <span>No App Download Required</span>
            <span className="text-zinc-600">•</span>
            <span>100% Google Policy Compliant</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* KEY ADVANTAGE SECTION (Reference Screenshot 5) */}
      {/* ========================================================================= */}
      <section id="advantage" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display uppercase text-5xl sm:text-7xl lg:text-8xl tracking-tight text-white">
            KEY ADVANTAGE
          </h2>
        </div>

        {/* 2 High-Contrast Editorial Cream Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: 10-Second Guest Flow */}
          <div className="bg-[#FAF4E8] rounded-3xl p-7 sm:p-10 text-zinc-950 shadow-2xl flex flex-col justify-between border border-amber-900/10">
            <div>
              <h3 className="font-display uppercase text-3xl sm:text-4xl tracking-tight text-zinc-950">
                10-SECOND GUEST FLOW
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 font-medium mt-1 mb-6">
                Pre-drafted reviews and instant highlight chips to launch your 5-star reviews fast
              </p>
            </div>

            {/* Interactive Live Scanner Widget Inside Card */}
            <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-md text-left">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg text-white font-bold flex items-center justify-center text-xs shadow-sm"
                    style={{ backgroundColor: sampleStore?.brandColor || "#0F766E" }}
                  >
                    {sampleStore?.name?.charAt(0) || "T"}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900 leading-tight">
                      {sampleStore?.name || "Third Wave Coffee"}
                    </h4>
                    <span className="text-[10px] text-zinc-400">Table #7 • Verified Guest</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  0ms Pre-Draft
                </span>
              </div>

              {/* Star Rating */}
              <div className="my-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          rating >= star ? "text-amber-400 fill-amber-400" : "text-zinc-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-medium text-zinc-500 mt-1">
                  {rating >= 4 ? "⭐⭐⭐⭐⭐ 5/5 Happy Guest" : "⚠️ 1-3 Stars (Firewall Intercepted)"}
                </p>
              </div>

              {rating >= 4 ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-zinc-600 block mb-1">
                      Tap highlights to personalize:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(sampleStore?.chips || ["Speciality Cold Brew", "Avocado Toast", "Sea Salt Mocha"]).map((chip) => {
                        const active = selectedChips.includes(chip);
                        return (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => toggleChip(chip)}
                            className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ${
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

                  <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 italic leading-relaxed">
                    &ldquo;{getSimulatedReview()}&rdquo;
                  </div>

                  <button
                    type="button"
                    onClick={handleTestCopy}
                    className="w-full py-3 px-4 rounded-xl bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Copied! Opening Google Reviews...</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Review &amp; Open Google</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Reputation Firewall Shield Active</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    The public Google link is suppressed. Diners are given a 1-tap issue reporter to notify the GM table-side.
                  </p>
                  <div className="p-2 rounded-lg bg-white border border-amber-200 font-mono text-[10px] text-zinc-600">
                    [Direct Alert Dispatched]: &ldquo;Table #7 requested GM table visit.&rdquo;
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Reputation Firewall & Analytics */}
          <div className="bg-[#FAF4E8] rounded-3xl p-7 sm:p-10 text-zinc-950 shadow-2xl flex flex-col justify-between border border-amber-900/10">
            <div>
              <h3 className="font-display uppercase text-3xl sm:text-4xl tracking-tight text-zinc-950">
                REPUTATION FIREWALL
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 font-medium mt-1 mb-6">
                Intercept 1-3 star dining complaints privately before public Google Maps damage
              </p>
            </div>

            {/* Visual Firewall Representation */}
            <div className="space-y-3.5">
              <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    Table Incident Intercepted
                  </span>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full font-mono">
                    Table #4
                  </span>
                </div>
                <div className="space-y-2 text-xs text-zinc-700">
                  <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                    <span className="font-semibold">Reported Issue:</span>
                    <span className="font-medium text-amber-700">🍲 Food Was Cold / Long Wait</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-zinc-50 border border-zinc-200">
                    <span className="font-semibold">Action Requested:</span>
                    <span className="font-bold text-rose-600">🚨 GM Table Visit Now</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 italic mt-1">
                    Resolved table-side in 3 minutes. Disgruntled diner converted into a loyal regular; zero negative public reviews.
                  </p>
                </div>
              </div>

              {/* Conversion Stats Mini Bar */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm">
                  <span className="font-display text-2xl text-zinc-900 block leading-tight">94.2%</span>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase">Scan-to-Review Rate</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-sm">
                  <span className="font-display text-2xl text-emerald-600 block leading-tight">+0.6★</span>
                  <span className="text-[10px] text-zinc-500 font-semibold uppercase">Avg Rating Lift</span>
                </div>
              </div>

              <Link
                href="/boost"
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white font-display text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <span>TEST FIREWALL IN SIMULATOR</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FEATURES GRID SECTION (Reference Screenshot 4) */}
      {/* ========================================================================= */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display uppercase text-4xl sm:text-6xl lg:text-7xl tracking-tight text-white max-w-4xl mx-auto leading-[0.95]">
            BUILT WITH EVERYTHING YOU NEED FOR SUCCESS
          </h2>
        </div>

        {/* 4x2 Grid of 8 Features with Colorful Icon Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 1. Pink: Modern Review Engine */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center mb-4 shadow-lg shadow-pink-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              MODERN REVIEW ENGINE
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              0ms pre-drafted reviews customized with authentic restaurant highlights so diners never face writer&apos;s block.
            </p>
          </div>

          {/* 2. Green: Reputation Firewall */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              REPUTATION FIREWALL
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Intercepts 1-3 star dining complaints table-side with instant GM alerts before public posting damage.
            </p>
          </div>

          {/* 3. Purple: 1-Tap Dynamic Chips */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              1-TAP DYNAMIC CHIPS
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diners tap signature dishes, server names, or vibe perks to dynamically re-seed their review in under 400ms.
            </p>
          </div>

          {/* 4. Orange: Google Anti-Gating Compliant */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/10">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              GOOGLE POLICY COMPLIANT
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Engineered strictly compliant with Google Business Profile &amp; FTC guidelines with accessible public reviews.
            </p>
          </div>

          {/* 5. Red: Print-Ready Standees */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              PRINT-READY STANDEES
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Browser-native foldable 4x6&quot; table tent &amp; acrylic counter plaque generator with center crease guides.
            </p>
          </div>

          {/* 6. Cyan: Zero App Download */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              ZERO APP DOWNLOAD
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Runs immediately in mobile Safari and Chrome from camera QR scan without downloading apps or signing up.
            </p>
          </div>

          {/* 7. Yellow: Multi-Location Suite */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              MULTI-LOCATION SUITE
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Manage unlimited venue locations, customize brand colors, configure Google Place IDs, and inspect trends.
            </p>
          </div>

          {/* 8. Fuchsia: Real-Time Telemetry */}
          <div className="text-left">
            <div className="w-11 h-11 rounded-2xl bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 flex items-center justify-center mb-4 shadow-lg shadow-fuchsia-500/10">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-display uppercase text-lg tracking-tight text-white mb-2">
              REAL-TIME TELEMETRY
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Track table conversion funnels, scan-to-copy hand-off rates, and peak dining activity heatmaps.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* HARVARD ROI CALCULATOR SECTION */}
      {/* ========================================================================= */}
      <section id="calculator" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="bg-[#121216] rounded-3xl p-8 sm:p-14 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF5400] block mb-2">
              Harvard Business School Verified Impact (Luca, HBS)
            </span>
            <h2 className="font-display uppercase text-3xl sm:text-5xl tracking-tight text-white leading-tight">
              A +1 STAR GOOGLE RATING DRIVES 5% TO 9% MORE REVENUE
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Sliders */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span className="text-zinc-400">Monthly Dine-In Guests</span>
                  <span className="font-mono text-white text-sm">{monthlyGuests.toLocaleString()} diners</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="10000"
                  step="100"
                  value={monthlyGuests}
                  onChange={(e) => setMonthlyGuests(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FF5400]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span className="text-zinc-400">Average Check Size</span>
                  <span className="font-mono text-white text-sm">${averageCheck} per table</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="200"
                  step="5"
                  value={averageCheck}
                  onChange={(e) => setAverageCheck(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#FF5400]"
                />
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-zinc-400 leading-relaxed">
                Over 68% of new local restaurant discovery originates on Google Maps. Moving from 4.2 to 4.8 stars unlocks immediate top 3-pack local search placement.
              </div>
            </div>

            {/* Result KPI Box */}
            <div className="bg-zinc-900 rounded-2xl p-6 sm:p-8 border border-white/10 text-center space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Estimated Monthly Revenue Lift
                </span>
                <span className="font-display text-4xl sm:text-6xl text-[#FF5400] block leading-none">
                  +${estimatedRevenueLift.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-400 font-medium mt-1 block">/ month</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-zinc-800 text-left">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">New 5-Star Reviews</span>
                  <span className="font-mono text-lg font-bold text-white block mt-0.5">+{estimatedReviewsPerMonth}/mo</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Annual ROI Multiplier</span>
                  <span className="font-mono text-lg font-bold text-emerald-400 block mt-0.5">{roiMultiplier}x ROI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CALL TO ACTION BANNER (Reference Screenshot 3) */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="bg-[#121216] border border-white/10 rounded-3xl p-10 sm:p-16 text-center bg-grid-lines relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[#FF5400]/10 rounded-full blur-[90px] pointer-events-none -z-10" />

          <h2 className="font-display uppercase text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white mb-6 leading-tight max-w-3xl mx-auto">
            READY TO PROMOTE YOUR RESTAURANT WITH 5-STAR REVIEWS?
          </h2>

          <div className="mt-8 flex justify-center">
            <Link
              href="/boost"
              className="bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-sm sm:text-base uppercase tracking-wider px-9 py-4 rounded-xl shadow-2xl shadow-orange-600/35 transition-all active:scale-95"
            >
              TRY LIVE SIMULATOR
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER (Reference Screenshot 2) */}
      {/* ========================================================================= */}
      <footer className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* 4 Dark Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* Card 1: Home Pages */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-6 text-left">
            <h4 className="font-display uppercase text-base tracking-tight text-white mb-4">
              HOME PAGES
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-medium">
              <li>
                <Link href="/boost" className="hover:text-white transition-colors">
                  Interactive Simulator
                </Link>
              </li>
              <li>
                <Link href="/admin/stores" className="hover:text-white transition-colors">
                  Table Standee Generator
                </Link>
              </li>
              <li>
                <Link href="/admin/feedback" className="hover:text-white transition-colors">
                  Reputation Firewall
                </Link>
              </li>
              <li>
                <Link href="/prospectus" className="hover:text-white transition-colors">
                  SaaS Prospectus
                </Link>
              </li>
            </ul>
          </div>

          {/* Card 2: Main Pages */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-6 text-left">
            <h4 className="font-display uppercase text-base tracking-tight text-white mb-4">
              MAIN PAGES
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-medium">
              <li>
                <Link href="/admin" className="hover:text-white transition-colors">
                  Executive Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/stores" className="hover:text-white transition-colors">
                  Multi-Location Stores
                </Link>
              </li>
              <li>
                <Link href="/admin/feedback" className="hover:text-white transition-colors">
                  Firewall Feedback Inbox
                </Link>
              </li>
              <li>
                <Link href="/admin/analytics" className="hover:text-white transition-colors">
                  Scan Telemetry
                </Link>
              </li>
            </ul>
          </div>

          {/* Card 3: Utility */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-6 text-left">
            <h4 className="font-display uppercase text-base tracking-tight text-white mb-4">
              UTILITY
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-medium">
              <li>
                <span className="text-zinc-500">4x6&quot; Foldable Tent Guide</span>
              </li>
              <li>
                <span className="text-zinc-500">Google Place ID Helper</span>
              </li>
              <li>
                <span className="text-zinc-500">Google Anti-Gating Policy</span>
              </li>
              <li>
                <span className="text-zinc-500">FTC Compliance Shield</span>
              </li>
            </ul>
          </div>

          {/* Card 4: Support */}
          <div className="bg-[#141418] border border-white/5 rounded-2xl p-6 text-left">
            <h4 className="font-display uppercase text-base tracking-tight text-white mb-4">
              SUPPORT &amp; SALES
            </h4>
            <ul className="space-y-2.5 text-xs text-zinc-400 font-medium">
              <li>
                <span>Email: anuragmishra3407@gmail.com</span>
              </li>
              <li>
                <span>Domain: scanner.sayalabs.in</span>
              </li>
              <li>
                <span>Powered by SayaLabs</span>
              </li>
              <li className="text-[11px] text-emerald-400 pt-1">
                <span>Google Verified Deep-Linking</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Giant Hollow Outlined Stroke Watermark (From Screenshot 2) */}
        <div className="w-full overflow-hidden select-none my-6 text-center">
          <span className="font-display text-stroke-watermark uppercase text-6xl sm:text-8xl md:text-[11.5rem] tracking-wider block leading-none opacity-80">
            REVIEWBOOST
          </span>
        </div>

        {/* Copyright Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 text-center">
          <p>
            Copyright © {new Date().getFullYear()} ReviewBoost • Designed for High-Growth Restaurants • Powered by SayaLabs
          </p>
          <div className="flex items-center gap-3">
            <Link href="/boost" className="text-zinc-400 hover:text-white transition-colors">
              Simulator
            </Link>
            <span>•</span>
            <Link href="/admin" className="text-zinc-400 hover:text-white transition-colors">
              Admin Suite
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating Bottom-Right Widget (From Screenshot 1 & 4) */}
      <Link
        href="/boost"
        className="fixed bottom-6 right-6 z-40 bg-[#121214] border border-white/15 text-white font-display text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 hover:bg-black transition-all group"
      >
        <span>Try Demo</span>
        <span className="text-[#FF5400] font-bold text-sm group-hover:scale-125 transition-transform">+</span>
      </Link>
    </div>
  );
}
