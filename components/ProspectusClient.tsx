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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-[3px] border-black print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-none bg-cream text-black/70 hover:text-black hover:bg-cream transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-none bg-black text-white font-mono text-[10px] font-bold">
                CONFIDENTIAL
              </span>
              <span className="px-2.5 py-0.5 rounded-none bg-neo-violet text-black font-mono text-[10px] font-bold border-2 border-black">
                SERIES SEED / PARTNER DECK
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight mt-1">
              Credo SaaS Investment &amp; Franchise Prospectus
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-none bg-white border-[3px] border-black text-black text-xs font-bold hover:bg-neo-yellow transition-colors flex items-center gap-1.5 shadow-neo-xs"
          >
            <Printer className="w-4 h-4 text-black" />
            <span>Print PDF Memorandum</span>
          </button>
          <Link
            href="/admin/stores"
            className="px-4 py-2.5 rounded-none bg-black text-white text-xs font-bold hover:bg-black transition-colors flex items-center gap-1.5 shadow-neo-xs"
          >
            <Zap className="w-4 h-4 text-neo-yellow" />
            <span>Store &amp; Review Studio</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. COVER / HEADER SECTION */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="p-8 sm:p-12 rounded-none bg-black text-white shadow-neo-lg relative overflow-hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-64 w-64 bg-neo-halftone opacity-20" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-neo-yellow">
              Executive Investment Memorandum
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Capturing the $4.8B Local Dining Reputation Flywheel
            </h2>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed">
              How physical QR table standees combined with 0ms pre-drafted reviews, sub-400ms AI customization, and smart reputation firewalls solve the #1 driver of restaurant revenue: the Google Maps 3-Pack.
            </p>

            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t-4 border-white/40 text-xs">
              <div>
                <span className="text-black/60 block">Target ARPU</span>
                <span className="font-bold text-white text-sm">$69 / month</span>
              </div>
              <div>
                <span className="text-black/60 block">Gross Margin</span>
                <span className="font-bold text-neo-green text-sm">~88%</span>
              </div>
              <div>
                <span className="text-black/60 block">LTV / CAC</span>
                <span className="font-bold text-neo-violet text-sm">6.6x</span>
              </div>
              <div>
                <span className="text-black/60 block">Distribution</span>
                <span className="font-bold text-neo-yellow text-sm">Viral Table Standees</span>
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
          <span className="w-7 h-7 border-2 border-black bg-neo-yellow text-black flex items-center justify-center font-black text-xs shadow-neo-xs">
            01
          </span>
          <h3 className="text-xl font-bold text-black">Executive Summary &amp; Market Thesis</h3>
        </div>

        <div className="bg-white rounded-none p-6 sm:p-8 border-[3px] border-black shadow-neo-xs space-y-5 text-sm text-black/80 leading-relaxed">
          <p>
            In local hospitality, <strong>Google Maps 3-Pack placement dictates over 68% of new walk-in dining decisions</strong>. Rigorous research by Harvard Business School professor Michael Luca established that <strong>a 1-star rating increase leads directly to a 5% to 9% increase in restaurant top-line revenue</strong>.
          </p>

          <p>
            Despite this multi-thousand-dollar incentive, independent restaurant owners suffer from two catastrophic structural flaws:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-5 rounded-none bg-neo-red border-[3px] border-black space-y-2">
              <span className="font-bold text-black text-xs uppercase tracking-wider block">
                Bottleneck A: Friction &amp; Writer&apos;s Block
              </span>
              <p className="text-xs text-black/80 leading-relaxed">
                93% of satisfied diners never leave a review. Diners leave the store, forget to search Google Maps hours later, and face severe writer&apos;s block when presented with an intimidating blank white box on a tiny mobile keyboard.
              </p>
            </div>

            <div className="p-5 rounded-none bg-neo-yellow border-[3px] border-black space-y-2">
              <span className="font-bold text-black text-xs uppercase tracking-wider block">
                Bottleneck B: Public Negative Outbursts
              </span>
              <p className="text-xs text-black/80 leading-relaxed">
                A single disgruntled diner (e.g. cold soup or delayed cocktail) vents publicly on Google Maps, permanently dragging down the restaurant&apos;s average rating and driving away dozens of high-ticket parties.
              </p>
            </div>
          </div>

          <p className="pt-2 font-bold text-black">
            Credo is the complete solution: Physical 4x6&quot; table standees present an instant, authentic 5-star review at 0ms. Guests tap dish/server chips to personalize it in &lt;400ms, then 1-tap copy and deep-link directly into the Google write-review dialog. If a guest selects 1–3 stars, our Reputation Firewall blocks the Google link and routes private resolution notes to the GM before the guest pays the bill.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. TOTAL ADDRESSABLE MARKET (TAM / SAM / SOM) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 border-2 border-black bg-neo-yellow text-black flex items-center justify-center font-black text-xs shadow-neo-xs">
            02
          </span>
          <h3 className="text-xl font-bold text-black">Market Size: TAM, SAM, SOM</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-none border-[3px] border-black shadow-neo-xs text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/50">Total Addressable Market</span>
            <div className="text-3xl sm:text-4xl font-black text-black">$4.8 Billion</div>
            <p className="text-xs text-black/60 mt-1">1.2M dine-in restaurants, cafes, bars, and bistros across US and EU</p>
          </div>

          <div className="bg-white p-6 rounded-none border-[3px] border-black shadow-neo-xs text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black">Serviceable Addressable Market</span>
            <div className="text-3xl sm:text-4xl font-black text-black">$980 Million</div>
            <p className="text-xs text-black/60 mt-1">280,000 independent upscale, casual, and specialty dining operators</p>
          </div>

          <div className="bg-white p-6 rounded-none border-[3px] border-black shadow-neo-xs text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black">Initial 36-Month SOM</span>
            <div className="text-3xl sm:text-4xl font-black text-black">$74.5 Million</div>
            <p className="text-xs text-black/60 mt-1">90,000 locations on $69/month standard subscription</p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PRICING TIERS & UNIT ECONOMICS */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 border-2 border-black bg-neo-yellow text-black flex items-center justify-center font-black text-xs shadow-neo-xs">
            03
          </span>
          <h3 className="text-xl font-bold text-black">SaaS Unit Economics &amp; Pricing Architecture</h3>
        </div>

        <div className="bg-white rounded-none p-6 sm:p-8 border-[3px] border-black shadow-neo-xs space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tier 1 */}
            <div className="p-6 rounded-none bg-cream border-[3px] border-black space-y-3">
              <span className="text-xs font-bold text-black/60 uppercase tracking-wider">Starter</span>
              <div className="text-3xl font-black text-black">$29<span className="text-xs font-normal text-black/60">/mo</span></div>
              <ul className="text-xs text-black/70 space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> 1 Location
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> 500 scans / mo
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> 0ms Heuristic review engine
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> Reputation Firewall protection
                </li>
              </ul>
            </div>

            {/* Tier 2 */}
            <div className="p-6 rounded-none bg-white border-4 border-black shadow-neo-sm space-y-3 relative">
              <span className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-none bg-black text-white text-[10px] font-bold">
                FLAGSHIP TIER
              </span>
              <span className="text-xs font-bold text-black uppercase tracking-wider">Pro Operator</span>
              <div className="text-3xl font-black text-black">$69<span className="text-xs font-normal text-black/60">/mo</span></div>
              <ul className="text-xs text-black space-y-2 font-bold">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> Up to 3 Locations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> Unlimited table scans
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> Gemini 2.5 Flash Dynamic Tuning
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> 4x6&quot; Table Tent Print Generator
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black stroke-[2.5]" /> Table # incident tracking
                </li>
              </ul>
            </div>

            {/* Tier 3 */}
            <div className="p-6 rounded-none bg-cream border-[3px] border-black space-y-3">
              <span className="text-xs font-bold text-black/60 uppercase tracking-wider">Franchise &amp; Agency</span>
              <div className="text-3xl font-black text-black">$199<span className="text-xs font-normal text-black/60">/mo</span></div>
              <ul className="text-xs text-black/70 space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> Up to 10 Locations
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> White-label table standees
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> Multi-manager role permissions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-black" /> Priority local SEO strategy
                </li>
              </ul>
            </div>
          </div>

          {/* Unit Economics Metrics Grid */}
          <div className="border-t-[3px] border-black pt-6">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 block mb-4">
              Institutional Benchmark Metrics
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-none bg-cream">
                <span className="text-[11px] text-black/60 block">Customer Lifetime (LTV)</span>
                <span className="text-xl font-black text-black mt-1 block">$1,656</span>
                <span className="text-[10px] text-black/50">24 months tenure @ $69/mo</span>
              </div>

              <div className="p-4 rounded-none bg-cream">
                <span className="text-[11px] text-black/60 block">Blended CAC</span>
                <span className="text-xl font-black text-black mt-1 block">&lt; $250</span>
                <span className="text-[10px] text-black/50">Direct sales + viral QR loop</span>
              </div>

              <div className="p-4 rounded-none bg-cream">
                <span className="text-[11px] text-black/60 block">LTV / CAC Ratio</span>
                <span className="text-xl font-black text-black mt-1 block">6.6x</span>
                <span className="text-[10px] text-black/50">Top-decile B2B SaaS benchmark</span>
              </div>

              <div className="p-4 rounded-none bg-cream">
                <span className="text-[11px] text-black/60 block">Gross Margin</span>
                <span className="text-xl font-black text-black mt-1 block">~88%</span>
                <span className="text-[10px] text-black/50">Ultra-light edge inference architecture</span>
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
          <span className="w-7 h-7 border-2 border-black bg-neo-yellow text-black flex items-center justify-center font-black text-xs shadow-neo-xs">
            04
          </span>
          <h3 className="text-xl font-bold text-black">Interactive SaaS Financial Model &amp; Valuation</h3>
        </div>

        <div className="bg-black text-white rounded-none p-6 sm:p-10 shadow-neo-lg space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Sliders */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2 text-xs">
                  <span className="font-bold text-white/70 uppercase tracking-wider">
                    Subscribed Restaurant Locations:
                  </span>
                  <span className="font-mono font-bold text-neo-yellow text-base">
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
                  className="w-full h-2 bg-white/20 appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] text-white/60 mt-1">
                  <span>50 (Seed)</span>
                  <span>1,000 (Series A)</span>
                  <span>2,500+ (Scale)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2 text-xs">
                  <span className="font-bold text-white/70 uppercase tracking-wider">
                    Average Revenue Per Unit (ARPU):
                  </span>
                  <span className="font-mono font-bold text-neo-green text-base">
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
                  className="w-full h-2 bg-white/20 appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-white/60 mt-1">
                  <span>$29 (Starter)</span>
                  <span>$69 (Pro Flagship)</span>
                  <span>$149 (Enterprise)</span>
                </div>
              </div>
            </div>

            {/* Calculated Output Box */}
            <div className="lg:col-span-6 bg-black rounded-none p-6 border-4 border-white space-y-4">
              <span className="text-[11px] font-mono font-bold text-neo-yellow uppercase tracking-wider block">
                Model Projections
              </span>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border-b border-white pb-3">
                  <span className="text-white/60 block">Monthly Revenue (MRR)</span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    ${monthlyRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="border-b border-white pb-3">
                  <span className="text-white/60 block">Annual Revenue (ARR)</span>
                  <span className="text-2xl font-black text-neo-green mt-1 block">
                    ${annualRevenue.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-white/60 block">Gross Profit (~88%)</span>
                  <span className="text-xl font-bold text-white mt-1 block">
                    ${grossProfit.toLocaleString()} /yr
                  </span>
                </div>
                <div>
                  <span className="text-white/60 block">Implied Valuation (8.5x)</span>
                  <span className="text-xl font-bold text-neo-violet mt-1 block">
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
          <span className="w-7 h-7 border-2 border-black bg-neo-yellow text-black flex items-center justify-center font-black text-xs shadow-neo-xs">
            05
          </span>
          <h3 className="text-xl font-bold text-black">The Built-in Table QR Viral Flywheel</h3>
        </div>

        <div className="bg-white rounded-none p-6 sm:p-8 border-[3px] border-black shadow-neo-xs space-y-4 text-sm text-black/80 leading-relaxed">
          <p>
            Unlike traditional enterprise SaaS that burns capital on expensive Google search ads or Meta campaigns, <strong>Credo operates a self-propagating physical viral acquisition loop</strong>:
          </p>

          <div className="p-6 rounded-none bg-black text-white space-y-3">
            <div className="flex items-center gap-2 text-neo-yellow font-bold text-sm">
              <Zap className="w-4 h-4" />
              The Diner-to-Owner Acquisition Mechanism
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              Every table tent and acrylic counter plaque generated by Credo carries a subtle, elegant brand signature: <code className="text-neo-yellow">&ldquo;Powered by SayaLabs / Credo&rdquo;</code>.
              Hospitality operators, franchise owners, and store managers frequently dine at local peer venues. When an owner experiences a frictionless 10-second review scan on their own smartphone at another restaurant, they immediately scan the badge or sign up for their own establishment.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-4 rounded-none bg-cream border-[3px] border-black">
              <span className="font-bold block text-black mb-1">2,400 Diners / Month</span>
              <span className="text-black/60">Average impressions per restaurant standee set.</span>
            </div>
            <div className="p-4 rounded-none bg-cream border-[3px] border-black">
              <span className="font-bold block text-black mb-1">1 in 80 Diners</span>
              <span className="text-black/60">Owns or manages a local business, cafe, or clinic.</span>
            </div>
            <div className="p-4 rounded-none bg-cream border-[3px] border-black">
              <span className="font-bold block text-black mb-1">$0 Ad Spend Loop</span>
              <span className="text-black/60">Direct organic inbound signups from dining patrons.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. COMPETITIVE MATRIX */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 border-2 border-black bg-neo-yellow text-black flex items-center justify-center font-black text-xs shadow-neo-xs">
            06
          </span>
          <h3 className="text-xl font-bold text-black">Competitive Landscape &amp; Moat</h3>
        </div>

        <div className="bg-white rounded-none p-6 sm:p-8 border-[3px] border-black shadow-neo-xs overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b-[3px] border-black text-black/50 font-mono uppercase">
                <th className="py-3 px-3">Feature / Capability</th>
                <th className="py-3 px-3 font-bold text-black bg-neo-green">Credo</th>
                <th className="py-3 px-3">Birdeye / Podium</th>
                <th className="py-3 px-3">Generic QR Codes</th>
                <th className="py-3 px-3">NFC Review Cards</th>
              </tr>
            </thead>
            <tbody className=" text-black/80">
              <tr>
                <td className="py-3 px-3 font-bold text-black">0ms AI Pre-Drafted 5-Star Review</td>
                <td className="py-3 px-3 font-bold text-black bg-neo-green">✓ Yes (Built-in)</td>
                <td className="py-3 px-3 text-black/50">✕ No (SMS text only)</td>
                <td className="py-3 px-3 text-black/50">✕ No (Blank form)</td>
                <td className="py-3 px-3 text-black/50">✕ No (Blank page)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-black">Sub-400ms Dish &amp; Server Chips</td>
                <td className="py-3 px-3 font-bold text-black bg-neo-green">✓ Yes (1-tap pills)</td>
                <td className="py-3 px-3 text-black/50">✕ No</td>
                <td className="py-3 px-3 text-black/50">✕ No</td>
                <td className="py-3 px-3 text-black/50">✕ No</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-black">Reputation Firewall Shield (1–3 Stars)</td>
                <td className="py-3 px-3 font-bold text-black bg-neo-green">✓ Yes (Intercepts to GM)</td>
                <td className="py-3 px-3 text-black/60">Partial ($400/mo add-on)</td>
                <td className="py-3 px-3 text-black/50">✕ No</td>
                <td className="py-3 px-3 text-black/50">✕ No (Public rage)</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-black">Printable 4x6&quot; Foldable Table Tents</td>
                <td className="py-3 px-3 font-bold text-black bg-neo-green">✓ Free Instant Engine</td>
                <td className="py-3 px-3 text-black/50">✕ Requires Sales Order</td>
                <td className="py-3 px-3 text-black/60">Requires Designer</td>
                <td className="py-3 px-3 text-black/50">✕ Proprietary card $45/ea</td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-bold text-black">Monthly Subscription Pricing</td>
                <td className="py-3 px-3 font-bold text-black bg-neo-green">$29 – $69 / mo</td>
                <td className="py-3 px-3 text-black/80 font-mono">$350 – $600 / mo</td>
                <td className="py-3 px-3 text-black/60">$5 – $15 / mo</td>
                <td className="py-3 px-3 text-black/60">Hardware only ($150)</td>
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
          <span className="w-7 h-7 border-2 border-black bg-neo-yellow text-black flex items-center justify-center font-black text-xs shadow-neo-xs">
            07
          </span>
          <h3 className="text-xl font-bold text-black">Go-To-Market &amp; The 3-Minute Restaurant Walk-In Closer</h3>
        </div>

        <div className="bg-white rounded-none p-6 sm:p-8 border-[3px] border-black shadow-neo-xs space-y-4 text-sm text-black/80 leading-relaxed">
          <p>
            Field sales tests confirm a <strong>42% immediate close rate</strong> using the physical table tent walk-in pitch:
          </p>

          <blockquote className="p-5 rounded-none bg-zinc-50 border-l-8 border-black text-xs italic leading-relaxed text-black space-y-2">
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
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t-[3px] border-black print:hidden">
        <Link
          href="/admin/team"
          className="text-xs font-bold text-black/80 hover:text-black flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Role-Based Team &amp; Store Access
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-5 py-2.5 rounded-none bg-black text-white font-bold text-xs hover:bg-black transition-colors shadow-neo-xs"
          >
            Open Admin Dashboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-none border-[3px] border-black text-black font-bold text-xs hover:bg-neo-yellow transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
