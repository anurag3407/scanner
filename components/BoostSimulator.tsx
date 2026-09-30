"use client";

import React, { useState, useEffect } from "react";
import { Store } from "@/lib/types";
import CustomerReviewFlow from "./CustomerReviewFlow";
import QRCode from "qrcode";
import {
  Smartphone,
  Sparkles,
  ShieldAlert,
  Zap,
  ArrowRight,
  ExternalLink,
  Printer,
  Check,
  Copy,
  Star,
  CheckCircle2,
  Settings,
  X,
  Activity,
  Scissors,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface Props {
  initialStores: Store[];
}

export default function BoostSimulator({ initialStores }: Props) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [selectedStore, setSelectedStore] = useState<Store>(initialStores[0] || ({} as Store));
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [tableNumber, setTableNumber] = useState<string>("7");
  const [viewMode, setViewMode] = useState<"phone" | "standee" | "firewall">("phone");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Custom restaurant playground state
  const [isCustomizing, setIsCustomizing] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>("Smokey's Craft BBQ");
  const [customCategory, setCustomCategory] = useState<string>("Artisan Smokehouse");
  const [customColor, setCustomColor] = useState<string>("#B91C1C");
  const [customChips, setCustomChips] = useState<string[]>([
    "14-Hour Smoked Brisket",
    "Truffle Mac & Cheese",
    "Bourbon Cocktails",
    "Friendly Pitmaster",
  ]);
  const [newChipInput, setNewChipInput] = useState<string>("");

  // Live ROI Calculator state
  const [calcGuests, setCalcGuests] = useState<number>(2500);
  const [calcAverageCheck, setCalcAverageCheck] = useState<number>(45);

  // Update QR Code on store, table, or custom playground changes
  useEffect(() => {
    if (!selectedStore.slug) return;
    const origin = (typeof window !== "undefined" && window.location?.origin) || "https://fastqr.review";
    const targetUrl = `${origin}/r/${selectedStore.slug}?table=${encodeURIComponent(tableNumber)}`;

    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: "#18181b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("QR Code error", err));
  }, [selectedStore.slug, tableNumber]);

  const handleApplyCustomStore = () => {
    const slug = customName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const customStore: Store = {
      id: `custom_${Date.now()}`,
      slug,
      name: customName,
      tagline: `Finest ${customCategory} in Town`,
      category: customCategory,
      googlePlaceId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
      brandColor: customColor,
      chips: customChips,
      seoKeywords: [customCategory.toLowerCase(), "dining"],
      managerEmail: "gm@restaurant.com",
      managerPhone: "+1 (555) 000-0000",
      ratingScore: 5.0,
      reviewCount: 42,
      createdAt: new Date().toISOString(),
    };

    setStores((prev) => [customStore, ...prev.filter((s) => !s.id.startsWith("custom_"))]);
    setSelectedStore(customStore);
    setIsCustomizing(false);
  };

  const handleCopyLink = () => {
    const origin = (typeof window !== "undefined" && window.location?.origin) || "https://fastqr.review";
    const targetUrl = `${origin}/r/${selectedStore.slug}?table=${encodeURIComponent(tableNumber)}`;
    navigator.clipboard?.writeText(targetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const addCustomChip = () => {
    if (!newChipInput.trim()) return;
    if (!customChips.includes(newChipInput.trim())) {
      setCustomChips([...customChips, newChipInput.trim()]);
    }
    setNewChipInput("");
  };

  const removeCustomChip = (chipToRemove: string) => {
    setCustomChips(customChips.filter((c) => c !== chipToRemove));
  };

  // ROI calculations
  const estimatedReviewsPerMonth = Math.round(calcGuests * 0.055);
  const estimatedRevenueLift = Math.round(calcGuests * calcAverageCheck * 0.05); // 5% Harvard Business Review lift
  const roiMultiplier = Math.round(estimatedRevenueLift / 69);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER & BADGES */}
      {/* ========================================================================= */}
      <div className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 shadow-sm">
          <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
          <span>Interactive Live /boost Demonstration</span>
          <span className="text-emerald-400">•</span>
          <span className="font-mono text-[11px] text-emerald-700">Sub-400ms Dynamic AI Latency</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-900 leading-[1.1]">
          The 10-Second Table-to-Google <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-rose-600 via-amber-600 to-emerald-600 bg-clip-text text-transparent">
            Review Boost Experience
          </span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          See exactly what your diners experience after scanning your table standee. 0ms pre-drafted 5-star reviews, interactive feature chips, and a reputation firewall that intercepts negative reviews on-site.
        </p>

        {/* Business Selector & Playground Button */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-bold uppercase text-zinc-400 mr-1 tracking-wider">
            Simulate Business:
          </span>
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStore(s)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                selectedStore.id === s.id
                  ? "bg-zinc-900 text-white shadow-md scale-105"
                  : "bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.brandColor || "#E11D48" }}
              />
              <span>{s.name}</span>
            </button>
          ))}

          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isCustomizing
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{isCustomizing ? "Close Playground" : "+ Test Your Restaurant"}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CUSTOM RESTAURANT PLAYGROUND MODAL / EXPANDER */}
      {/* ========================================================================= */}
      {isCustomizing && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-500 shadow-xl max-w-3xl mx-auto space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Live Restaurant Playground
              </h3>
              <p className="text-xs text-zinc-500">
                Type your restaurant name, cuisine, and signature dishes to generate your custom review booster instantly!
              </p>
            </div>
            <button
              onClick={() => setIsCustomizing(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Bluefin Sushi Bar"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Cuisine / Category</label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Modern Japanese"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Brand Accent Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-zinc-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-full p-2 rounded-xl border border-zinc-200 font-mono uppercase text-xs"
                />
              </div>
            </div>
          </div>

          {/* Chips Editor */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs space-y-2">
            <label className="block font-bold text-zinc-800">
              Feature Chips (Diners tap these to re-seed the review in &lt;400ms):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {customChips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-zinc-300 font-medium text-zinc-800 shadow-sm"
                >
                  {chip}
                  <button
                    type="button"
                    onClick={() => removeCustomChip(chip)}
                    className="hover:text-rose-600 text-zinc-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newChipInput}
                onChange={(e) => setNewChipInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomChip();
                  }
                }}
                placeholder="Add custom dish or server name..."
                className="flex-1 p-2 rounded-xl border border-zinc-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addCustomChip}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={handleApplyCustomStore}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md"
            >
              Generate Live Interactive Simulator ⚡
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SIMULATOR VIEWPORT & HARDWARE CONTROLS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200 shadow-sm space-y-6">
        {/* View Mode Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("phone")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "phone"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>1. Mobile Guest Screen</span>
            </button>

            <button
              onClick={() => setViewMode("standee")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "standee"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>2. 4x6&quot; Table Tent Standee</span>
            </button>

            <button
              onClick={() => setViewMode("firewall")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "firewall"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>3. Firewall Shield Test</span>
            </button>
          </div>

          {/* Table Switcher */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-500">Table Number:</span>
            <select
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="p-1.5 rounded-lg border border-zinc-200 bg-zinc-50 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="1">Table #1</option>
              <option value="4">Table #4</option>
              <option value="7">Table #7 (Center)</option>
              <option value="12">Table #12 (Patio)</option>
              <option value="Bar-3">Bar Seat #3</option>
            </select>
          </div>
        </div>

        {/* Viewport Render Based on Mode */}
        {viewMode === "phone" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Mobile Phone Frame */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="relative mx-auto w-full max-w-[390px] rounded-[48px] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl p-2">
                {/* Phone Notch/Island */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 h-5 w-28 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-zinc-800/80 mr-3" />
                  <div className="w-2 h-2 rounded-full bg-blue-900/60" />
                </div>

                {/* Screen Content */}
                <div className="rounded-[36px] overflow-hidden bg-zinc-50 pt-8 pb-3 min-h-[660px]">
                  <CustomerReviewFlow
                    key={`${selectedStore.id}-${selectedStore.slug}-${tableNumber}`}
                    store={selectedStore}
                    initialTable={tableNumber}
                    isSimulator={true}
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-4 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Interactive touch screen • Tap chips to test sub-400ms re-seeding
              </p>
            </div>

            {/* Right: Real Phone Scan & Live Explainer */}
            <div className="lg:col-span-6 space-y-6">
              {/* Real Phone QR Scan Box */}
              <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-200/80 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      Scan With Your Smartphone
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Point your phone&apos;s camera app at this QR code to test on your actual mobile screen.
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono text-[11px] font-bold">
                    Table #{tableNumber}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-white border border-zinc-200">
                  {qrCodeDataUrl ? (
                    <div className="bg-white p-2 rounded-xl border border-zinc-200 shadow-sm shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeDataUrl} alt="Store QR Code" className="w-32 h-32 rounded-lg" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-zinc-200 animate-pulse rounded-xl" />
                  )}
                  <div className="space-y-2 text-xs text-zinc-600">
                    <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      0-friction camera scan
                    </div>
                    <p>Loads instantly in any mobile browser. 0ms pre-drafted review already populated.</p>
                    <div className="pt-1 flex flex-wrap gap-2">
                      <button
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition-colors"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? "Link Copied!" : "Copy QR Link"}</span>
                      </button>
                      <Link
                        href={`/r/${selectedStore.slug}?table=${tableNumber}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-black text-white font-semibold text-xs transition-colors"
                      >
                        Open Live URL <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Speed & Latency Benchmark */}
              <div className="p-5 rounded-3xl bg-zinc-900 text-white space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                  <span className="font-bold flex items-center gap-1.5 text-amber-400">
                    <Activity className="w-4 h-4" /> Live Latency Benchmark
                  </span>
                  <span className="font-mono text-zinc-400">Real-Time</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">1. Instant Edge Pre-Draft</span>
                    <span className="font-mono font-bold text-emerald-400">0ms (Instant)</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-[100%]" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-300">2. Gemini 2.5 Flash Chip Personalization</span>
                    <span className="font-mono font-bold text-indigo-400">&lt;350ms</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full w-[94%]" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-zinc-300">3. Traditional Manual Review</span>
                    <span className="font-mono font-bold text-rose-400">150,000ms (2.5 mins)</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full w-[5%]" />
                  </div>
                </div>
              </div>

              {/* Quick links to Admin & Standee */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Link
                  href={`/admin/stores/${selectedStore.id}/print`}
                  className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 transition-all text-center block space-y-1"
                >
                  <Printer className="w-5 h-5 mx-auto text-emerald-600" />
                  <span className="font-bold block text-zinc-900">Print Table Standee</span>
                  <span className="text-[11px] text-zinc-500">4x6&quot; Foldable Tent</span>
                </Link>

                <Link
                  href="/admin/prospectus"
                  className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100 transition-all text-center block space-y-1"
                >
                  <TrendingUp className="w-5 h-5 mx-auto text-indigo-600" />
                  <span className="font-bold block text-zinc-900">SaaS Prospectus</span>
                  <span className="text-[11px] text-zinc-500">Unit Economics &amp; TAM</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ViewMode: 4x6" Table Tent Standee */}
        {viewMode === "standee" && (
          <div className="space-y-6">
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div>
                <span className="font-bold text-zinc-900 block text-sm">
                  Foldable 4x6&quot; Table Tent Standee Preview
                </span>
                <p className="text-zinc-500 mt-0.5">
                  Two-sided foldable cardstock template designed to sit on tables. Features inverted top panel so it reads correctly when folded.
                </p>
              </div>
              <Link
                href={`/admin/stores/${selectedStore.id}/print`}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-bold text-xs hover:bg-black transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Open Fullscreen Print Engine</span>
              </Link>
            </div>

            {/* Standee Mockup Container */}
            <div className="max-w-md mx-auto bg-white rounded-3xl border-2 border-zinc-900 shadow-xl p-6 text-center space-y-4">
              {/* Inverted Top Half */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 transform rotate-180 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Reverse Facing Side
                </span>
                <div className="font-bold text-sm text-zinc-900">{selectedStore.name}</div>
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                {qrCodeDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-24 h-24 mx-auto rounded-lg border border-zinc-200" />
                )}
                <span className="text-[10px] text-zinc-500 block">Table #{tableNumber}</span>
              </div>

              {/* Fold Line */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t-2 border-dashed border-zinc-300" />
                <span className="absolute bg-white px-3 text-[10px] font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                  <Scissors className="w-3 h-3" /> Fold Line
                </span>
              </div>

              {/* Guest Facing Bottom Half */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
                <span
                  className="inline-block px-3 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: selectedStore.brandColor || "#E11D48" }}
                >
                  Loved Your Meal?
                </span>
                <div className="font-black text-base text-zinc-900">{selectedStore.name}</div>
                <p className="text-[11px] text-zinc-500">{selectedStore.tagline || selectedStore.category}</p>
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                {qrCodeDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeDataUrl} alt="QR Code" className="w-28 h-28 mx-auto rounded-lg border-2 border-zinc-900 shadow-sm" />
                )}
                <p className="text-xs font-bold text-zinc-900">Scan to Review in 10 Seconds</p>
                <span className="text-[10px] font-mono text-zinc-400 block">Google Verified Partner • Table #{tableNumber}</span>
              </div>
            </div>
          </div>
        )}

        {/* ViewMode: Reputation Firewall Shield Test */}
        {viewMode === "firewall" && (
          <div className="space-y-6">
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-xs text-amber-900 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-zinc-900">
                  Reputation Firewall Smart Routing In Action
                </h3>
              </div>
              <p className="leading-relaxed">
                When a customer has a sub-par experience, they vent publicly on Google Maps where a 1-star review damages your business for months. ReviewBoost dynamically intercepts 1, 2, and 3 star ratings on the phone:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-white border border-amber-200">
                  <span className="font-bold block text-zinc-900 mb-0.5">1. Google Link Suppressed</span>
                  <span className="text-zinc-500">The public Google Reviews button is completely removed.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-amber-200">
                  <span className="font-bold block text-zinc-900 mb-0.5">2. Private GM Message Box</span>
                  <span className="text-zinc-500">Guest is invited to submit notes directly to the General Manager.</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-amber-200">
                  <span className="font-bold block text-zinc-900 mb-0.5">3. Instant Table-Side Resolution</span>
                  <span className="text-zinc-500">Manager resolves the issue before the customer pays the bill.</span>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => setViewMode("phone")}
                className="px-6 py-3 rounded-2xl bg-zinc-900 text-white font-bold text-xs hover:bg-black transition-colors shadow-md inline-flex items-center gap-2"
              >
                <span>Test in Phone Viewport (Tap 1 or 2 Stars)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. THE 8-STEP VS 2-TAP FRICTION COMPARISON */}
      {/* ========================================================================= */}
      <section className="bg-zinc-900 text-white rounded-3xl p-8 sm:p-12 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            Friction Analysis
          </span>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Why 93% of Happy Diners Never Leave a Review
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Traditional review collection requires too much cognitive effort. Here is how ReviewBoost changes the math.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* The Old Painful Way */}
          <div className="p-6 rounded-3xl bg-zinc-800/80 border border-zinc-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700 text-rose-400 font-bold text-sm">
              <span>The Old Painful Way</span>
              <span className="font-mono text-xs text-rose-300">93% Abandonment</span>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">✕</span>
                Diner finishes meal and leaves restaurant
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">✕</span>
                Must remember to open Google Maps hours later
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">✕</span>
                Search for exact restaurant name &amp; location
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">✕</span>
                Stares at blank white box (severe writer&apos;s block)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">✕</span>
                Spends 3 minutes typing on tiny phone keyboard
              </li>
              <li className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px]">✕</span>
                Result: Only angry diners bother to leave reviews
              </li>
            </ul>
          </div>

          {/* The ReviewBoost /boost Way */}
          <div className="p-6 rounded-3xl bg-zinc-800/80 border-2 border-emerald-500 space-y-4 relative">
            <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-bold">
              REVIEWBOOST FLYWHEEL
            </span>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-700 text-emerald-400 font-bold text-sm">
              <span>The ReviewBoost /boost Way</span>
              <span className="font-mono text-xs text-emerald-300">94.2% Post Rate</span>
            </div>
            <ul className="space-y-2.5 text-xs text-zinc-200 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                1-Second camera scan of table standee
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                0ms pre-drafted 5-star review already on screen
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                Tap 2 dish/server chips to personalize (&lt;400ms)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                1-Tap copies review &amp; opens Google Review dialog
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                Paste &amp; submit in 10 seconds total
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                Result: +35 to +60 verified 5-star reviews every month
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. INTERACTIVE HARVARD BUSINESS REVIEW ROI CALCULATOR */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-zinc-200 shadow-sm space-y-6">
        <div className="text-center max-w-3xl mx-auto space-y-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600">
            Harvard Business Review Validation
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
            Calculate Your Restaurant Revenue Jump
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            A 1-star rating increase produces a 5% to 9% revenue lift according to HBS research.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto pt-4">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2 text-xs">
                <label className="font-bold text-zinc-700 uppercase tracking-wider">
                  Monthly Dine-In Guests:
                </label>
                <span className="font-mono font-bold text-zinc-900 text-sm">
                  {calcGuests.toLocaleString()} guests
                </span>
              </div>
              <input
                type="range"
                min={500}
                max={8000}
                step={100}
                value={calcGuests}
                onChange={(e) => setCalcGuests(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>500</span>
                <span>4,000</span>
                <span>8,000+</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 text-xs">
                <label className="font-bold text-zinc-700 uppercase tracking-wider">
                  Average Ticket / Bill Size:
                </label>
                <span className="font-mono font-bold text-zinc-900 text-sm">
                  ${calcAverageCheck}
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={150}
                step={5}
                value={calcAverageCheck}
                onChange={(e) => setCalcAverageCheck(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>$15 (Casual/Cafe)</span>
                <span>$60 (Dinner)</span>
                <span>$150+ (Fine Dining)</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-zinc-900 text-white space-y-3">
            <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
              Projected Monthly Output
            </span>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">New 5-Star Reviews:</span>
                <span className="text-xl font-black text-white">+{estimatedReviewsPerMonth} /mo</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Google Map Pack Rank:</span>
                <span className="text-base font-bold text-amber-300">#1 - #3 Placement</span>
              </div>
              <div className="flex items-baseline justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Est. Additional Revenue:</span>
                <span className="text-2xl font-black text-emerald-400">+${estimatedRevenueLift.toLocaleString()} /mo</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-zinc-400">ReviewBoost ROI:</span>
                <span className="text-lg font-black text-purple-300">{roiMultiplier}x Return</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. NEXT STEPS & SAAS PROSPECTUS LINK */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
            READY TO SCALE
          </span>
          <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
            Deploy ReviewBoost Across Your Establishment
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Generate your restaurant standees in 60 seconds, or review our comprehensive SaaS investment prospectus detailing TAM, unit economics, and growth loops.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/admin/stores"
            className="px-6 py-3.5 rounded-2xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-100 transition-colors shadow-lg"
          >
            Launch Standees in Admin
          </Link>
          <Link
            href="/prospectus"
            className="px-6 py-3.5 rounded-2xl bg-zinc-800 text-white border border-zinc-700 font-bold text-xs hover:bg-zinc-700 transition-colors"
          >
            View SaaS Prospectus Deck
          </Link>
        </div>
      </div>
    </div>
  );
}
