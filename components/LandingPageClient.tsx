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
  TrendingUp,
  QrCode,
  UtensilsCrossed,
  CheckCircle2,
  Lock,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Store } from "@/lib/types";

interface Props {
  sampleStore: Store | null;
  totalStoresCount?: number;
}

export default function LandingPageClient({ sampleStore, totalStoresCount = 103 }: Props) {
  // Interactive Hero Preview State
  const defaultChips = sampleStore?.chips && sampleStore.chips.length > 0
    ? sampleStore.chips.slice(0, 3)
    : ["Signature Kulhad Chai", "Cheese Peri Peri Maggi", "Crispy Veg Burger"];

  const [rating, setRating] = useState<number>(5);
  const [selectedChips, setSelectedChips] = useState<string[]>([defaultChips[0], defaultChips[1]]);
  const [copied, setCopied] = useState<boolean>(false);

  const storeName = sampleStore?.name || "Chai Sutta Bar (CSB)";

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter((c) => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const getSimulatedReview = () => {
    const dishes = selectedChips.length > 0 ? selectedChips.join(" and ") : "the signature dishes";
    return `10/10 experience at ${storeName} today! The ${dishes} completely hit the spot—fresh, piping hot, and full of flavor. Quick, welcoming service. Can't wait to be back soon!`;
  };

  const handleTestCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(getSimulatedReview());
      }
    } catch {}

    setCopied(true);
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.65 },
        colors: ["#FF5400", "#10B981", "#F59E0B", "#3B82F6"],
      });
    } catch {}

    setTimeout(() => setCopied(false), 3500);
  };

  return (
    <div className="w-full bg-[#0B0B0E] text-white selection:bg-[#FF5400] selection:text-white relative font-sans">
      {/* ========================================================================= */}
      {/* 1. FLOATING CLEAN NAVBAR */}
      {/* ========================================================================= */}
      <div className="max-w-6xl mx-auto pt-4 sm:pt-6 px-4 sticky top-3 sm:top-4 z-50">
        <header className="bg-[#141418]/90 backdrop-blur-md rounded-2xl border border-white/10 px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-2xl">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5400] via-amber-500 to-orange-400 flex items-center justify-center shadow-lg shadow-orange-600/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display uppercase text-2xl tracking-tight text-white">
              REVIEWBOOST
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <Link href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="#benefits" className="hover:text-white transition-colors">
              Why It Converts
            </Link>
            <Link href="#roles" className="hover:text-white transition-colors">
              Team &amp; Roles
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin Portal
            </Link>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-xs uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-600/30 active:scale-95 flex items-center gap-1.5"
            >
              <span>Console Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION WITH INTERACTIVE DEMO */}
      {/* ========================================================================= */}
      <section className="relative pt-12 sm:pt-20 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto overflow-hidden">
        {/* Ambient Top Glows */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#FF5400]/20 via-amber-500/10 to-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="text-center max-w-4xl mx-auto space-y-5">
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Turn Table Diners into 5★ Google Reviews in 10s</span>
            <span className="text-zinc-600">•</span>
            <span className="text-amber-400 font-bold">Zero App Download</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="font-display uppercase text-4xl sm:text-6xl lg:text-[5.5rem] leading-[0.95] tracking-tight text-white">
            TURN DINING GUESTS INTO
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5400] via-amber-400 to-[#FF5400]">
              5-STAR GOOGLE REVIEWS
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate customer writer&apos;s block. Diners tap what they ate, our 0ms engine pre-drafts the review, and Google&apos;s 5-star box opens directly. Negative feedback is intercepted privately.
          </p>

          {/* CTA Buttons — one clear primary action, secondary links to a live standee */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="#how-it-works"
              className="w-full sm:w-auto bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-2xl shadow-orange-600/35 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>See How It Works</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {sampleStore && (
              <Link
                href={`/r/${sampleStore.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto bg-[#141418] hover:bg-zinc-800 text-zinc-200 border border-white/10 font-display text-sm uppercase tracking-wider px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span>{sampleStore.name} Table Standee</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
              </Link>
            )}
          </div>

          {/* Quick Trust Highlights */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              0ms First Draft
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Direct 5★ Modal Open
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Reputation Firewall Shield
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              100% Google Compliant
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE HERO MOCKUP CARD (Live Interactive Widget) */}
        {/* ========================================================================= */}
        <div className="mt-14 max-w-lg mx-auto">
          <div className="bg-[#121216] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-left overflow-hidden">
            {/* Ambient Card Backlight */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-[#FF5400]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Mock Restaurant Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#B45309] text-white font-bold flex items-center justify-center text-sm shadow-md">
                  CSB
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    {storeName}
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Table #4 • Verified On-Site Guest
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                0ms Engine
              </span>
            </div>

            {/* Star Selector */}
            <div className="my-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-115 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        rating >= star ? "text-amber-400 fill-amber-400" : "text-zinc-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-[11px] font-medium text-zinc-400 mt-1.5">
                {rating >= 4 ? (
                  <span className="text-emerald-400 font-semibold">⭐⭐⭐⭐⭐ 5/5 Happy Diner (Proceeds to Google)</span>
                ) : (
                  <span className="text-amber-400 font-semibold">⚠️ 1–3 Stars: Reputation Firewall Intercepts Privately</span>
                )}
              </p>
            </div>

            {rating >= 4 ? (
              <div className="space-y-3.5">
                {/* Highlight Chips */}
                <div>
                  <span className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                    Tap dishes to customize review in 0ms:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {defaultChips.map((chip) => {
                      const active = selectedChips.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleChip(chip)}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                            active
                              ? "bg-white text-zinc-950 font-bold shadow-sm"
                              : "bg-white/10 text-zinc-300 hover:bg-white/20"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {chip}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pre-Drafted Review Box */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-zinc-200 italic leading-relaxed">
                  &ldquo;{getSimulatedReview()}&rdquo;
                </div>

                {/* Main 1-Tap Hand-Off Button */}
                <button
                  type="button"
                  onClick={handleTestCopy}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                      <span>Copied! Opening 5★ Google Box...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Review &amp; Open 5★ Review Box</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-0.5" />
                    </>
                  )}
                </button>

                <p className="text-[10px] text-zinc-500 text-center">
                  1-Tap copies review text and pops open Google&apos;s direct Write-A-Review modal.
                </p>
              </div>
            ) : (
              /* Reputation Firewall Mock */
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5 text-xs text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Reputation Firewall Active</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Negative ratings trigger an immediate private manager alert table-side. The manager can visit the table and resolve the issue before a 1-star review hits Google Maps.
                </p>
                <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/30 font-mono text-[10px] text-amber-300">
                  ⚡ [Manager Alert]: Table #4 requested table-side assistance.
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS (3 Simple Steps) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF5400] block">
            10-Second Table Workflow
          </span>
          <h2 className="font-display uppercase text-3xl sm:text-5xl tracking-tight text-white">
            HOW IT TURNS DINERS INTO REVIEWS
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Traditional review requests get ignored because writing a review takes work. ReviewBoost makes it effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-[#141418] border border-white/5 rounded-3xl p-7 relative space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-display text-xl">
              1
            </div>
            <h3 className="font-display uppercase text-xl text-white">
              Scan Table Standee
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diner points phone camera at the acrylic table standee or tent. Opens instantly in browser with <strong>zero app download</strong> or login required.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-blue-400">
              <QrCode className="w-3.5 h-3.5" />
              <span>Instant Camera Launch</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#141418] border border-white/5 rounded-3xl p-7 relative space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FF5400]/10 border border-[#FF5400]/20 text-[#FF5400] flex items-center justify-center font-display text-xl">
              2
            </div>
            <h3 className="font-display uppercase text-xl text-white">
              Tap What They Loved
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Diner taps their favorite dishes (e.g. <em>Kulhad Chai, Peri Peri Maggi</em>). The 0ms engine instantly pre-drafts an authentic, enthusiastic 5-star review.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-amber-400">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Zero Writer&apos;s Block</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#141418] border border-white/5 rounded-3xl p-7 relative space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-display text-xl">
              3
            </div>
            <h3 className="font-display uppercase text-xl text-white">
              1-Tap Post to Google
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tapping the button copies the review and directly triggers Google&apos;s 5-star modal box. The guest taps the 5th star, pastes, and posts in 3 seconds.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Direct Review Dialog Open</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THE TWO CORE PILLARS (Why It Converts & Protects) */}
      {/* ========================================================================= */}
      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pillar 1: Growth Engine */}
          <div className="bg-[#141418] border border-white/10 rounded-3xl p-8 sm:p-10 space-y-5 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>

            <h3 className="font-display uppercase text-3xl sm:text-4xl text-white tracking-tight">
              MAXIMUM GOOGLE MAPS VISIBILITY
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Google algorithms rank local restaurants based on review frequency, GPS proximity, and dish keyword density.
            </p>

            <ul className="space-y-3 text-xs text-zinc-400 pt-2">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>On-Site GPS Trust:</strong> Reviews submitted while seated at the venue carry the highest algorithm trust score and never get filtered as spam.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Menu Keyword Lift:</strong> Specific dish mentions (e.g. <em>Signature Kulhad Chai</em>) index your restaurant when locals search for those items nearby.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Natural Daily Drip:</strong> Consistent 3–8 new reviews every single day rather than suspicious bulk spikes.</span>
              </li>
            </ul>
          </div>

          {/* Pillar 2: Reputation Firewall */}
          <div className="bg-[#141418] border border-white/10 rounded-3xl p-8 sm:p-10 space-y-5 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="font-display uppercase text-3xl sm:text-4xl text-white tracking-tight">
              REPUTATION FIREWALL SHIELD
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              A single 1-star review on Google Maps damages your ranking for months. Catch diner grievances table-side before they leave.
            </p>

            <ul className="space-y-3 text-xs text-zinc-400 pt-2">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Table-Side Escalation:</strong> 1–3 star ratings invite diners to send an immediate note directly to the GM to fix the food or service on the spot.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Turns Complaints into Loyalty:</strong> Resolving an issue at the table prevents 90%+ of negative public reviews.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>100% Policy Compliant:</strong> Transparent Google review option prevents &quot;Review Gating&quot; penalties.</span>
              </li>
            </ul>
          </div>

          {/* Pillar 3: Role-Based Team Access */}
          <div id="roles" className="bg-[#141418] border border-white/10 rounded-3xl p-8 sm:p-10 space-y-5 relative overflow-hidden scroll-mt-28">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>

            <h3 className="font-display uppercase text-3xl sm:text-4xl text-white tracking-tight">
              TEAM ACCESS, DONE RIGHT
            </h3>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              One platform account, many restaurants. Give every location its own admin without ever exposing the others.
            </p>

            <ul className="space-y-3 text-xs text-zinc-400 pt-2">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>Store Admins:</strong> each owner sees only the locations you assign — their own dishes, sentence combinations, analytics and firewall inbox.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>Owner-first alerts:</strong> low-rating emails go straight to each store&apos;s owner inbox, with delivery status tracked in the console.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>Permanent QR codes:</strong>  one printed standee per location — rename the café, change the menu, and the code still works.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. RESTAURANT SOCIAL PROOF BAR */}
      {/* ========================================================================= */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-white/5">
        <div className="bg-[#141418] border border-white/5 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider">
              Platform Scale
            </span>
          </div>

          <h3 className="font-display uppercase text-2xl sm:text-3xl text-white tracking-tight">
            POWERING {totalStoresCount}+ LOCATIONS ACROSS INDIA
          </h3>

          <p className="text-xs text-zinc-400 max-w-xl mx-auto">
            From youth cafes in Patna and Bihta to bustling bistros in Bengaluru and Pune, ReviewBoost is running on live dining tables every day.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-zinc-300">
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">Chai Sutta Bar (CSB) Bihta</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">Cafe 13 Patna</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">Third Wave Coffee</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">Toit Brewpub</span>
            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">French Window Pune</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-white/5">
        <div className="bg-gradient-to-br from-[#1C1714] via-[#121216] to-[#121216] border border-orange-500/20 rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-[#FF5400]/15 border border-[#FF5400]/30 text-[#FF5400] flex items-center justify-center mx-auto shadow-lg shadow-orange-600/20">
            <Sparkles className="w-7 h-7" />
          </div>

          <h2 className="font-display uppercase text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white max-w-3xl mx-auto leading-tight">
            READY TO MULTIPLY YOUR RESTAURANT&apos;S 5-STAR REVIEWS?
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Explore the 10-second diner flow, or jump into the console to generate print-ready table standees and invite each store&apos;s team.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/admin"
              className="w-full sm:w-auto bg-[#FF5400] hover:bg-[#E04B00] text-white font-display text-sm uppercase tracking-wider px-9 py-4 rounded-xl shadow-2xl shadow-orange-600/35 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Open Admin Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="#how-it-works"
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white font-display text-sm uppercase tracking-wider px-7 py-4 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <span>See How It Works</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CLEAN PROFESSIONAL FOOTER */}
      {/* ========================================================================= */}
      <footer className="pt-12 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Brand Info */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#FF5400] flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display uppercase text-lg text-white">
                REVIEWBOOST
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              The 10-Second Table-to-Google Review Engine for Restaurants &amp; Cafes.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-semibold">
            <Link href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </Link>
            <Link href="/admin/stores" className="hover:text-white transition-colors">
              Table Standees
            </Link>
            <Link href="/admin/analytics" className="hover:text-white transition-colors">
              Live Analytics
            </Link>
            <Link href="/admin" className="hover:text-white transition-colors">
              Admin Login
            </Link>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 text-center">
          <p>
            Designed &amp; Developed by <strong>SayaLabs</strong> (sayalabs.in) • All Rights Reserved.
          </p>
          <p className="text-zinc-600">
            Compliant with Google Business Profile &amp; FTC Guidelines
          </p>
        </div>
      </footer>
    </div>
  );
}
