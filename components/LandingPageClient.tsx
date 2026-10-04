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
  TrendingUp,
  QrCode,
  UtensilsCrossed,
  CheckCircle2,
  Users,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Store } from "@/lib/types";

interface Props {
  sampleStore: Store | null;
  /** Real count of live locations. Never fabricated — see app/page.tsx. */
  totalLocationsCount?: number;
}

export default function LandingPageClient({ sampleStore, totalLocationsCount = 0 }: Props) {
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
        colors: ["#FF6B6B", "#FFD93D", "#C4B5FD", "#6BCB77", "#000000"],
      });
    } catch {}

    setTimeout(() => setCopied(false), 3500);
  };

  const trustHighlights = [
    "0ms first draft",
    "Direct 5★ modal open",
    "Reputation firewall shield",
    "Your review, your words",
  ];

  const steps = [
    {
      n: "1",
      title: "Scan Table Standee",
      body: (
        <>
          Diner points phone camera at the acrylic table standee or tent. Opens instantly in browser
          with <strong>zero app download</strong> or login required.
        </>
      ),
      icon: <QrCode className="h-3.5 w-3.5" strokeWidth={3} />,
      caption: "Instant camera launch",
      bg: "bg-neo-blue",
    },
    {
      n: "2",
      title: "Tap What They Loved",
      body: (
        <>
          Diner taps their favorite dishes (e.g. <em>Kulhad Chai, Peri Peri Maggi</em>). The 0ms
          engine instantly pre-drafts an authentic, enthusiastic 5-star review.
        </>
      ),
      icon: <UtensilsCrossed className="h-3.5 w-3.5" strokeWidth={3} />,
      caption: "Zero writer's block",
      bg: "bg-neo-yellow",
    },
    {
      n: "3",
      title: "1-Tap Post to Google",
      body: (
        <>
          Tapping the button copies the review and directly triggers Google&apos;s 5-star modal box.
          The guest taps the 5th star, pastes, and posts in 3 seconds.
        </>
      ),
      icon: <Check className="h-3.5 w-3.5" strokeWidth={4} />,
      caption: "Direct review dialog open",
      bg: "bg-neo-green",
    },
  ];

  const pillars = [
    {
      id: undefined,
      icon: <TrendingUp className="h-6 w-6" strokeWidth={2.5} />,
      iconBg: "bg-neo-green",
      title: (
        <>
          MAXIMUM GOOGLE
          <br />
          MAPS VISIBILITY
        </>
      ),
      body: "Google algorithms rank local restaurants based on review frequency, GPS proximity, and dish keyword density.",
      points: [
        {
          strong: "On-Site GPS Trust:",
          text: "Reviews submitted while seated at the venue carry the highest algorithm trust score and never get filtered as spam.",
        },
        {
          strong: "Menu Keyword Lift:",
          text: "Specific dish mentions (e.g. Signature Kulhad Chai) index your restaurant when locals search for those items nearby.",
        },
        {
          strong: "Natural Daily Drip:",
          text: "Consistent 3–8 new reviews every single day rather than suspicious bulk spikes.",
        },
      ],
    },
    {
      id: undefined,
      icon: <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />,
      iconBg: "bg-neo-yellow",
      title: (
        <>
          REPUTATION
          <br />
          FIREWALL SHIELD
        </>
      ),
      body: "A single 1-star review on Google Maps damages your ranking for months. Catch diner grievances table-side before they leave.",
      points: [
        {
          strong: "Table-Side Escalation:",
          text: "1–3 star ratings invite diners to send an immediate note directly to the GM to fix the food or service on the spot.",
        },
        {
          strong: "Turns Complaints into Loyalty:",
          text: "Resolving an issue at the table prevents 90%+ of negative public reviews.",
        },
        {
          strong: "No Review Gating:",
          text: "Guests are never blocked or discouraged from leaving a public review — the Google option stays visible to everyone, whatever they tap.",
        },
      ],
    },
    {
      id: "roles",
      icon: <Users className="h-6 w-6" strokeWidth={2.5} />,
      iconBg: "bg-neo-violet",
      title: (
        <>
          TEAM ACCESS,
          <br />
          DONE RIGHT
        </>
      ),
      body: "One platform account, many restaurants. Give every location its own admin without ever exposing the others.",
      points: [
        {
          strong: "Store Admins:",
          text: "each owner sees only the locations you assign — their own live menu, dishes, sentence combinations, analytics and firewall inbox.",
        },
        {
          strong: "Owner-first alerts:",
          text: "low-rating emails go straight to each store's owner inbox, with delivery status tracked in the console.",
        },
        {
          strong: "Permanent QR codes:",
          text: "one printed standee per location — rename the café, change the menu, and the code still works.",
        },
      ],
    },
  ];

  return (
    <div className="relative w-full bg-cream bg-neo-grid font-sans text-black selection:bg-neo-yellow selection:text-black">
      {/* ========================================================================= */}
      {/* 1. FLOATING NAVBAR */}
      {/* ========================================================================= */}
      <div className="sticky top-3 z-50 mx-auto max-w-6xl px-4 pt-4 sm:top-4 sm:pt-6">
        <header className="flex items-center justify-between border-4 border-black bg-white px-4 py-3 shadow-neo-md sm:px-6">
          {/* Brand Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-9 w-9 -rotate-6 items-center justify-center border-[3px] border-black bg-neo-yellow shadow-neo-xs transition-transform group-hover:rotate-6">
              <Sparkles className="h-4 w-4" strokeWidth={3} />
            </span>
            <span className="font-display text-2xl uppercase tracking-tight text-black">
              CREDO
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden items-center gap-6 text-xs font-black uppercase tracking-widest text-black md:flex">
            <Link href="#how-it-works" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              How It Works
            </Link>
            <Link href="#benefits" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              Why It Converts
            </Link>
            <Link href="#roles" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              Team &amp; Roles
            </Link>
            {/* Pricing must be reachable from the marketing site. A buyer who
                cannot find a price cannot buy, however good the demo is. */}
            <Link href="/pricing" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              Pricing
            </Link>
            <Link href="/admin" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              Admin Portal
            </Link>
          </nav>

          {/* Right Action Button */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 border-[3px] border-black bg-neo-red px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:px-5"
            >
              <span>Pricing</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={3} />
            </Link>
          </div>
        </header>
      </div>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION WITH INTERACTIVE DEMO */}
      {/* ========================================================================= */}
      <section className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-5 text-center">
          {/* Live Status Pill */}
          <div className="inline-flex -rotate-1 items-center gap-2 border-[3px] border-black bg-white px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
            <span className="h-2 w-2 animate-pulse bg-neo-green" />
            <span>Turn Table Diners into 5★ Google Reviews in 10s</span>
            <span className="text-black/40">•</span>
            <span className="bg-neo-yellow px-1">Zero App Download</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="font-display text-4xl uppercase leading-[0.95] tracking-tight text-black sm:text-6xl lg:text-7xl">
            TURN DINING GUESTS INTO
            <br />
            <span className="inline-block -rotate-1 border-4 border-black bg-neo-yellow px-3 py-1 shadow-neo-md">
              5-STAR GOOGLE REVIEWS
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="mx-auto max-w-2xl text-sm font-bold leading-relaxed text-black/70 sm:text-base">
            Eliminate customer writer&apos;s block. Diners tap what they ate, our 0ms engine
            pre-drafts the review, and Google&apos;s 5-star box opens directly. Negative feedback is
            intercepted privately.
          </p>

          {/* CTA Buttons — one clear primary action, secondary links to a live standee */}
          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            <Link
              href="#how-it-works"
              className="flex w-full items-center justify-center gap-2 border-4 border-black bg-neo-red px-8 py-4 text-sm font-black uppercase tracking-widest text-white shadow-neo transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow active:translate-x-1.5 active:translate-y-1.5 active:shadow-none sm:w-auto"
            >
              <span>See How It Works</span>
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </Link>

            {sampleStore && (
              <Link
                href={`/r/${sampleStore.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 border-4 border-black bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-black shadow-neo transition-all duration-100 ease-linear hover:bg-neo-violet active:translate-x-1.5 active:translate-y-1.5 active:shadow-none sm:w-auto"
              >
                <span>{sampleStore.name} Table Standee</span>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={3} />
              </Link>
            )}
          </div>

          {/* Quick Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 pt-3 text-xs font-black uppercase tracking-widest text-black">
            {trustHighlights.map((t, i) => (
              <span key={t} className={`flex items-center gap-1.5 border-2 border-black bg-white px-2 py-1 shadow-neo-xs ${i % 2 === 0 ? "-rotate-1" : "rotate-1"}`}>
                <CheckCircle2 className="h-4 w-4 text-neo-green" strokeWidth={3} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE HERO MOCKUP CARD (Live Interactive Widget) */}
        {/* ========================================================================= */}
        <div className="mx-auto mt-14 max-w-lg">
          <div className="relative overflow-hidden border-4 border-black bg-white p-6 text-left shadow-neo-lg sm:p-7">
            {/* Mock Restaurant Header */}
            <div className="flex items-center justify-between border-b-[3px] border-black pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 -rotate-3 items-center justify-center border-[3px] border-black bg-neo-violet text-sm font-black text-black shadow-neo-xs">
                  CSB
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase leading-tight tracking-wide text-black">{storeName}</h3>
                  <p className="text-[11px] font-bold text-black/60">Table #4 • Verified On-Site Guest</p>
                </div>
              </div>
              <span className="rotate-2 border-2 border-black bg-neo-green px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                0ms Engine
              </span>
            </div>

            {/* Star Selector */}
            <div className="my-5 text-center">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="cursor-pointer p-0.5 transition-transform duration-100 ease-linear hover:scale-125 active:scale-90"
                  >
                    <Star
                      className={`h-8 w-8 stroke-[1.5] ${
                        rating >= star ? "fill-neo-yellow text-black" : "fill-white text-black/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] font-black uppercase tracking-widest">
                {rating >= 4 ? (
                  <span className="bg-neo-green px-2 py-0.5 text-black">⭐⭐⭐⭐⭐ 5/5 Happy diner (proceeds to Google)</span>
                ) : (
                  <span className="bg-neo-red px-2 py-0.5 text-black">⚠️ 1–3 stars: reputation firewall intercepts privately</span>
                )}
              </p>
            </div>

            {rating >= 4 ? (
              <div className="space-y-4">
                {/* Highlight Chips */}
                <div>
                  <span className="mb-2 inline-block -rotate-1 border-2 border-black bg-neo-violet px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                    Tap dishes to customize review in 0ms:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {defaultChips.map((chip) => {
                      const active = selectedChips.includes(chip);
                      return (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => toggleChip(chip)}
                          className={`cursor-pointer border-[3px] border-black px-3 py-1.5 text-xs font-black uppercase tracking-wide shadow-neo-xs transition-all duration-100 ease-linear active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                            active ? "bg-black text-white" : "bg-white text-black hover:bg-neo-yellow"
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
                <div className="border-[3px] border-black bg-cream p-3.5 text-xs font-bold italic leading-relaxed text-black shadow-neo-xs">
                  &ldquo;{getSimulatedReview()}&rdquo;
                </div>

                {/* Main 1-Tap Hand-Off Button */}
                <button
                  type="button"
                  onClick={handleTestCopy}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 border-4 border-black bg-neo-red px-4 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-neo transition-all duration-100 ease-linear hover:bg-black hover:text-white active:translate-x-1.5 active:translate-y-1.5 active:shadow-none"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-neo-green" strokeWidth={4} />
                      <span>Copied to clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" strokeWidth={3} />
                      <span>Copy Review Text</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] font-bold uppercase tracking-widest text-black/50">
                  This demo copies the text only. On a live table QR it also opens Google&apos;s
                  write-a-review box — scan a demo location to see the real flow.
                </p>
              </div>
            ) : (
              /* Reputation Firewall Mock */
              <div className="space-y-2.5 border-[3px] border-black bg-neo-yellow p-4 text-xs text-black shadow-neo-xs">
                <div className="flex items-center gap-2 font-black uppercase tracking-widest">
                  <ShieldAlert className="h-4 w-4" strokeWidth={3} />
                  <span>Reputation Firewall Active</span>
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-black/80">
                  Negative ratings trigger an immediate private manager alert table-side. The manager
                  can visit the table and resolve the issue before a 1-star review hits Google Maps.
                </p>
                <div className="border-[3px] border-black bg-white p-2.5 font-mono text-[10px] font-bold text-black shadow-neo-xs">
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
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 border-t-4 border-black px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl space-y-3 text-center">
          <span className="inline-block rotate-1 border-2 border-black bg-neo-blue px-3 py-1 font-mono text-xs font-black uppercase tracking-widest text-white shadow-neo-xs">
            10-Second Table Workflow
          </span>
          <h2 className="font-display text-3xl uppercase tracking-tight text-black sm:text-5xl">
            HOW IT TURNS DINERS INTO REVIEWS
          </h2>
          <p className="text-xs font-bold text-black/70 sm:text-sm">
            Traditional review requests get ignored because writing a review takes work. Credo
            makes it effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
          {steps.map((step, idx) => (
            <div
              key={step.n}
              className={`relative space-y-4 border-4 border-black bg-white p-7 shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-2 hover:shadow-neo-md ${
                idx === 1 ? "md:rotate-1" : idx === 2 ? "md:-rotate-1" : ""
              } hover:rotate-0`}
            >
              <div
                className={`flex h-12 w-12 -rotate-3 items-center justify-center border-[3px] border-black font-display text-xl text-black shadow-neo-xs ${step.bg}`}
              >
                {step.n}
              </div>
              <h3 className="text-xl font-black uppercase tracking-wide text-black">{step.title}</h3>
              <p className="text-xs font-bold leading-relaxed text-black/70">{step.body}</p>
              <div className="flex items-center gap-1.5 pt-2 text-[11px] font-black uppercase tracking-widest text-black">
                <span className="border-2 border-black bg-white px-1.5 py-0.5 shadow-neo-xs">{step.icon}</span>
                <span>{step.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. THE TWO CORE PILLARS (Why It Converts & Protects) */}
      {/* ========================================================================= */}
      <section id="benefits" className="mx-auto max-w-6xl scroll-mt-24 border-t-4 border-black px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {pillars.map((pillar, idx) => (
            <div
              key={idx}
              id={pillar.id}
              className={`relative space-y-5 overflow-hidden border-4 border-black bg-white p-8 shadow-neo-md sm:p-10 ${
                idx === 0 ? "-rotate-1" : idx === 1 ? "rotate-1" : "-rotate-1"
              } transition-all duration-200 ease-linear hover:rotate-0 hover:shadow-neo-lg ${pillar.id ? "scroll-mt-28" : ""}`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center border-[3px] border-black shadow-neo-xs ${pillar.iconBg}`}
              >
                {pillar.icon}
              </div>

              <h3 className="font-display text-3xl uppercase tracking-tight text-black sm:text-4xl">
                {pillar.title}
              </h3>

              <p className="text-xs font-bold leading-relaxed text-black/70 sm:text-sm">{pillar.body}</p>

              <ul className="space-y-3 border-t-[3px] border-black pt-4 text-xs font-bold text-black/70">
                {pillar.points.map((p) => (
                  <li key={p.strong} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-neo-green" strokeWidth={4} />
                    <span>
                      <strong className="font-black text-black">{p.strong}</strong> {p.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. RESTAURANT SOCIAL PROOF BAR */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-6xl border-t-4 border-black bg-neo-yellow px-4 py-14 sm:px-6 lg:px-8">
        <div className="space-y-4 border-4 border-black bg-white p-6 text-center shadow-neo-md sm:p-8">
          <div className="flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse bg-neo-green" />
            <span className="font-mono text-xs font-black uppercase tracking-widest text-black">
              Platform Scale
            </span>
          </div>

          <h3 className="font-display text-2xl uppercase tracking-tight text-black sm:text-3xl">
            BUILT FOR INDEPENDENT RESTAURANTS ACROSS INDIA
          </h3>

          <p className="mx-auto max-w-xl text-xs font-bold text-black/70">
            {totalLocationsCount > 0
              ? `${totalLocationsCount} demo ${
                  totalLocationsCount === 1 ? "location is" : "locations are"
                } live right now — scan one with your own phone camera.`
              : "No locations are live yet. Demo scans are being set up as we onboard."}
          </p>

          <div className="pt-2 text-[10px] font-bold uppercase tracking-widest text-black/50">
            Demo locations — real restaurant names, not current customers
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="mx-auto max-w-6xl border-t-4 border-black bg-black px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative space-y-6 overflow-hidden border-4 border-white p-8 text-center shadow-neo-white-md sm:p-14">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 bg-neo-halftone opacity-20" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 bg-neo-halftone opacity-20" />

          <div className="mx-auto flex h-16 w-16 rotate-3 items-center justify-center border-4 border-neo-yellow bg-neo-yellow shadow-neo-white-sm">
            <Sparkles className="h-7 w-7 text-black" strokeWidth={2.5} />
          </div>

          <h2 className="mx-auto max-w-3xl font-display text-3xl uppercase leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            READY TO MULTIPLY YOUR RESTAURANT&apos;S{" "}
            <span className="text-neo-yellow">5-STAR REVIEWS?</span>
          </h2>

          <p className="mx-auto max-w-xl text-xs font-bold leading-relaxed text-white/70 sm:text-sm">
            Explore the 10-second diner flow, or jump into the console to generate print-ready table
            standees and invite each store&apos;s team.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
            {/* This was "Open Admin Console" — the largest button on the
                marketing page, and it sent every prospective buyer straight
                into a Clerk login wall. The primary CTA for a stranger is the
                price. */}
            <Link
              href="/pricing"
              className="flex w-full items-center justify-center gap-2 border-4 border-white bg-neo-red px-9 py-4 text-sm font-black uppercase tracking-widest text-black shadow-neo-white-sm transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-1.5 active:translate-y-1.5 active:shadow-none sm:w-auto"
            >
              <span>See Pricing</span>
              <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </Link>

            <Link
              href="#how-it-works"
              className="flex w-full items-center justify-center gap-2 border-4 border-white bg-transparent px-7 py-4 text-sm font-black uppercase tracking-widest text-white transition-all duration-100 ease-linear hover:bg-white hover:text-black sm:w-auto"
            >
              <span>See How It Works</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. CLEAN PROFESSIONAL FOOTER */}
      {/* ========================================================================= */}
      <footer className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          {/* Brand Info */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <div className="flex h-7 w-7 -rotate-6 items-center justify-center border-2 border-black bg-neo-yellow">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={3} />
              </div>
              <span className="font-display text-lg uppercase text-black">CREDO</span>
            </div>
            <p className="text-xs font-bold text-black/60">
              The 10-Second Table-to-Google Review Engine for Restaurants &amp; Cafes.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-black uppercase tracking-widest text-black">
            <Link href="#how-it-works" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              How It Works
            </Link>
            <Link href="/admin/stores" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              Table Standees
            </Link>
            <Link href="/admin/analytics" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              Live Analytics
            </Link>
            <Link href="/admin" className="border-2 border-transparent px-1 py-0.5 transition-all duration-100 ease-linear hover:border-black hover:bg-neo-yellow hover:shadow-neo-xs">
              Admin Login
            </Link>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t-[3px] border-black pt-6 text-center text-[11px] font-bold text-black/60 sm:flex-row">
          <p>
            Designed &amp; Developed by <strong className="font-black text-black">SayaLabs</strong>{" "}
            (sayalabs.in) • All Rights Reserved.
          </p>
          <p>Compliant with Google Business Profile &amp; FTC Guidelines</p>
        </div>
      </footer>
    </div>
  );
}
