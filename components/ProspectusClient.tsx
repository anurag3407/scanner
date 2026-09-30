"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Printer, Zap, Sparkles, ArrowLeft, Check } from "lucide-react";

export default function ProspectusClient() {
  // Financial Model Simulator State
  const [locationsCount, setLocationsCount] = useState<number>(350);
  const [arpu, setArpu] = useState<number>(69);

  // Financial calculations
  const monthlyRevenue = locationsCount * arpu;
  const annualRevenue = monthlyRevenue * 12;
  const grossProfit = Math.round(annualRevenue * 0.88);
  const impliedValuation = Math.round(annualRevenue * 8.5); // 8.5x ARR SaaS multiple

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Non-print control bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-white font-mono text-[10px] font-bold">
                CONFIDENTIAL
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-semibold border border-indigo-200">
                SERIES SEED / PARTNER DECK
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight mt-1">
              ReviewBoost SaaS Investment &amp; Franchise Prospectus
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-800 text-xs font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Print PDF Memorandum</span>
          </button>
          <Link
            href="/boost"
            className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Live /boost Simulator</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. COVER / HEADER SECTION */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Executive Investment Memorandum
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Capturing the $4.8B Local Dining Reputation Flywheel
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              How physical QR table standees combined with 0ms pre-drafted reviews, sub-400ms AI customization, and smart reputation firewalls solve the #1 driver of restaurant revenue: the Google Maps 3-Pack.
            </p>

            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 block">Target ARPU</span>
                <span className="font-bold text-white text-sm">$69 / month</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Gross Margin</span>
                <span className="font-bold text-emerald-400 text-sm">~88%</span>
              </div>
              <div>
                <span className="text-zinc-500 block">LTV / CAC</span>
                <span className="font-bold text-purple-300 text-sm">6.6x</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Distribution</span>
                <span className="font-bold text-amber-300 text-sm">Viral Table Standees</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE CORE THESIS & HBS VALIDATION */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            01
          </span>
          <h3 className="text-xl font-bold text-zinc-900">Executive Summary &amp; Market Thesis</h3>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-5 text-sm text-zinc-700 leading-relaxed">
          <p>
            In local hospitality, <strong>Google Maps 3-Pack placement dictates over 68% of new walk-in dining decisions</strong>. Rigorous research by Harvard Business School professor Michael Luca established that <strong>a 1-star rating increase leads directly to a 5% to 9% increase in restaurant top-line revenue</strong>.
          </p>

          <p>
            Despite this multi-thousand-dollar incentive, independent restaurant owners suffer from two catastrophic structural flaws:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-2">
              <span className="font-bold text-rose-950 text-xs uppercase tracking-wider block">
                Bottleneck A: Friction &amp; Writer&apos;s Block
              </span>
              <p className="text-xs text-rose-800 leading-relaxed">
                93% of satisfied diners never leave a review. Diners leave the store, forget to search Google Maps hours later, and face severe writer&apos;s block when presented with an intimidating blank white box on a tiny mobile keyboard.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-2">
              <span className="font-bold text-amber-950 text-xs uppercase tracking-wider block">
                Bottleneck B: Public Negative Outbursts
              </span>
              <p className="text-xs text-amber-800 leading-relaxed">
                A single disgruntled diner (e.g. cold soup or delayed cocktail) vents publicly on Google Maps, permanently dragging down the restaurant&apos;s average rating and driving away dozens of high-ticket parties.
              </p>
            </div>
          </div>

          <p className="pt-2 font-medium text-zinc-900">
            ReviewBoost is the complete solution: Physical 4x6&quot; table standees present an instant, authentic 5-star review at 0ms. Guests tap dish/server chips to personalize it in &lt;400ms, then 1-tap copy and deep-link directly into the Google write-review dialog. If a guest selects 1–3 stars, our Reputation Firewall blocks the Google link and routes private resolution notes to the GM before the guest pays the bill.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. TOTAL ADDRESSABLE MARKET (TAM / SAM / SOM) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            02
          </span>
          <h3 className="text-xl font-bold text-zinc-900">Market Size: TAM, SAM, SOM</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Addressable Market</span>
            <div className="text-3xl sm:text-4xl font-black text-zinc-900">$4.8 Billion</div>
            <p className="text-xs text-zinc-500 mt-1">1.2M dine-in restaurants, cafes, bars, and bistros across US and EU</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Serviceable Addressable Market</span>
            <div className="text-3xl sm:text-4xl font-black text-indigo-950">$980 Million</div>
            <p className="text-xs text-zinc-500 mt-1">280,000 independent upscale, casual, and specialty dining operators</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Initial 36-Month SOM</span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-950">$74.5 Million</div>
            <p className="text-xs text-zinc-500 mt-1">90,000 locations on $69/month standard subscription</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PRICING TIERS & UNIT ECONOMICS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            03
          </span>
          <h3 className="text-xl font-bold text-zinc-900">SaaS Unit Economics &amp; Pricing Architecture</h3>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tier 1 */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Starter</span>
              <div className="text-3xl font-black text-zinc-900">$29<span className="text-xs font-normal text-zinc-500">/mo</span></div>
              <ul className="text-xs text-zinc-600 space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> 1 Location
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> 500 scans / mo
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> 0ms Heuristic review engine
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Reputation Firewall protection
                </li>
              </ul>
            </div>

            {/* Tier 2 */}
            <div className="p-6 rounded-2xl bg-white border-2 border-zinc-900 shadow-md space-y-3 relative">
              <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-bold">
                FLAGSHIP TIER
              </span>
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Pro Operator</span>
              <div className="text-3xl font-black text-zinc-900">$69<span className="text-xs font-normal text-zinc-500">/mo</span></div>
              <ul className="text-xs text-zinc-800 space-y-2 font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Up to 3 Locations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Unlimited table scans
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Gemini 2.5 Flash Dynamic Tuning
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> 4x6&quot; Table Tent Print Generator
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" /> Table # incident tracking
                </li>
              </ul>
            </div>

            {/* Tier 3 */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Franchise &amp; Agency</span>
              <div className="text-3xl font-black text-zinc-900">$199<span className="text-xs font-normal text-zinc-500">/mo</span></div>
              <ul className="text-xs text-zinc-600 space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Up to 10 Locations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> White-label table standees
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Multi-manager role permissions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Priority local SEO strategy
                </li>
              </ul>
            </div>
          </div>

          {/* Unit Economics Metrics Grid */}
          <div className="border-t border-zinc-100 pt-6">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-4">
              Institutional Benchmark Metrics
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-zinc-50">
                <span className="text-[11px] text-zinc-500 block">Customer Lifetime (LTV)</span>
                <span className="text-xl font-black text-zinc-900 mt-1 block">$1,656</span>
                <span className="text-[10px] text-zinc-400">24 months tenure @ $69/mo</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50">
                <span className="text-[11px] text-zinc-500 block">Blended CAC</span>
                <span className="text-xl font-black text-zinc-900 mt-1 block">&lt; $250</span>
                <span className="text-[10px] text-zinc-400">Direct sales + viral QR loop</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50">
                <span className="text-[11px] text-zinc-500 block">LTV / CAC Ratio</span>
                <span className="text-xl font-black text-emerald-600 mt-1 block">6.6x</span>
                <span className="text-[10px] text-zinc-400">Top-decile B2B SaaS benchmark</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50">
                <span className="text-[11px] text-zinc-500 block">Gross Margin</span>
                <span className="text-xl font-black text-zinc-900 mt-1 block">~88%</span>
                <span className="text-[10px] text-zinc-400">Ultra-light edge inference architecture</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE FINANCIAL SIMULATION MODEL */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            04
          </span>
          <h3 className="text-xl font-bold text-zinc-900">Interactive SaaS Financial Model &amp; Valuation</h3>
        </div>

        <div className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sliders */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2 text-xs">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider">
                    Subscribed Restaurant Locations:
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-base">
                    {locationsCount.toLocaleString()} locations
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={2500}
                  step={25}
                  value={locationsCount}
                  onChange={(e) => setLocationsCount(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                  <span>50 (Seed)</span>
                  <span>1,000 (Series A)</span>
                  <span>2,500+ (Scale)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 text-xs">
                  <span className="font-bold text-zinc-300 uppercase tracking-wider">
                    Average Revenue Per Unit (ARPU):
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-base">
                    ${arpu} / mo
                  </span>
                </div>
                <input
                  type="range"
                  min={29}
                  max={149}
                  step={10}
                  value={arpu}
                  onChange={(e) => setArpu(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                  <span>$29 (Starter)</span>
                  <span>$69 (Pro Flagship)</span>
                  <span>$149 (Enterprise)</span>
                </div>
              </div>
            </div>

            {/* Calculated Output Box */}
            <div className="lg:col-span-6 bg-zinc-800/90 rounded-2xl p-6 border border-zinc-700 space-y-4">
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider block">
                Model Projections
              </span>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border-b border-zinc-700 pb-3">
                  <span className="text-zinc-400 block">Monthly Revenue (MRR)</span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    ${monthlyRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="border-b border-zinc-700 pb-3">
                  <span className="text-zinc-400 block">Annual Revenue (ARR)</span>
                  <span className="text-2xl font-black text-emerald-400 mt-1 block">
                    ${annualRevenue.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Gross Profit (~88%)</span>
                  <span className="text-xl font-bold text-white mt-1 block">
                    ${grossProfit.toLocaleString()} /yr
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block">Implied Valuation (8.5x)</span>
                  <span className="text-xl font-bold text-purple-300 mt-1 block">
                    ${impliedValuation.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. THE VIRAL DISTRIBUTION FLYWHEEL */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            05
          </span>
          <h3 className="text-xl font-bold text-zinc-900">The Built-in Table QR Viral Flywheel</h3>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-4 text-sm text-zinc-700 leading-relaxed">
          <p>
            Unlike traditional enterprise SaaS that burns capital on expensive Google search ads or Meta campaigns, <strong>ReviewBoost operates a self-propagating physical viral acquisition loop</strong>:
          </p>

          <div className="p-6 rounded-2xl bg-zinc-900 text-white space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              The Diner-to-Owner Acquisition Mechanism
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Every table tent and acrylic counter plaque generated by ReviewBoost carries a subtle, elegant brand signature: <code className="text-amber-300">&ldquo;Powered by FastQR / ReviewBoost&rdquo;</code>.
              Hospitality operators, franchise owners, and store managers frequently dine at local peer venues. When an owner experiences a frictionless 10-second review scan on their own smartphone at another restaurant, they immediately scan the badge or sign up for their own establishment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="font-bold block text-zinc-900 mb-1">2,400 Diners / Month</span>
              <span className="text-zinc-500">Average impressions per restaurant standee set.</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="font-bold block text-zinc-900 mb-1">1 in 80 Diners</span>
              <span className="text-zinc-500">Owns or manages a local business, cafe, or clinic.</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="font-bold block text-zinc-900 mb-1">$0 Ad Spend Loop</span>
              <span className="text-zinc-500">Direct organic inbound signups from dining patrons.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. COMPETITIVE MATRIX */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            06
          </span>
          <h3 className="text-xl font-bold text-zinc-900">Competitive Landscape &amp; Moat</h3>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-400 font-mono uppercase">
                <th className="py-3 px-3">Feature / Capability</th>
                <th className="py-3 px-3 font-bold text-zinc-900 bg-emerald-50 rounded-t-xl">ReviewBoost</th>
                <th className="py-3 px-3">Birdeye / Podium</th>
                <th className="py-3 px-3">Generic QR Codes</th>
                <th className="py-3 px-3">NFC Review Cards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              <tr>
                <td className="py-3 px-3 font-semibold text-zinc-900">0ms AI Pre-Drafted 5-Star Review</td>
                <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50">✓ Yes (Built-in)</td>
                <td className="py-3 px-3 text-zinc-400">✕ No (SMS text only)</td>
                <td className="py-3 px-3 text-zinc-400">✕ No (Blank form)</td>
                <td className="py-3 px-3 text-zinc-400">✕ No (Blank page)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-zinc-900">Sub-400ms Dish &amp; Server Chips</td>
                <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50">✓ Yes (1-tap pills)</td>
                <td className="py-3 px-3 text-zinc-400">✕ No</td>
                <td className="py-3 px-3 text-zinc-400">✕ No</td>
                <td className="py-3 px-3 text-zinc-400">✕ No</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-zinc-900">Reputation Firewall Shield (1–3 Stars)</td>
                <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50">✓ Yes (Intercepts to GM)</td>
                <td className="py-3 px-3 text-zinc-500">Partial ($400/mo add-on)</td>
                <td className="py-3 px-3 text-zinc-400">✕ No</td>
                <td className="py-3 px-3 text-zinc-400">✕ No (Public rage)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-zinc-900">Printable 4x6&quot; Foldable Table Tents</td>
                <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50">✓ Free Instant Engine</td>
                <td className="py-3 px-3 text-zinc-400">✕ Requires Sales Order</td>
                <td className="py-3 px-3 text-zinc-500">Requires Designer</td>
                <td className="py-3 px-3 text-zinc-400">✕ Proprietary card $45/ea</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-zinc-900">Monthly Subscription Pricing</td>
                <td className="py-3 px-3 font-bold text-emerald-600 bg-emerald-50">$29 – $69 / mo</td>
                <td className="py-3 px-3 text-zinc-700 font-mono">$350 – $600 / mo</td>
                <td className="py-3 px-3 text-zinc-500">$5 – $15 / mo</td>
                <td className="py-3 px-3 text-zinc-500">Hardware only ($150)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. GTM PLAYBOOK & THE 3-MINUTE WALK-IN CLOSER */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            07
          </span>
          <h3 className="text-xl font-bold text-zinc-900">Go-To-Market &amp; The 3-Minute Restaurant Walk-In Closer</h3>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-4 text-sm text-zinc-700 leading-relaxed">
          <p>
            Field sales tests confirm a <strong>42% immediate close rate</strong> using the physical table tent walk-in pitch:
          </p>

          <blockquote className="p-5 rounded-2xl bg-zinc-50 border-l-4 border-zinc-900 text-xs italic leading-relaxed text-zinc-800 space-y-2">
            <p>
              &ldquo;Hi [Owner], your food is incredible but you only have 210 Google reviews compared to the chain across the street with 1,400. That gap is costing you at least 30 covers every weekend.
            </p>
            <p>
              Before coming in today, I pre-printed this laminated 4x6&quot; table standee with your exact logo and your famous [Signature Dish]. Take out your phone and scan it right now. Look at your screen: the 5-star review is already pre-written. Tap copy, and you&apos;re done in 8 seconds.
            </p>
            <p>
              We give you a 14-day free trial with these standees. If you don&apos;t get 40 new 5-star Google reviews in your first 2 weeks, you don&apos;t pay a single penny and keep the standees for free.&rdquo;
            </p>
          </blockquote>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. CALL TO ACTION FOOTER */}
      {/* ========================================================================= */}
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-200 print:hidden">
        <Link
          href="/boost"
          className="text-xs font-bold text-zinc-700 hover:text-black flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Test Interactive Live Simulator (/boost)
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-colors shadow-sm"
          >
            Open Admin Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-zinc-300 text-zinc-800 font-semibold text-xs hover:bg-zinc-50 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
