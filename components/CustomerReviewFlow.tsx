"use client";

import React, { useState, useEffect } from "react";
import { Star, Copy, Check, Sparkles, MessageSquare, ShieldCheck, HeartHandshake, ExternalLink } from "lucide-react";
import confetti from "canvas-confetti";
import { Store } from "@/lib/types";
import { generateOfflineReview } from "@/lib/ai";

interface Props {
  store: Store;
  initialTable?: string;
  isSimulator?: boolean;
}

export default function CustomerReviewFlow({ store, initialTable = "", isSimulator = false }: Props) {
  const [rating, setRating] = useState<number>(5);
  const initialChips = Array.isArray(store.chips) ? store.chips.slice(0, 2) : [];
  const [selectedChips, setSelectedChips] = useState<string[]>(initialChips);
  const [reviewText, setReviewText] = useState<string>(() =>
    generateOfflineReview({
      storeName: store.name,
      category: store.category,
      chips: initialChips,
      variationSeed: 0,
    })
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [variationSeed, setVariationSeed] = useState<number>(0);

  // Reputation Firewall form state
  const [feedbackTable, setFeedbackTable] = useState<string>(initialTable);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerContact, setCustomerContact] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);

  // Log initial scan event
  useEffect(() => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        type: "scan",
        rating: 5,
        chips: (store.chips || []).slice(0, 2),
      }),
    }).catch(() => {});
  }, [store.id, store.chips]);

  // Handle toggling of chips
  const toggleChip = async (chip: string) => {
    let next: string[];
    if (selectedChips.includes(chip)) {
      next = selectedChips.filter((c) => c !== chip);
    } else {
      next = [...selectedChips, chip];
    }
    setSelectedChips(next);
    await updateReview(next, variationSeed);
  };

  // Re-generate or shuffle
  const handleShuffle = async () => {
    const nextSeed = variationSeed + 1;
    setVariationSeed(nextSeed);
    await updateReview(selectedChips, nextSeed);
  };

  const updateReview = async (chips: string[], seed: number) => {
    setIsGenerating(true);
    const validChips = chips.filter(Boolean);

    try {
      const res = await fetch("/api/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: store.name,
          category: store.category,
          chips: validChips,
          rating,
          variationSeed: seed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.review) {
          setReviewText(data.review);
          setIsGenerating(false);
          return;
        }
      }
    } catch {
      // Ignore network errors and fallback
    }

    // Instant offline fallback
    const fallback = generateOfflineReview({
      storeName: store.name,
      category: store.category,
      chips: validChips,
      variationSeed: seed,
    });
    setReviewText(fallback);
    setIsGenerating(false);
  };

  // Fallback-resilient clipboard copy
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback below
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  };

  // 1-Tap Hand-off to Google
  const handleCopyAndOpenGoogle = async () => {
    // Copy review text to clipboard with fallback
    await copyToClipboard(reviewText);
    setCopied(true);

    // Trigger celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"],
      });
    } catch {}

    // Log telemetry event
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        type: "copy_open",
        rating,
        chips: selectedChips,
        reviewText,
      }),
    }).catch(() => {});

    const googleReviewUrl = `https://search.google.com/local/writereview?placeid=${encodeURIComponent(store.googlePlaceId)}`;

    if (isSimulator) {
      // In simulator sandbox: show celebration without jarring external popup
      setTimeout(() => setCopied(false), 3800);
      return;
    }

    // On real guest mobile browser: open directly or redirect to bypass iOS Safari popup blockers
    try {
      const opened = window.open(googleReviewUrl, "_blank", "noopener,noreferrer");
      if (!opened || opened.closed || typeof opened.closed === "undefined") {
        window.location.href = googleReviewUrl;
      }
    } catch {
      window.location.href = googleReviewUrl;
    }

    setTimeout(() => setCopied(false), 4500);
  };

  // Reputation Firewall submit
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setIsSubmittingFeedback(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          storeName: store.name,
          rating,
          tableNumber: feedbackTable,
          customerName,
          customerContact,
          message: feedbackMessage,
        }),
      });

      if (res.ok) {
        setFeedbackSubmitted(true);
      }
    } catch {
      alert("Unable to send feedback. Please inform your server.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const isFirewallActive = rating <= 3;

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden text-zinc-900 transition-all">
      {/* Brand Header */}
      <div
        className="px-6 pt-6 pb-5 text-white relative overflow-hidden"
        style={{ backgroundColor: store.brandColor || "#E11D48" }}
      >
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              Verified Guest Review
            </span>
            <h1 className="text-xl font-bold mt-2 tracking-tight text-white">{store.name}</h1>
            <p className="text-xs text-white/80 mt-0.5 line-clamp-1">{store.tagline || store.category}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center font-black text-xl text-white shadow-inner">
            {store.name.charAt(0)}
          </div>
        </div>

        {isSimulator && (
          <div className="mt-3 py-1 px-2.5 rounded-lg bg-black/25 text-[11px] font-mono flex items-center justify-between">
            <span>⚡ Interactive Mobile Simulation</span>
            <span className="text-emerald-300 font-semibold">&lt;400ms AI latency</span>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Star Rating Selector */}
        <div className="text-center mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
            How was your visit today?
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`p-2 rounded-xl transition-all transform active:scale-90 ${
                  rating >= star
                    ? "text-amber-400 drop-shadow-sm scale-105"
                    : "text-zinc-200 hover:text-zinc-300"
                }`}
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className="w-8 h-8 fill-current stroke-1"
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-2 font-medium">
            {rating === 5 && "⭐ Exceptional! (5/5 Stars)"}
            {rating === 4 && "👍 Great experience (4/5 Stars)"}
            {rating === 3 && "😐 Average (3/5 Stars)"}
            {rating === 2 && "👎 Below expectations (2/5 Stars)"}
            {rating === 1 && "⚠️ Disappointed (1/5 Stars)"}
          </p>
        </div>

        {/* REPUTATION FIREWALL: 1-3 Stars */}
        {isFirewallActive ? (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 text-left transition-all animate-fadeIn">
            {feedbackSubmitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">Message Delivered to Management</h3>
                <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                  Thank you for being candid. Our General Manager has received your notes and will take action immediately.
                </p>
                <div className="mt-5 p-3 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-800 font-medium">
                  We appreciate giving us the chance to make it right directly.
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900">We want to make this right</h2>
                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                      Please tell our General Manager directly what fell short before you leave.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleFeedbackSubmit} className="space-y-3 mt-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                      What went wrong? *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="e.g. food temperature, delayed service, order mixup..."
                      className="w-full text-xs p-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white placeholder-zinc-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                        Table # (Optional)
                      </label>
                      <input
                        type="text"
                        value={feedbackTable}
                        onChange={(e) => setFeedbackTable(e.target.value)}
                        placeholder="Table 4"
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="First name"
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                      Phone or Email (to follow up)
                    </label>
                    <input
                      type="text"
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      placeholder="email@example.com or phone"
                      className="w-full text-xs px-2.5 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback || !feedbackMessage.trim()}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSubmittingFeedback ? (
                      "Sending to Manager..."
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        Send Privately to General Manager
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        ) : (
          /* POSITIVE FLOW: 4-5 Stars -> 1-Tap Google Reviews */
          <div className="space-y-4">
            {/* Feature Chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-700">Tap highlights to personalize:</span>
                <span className="text-[11px] text-zinc-400 font-medium">Instant AI Seed</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {store.chips.map((chip) => {
                  const active = selectedChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                        active
                          ? "bg-zinc-900 text-white shadow-sm scale-102"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80"
                      }`}
                    >
                      {active ? "✓ " : "+ "}
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generated Review Box */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Your Pre-Drafted 5-Star Review:
                </span>
                <button
                  type="button"
                  onClick={handleShuffle}
                  disabled={isGenerating}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  {isGenerating ? "Refining..." : "Shuffle Tone"}
                </button>
              </div>
              <textarea
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full text-xs p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 leading-relaxed text-zinc-800 transition-all resize-none font-normal"
              />
            </div>

            {/* 1-Tap Google Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopyAndOpenGoogle}
                className="w-full py-4 px-5 rounded-2xl bg-zinc-900 hover:bg-black text-white font-semibold text-sm transition-all transform active:scale-98 flex items-center justify-center gap-2.5 shadow-lg shadow-zinc-900/15"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                    <span>{isSimulator ? "Copied to clipboard! ⚡" : "Copied! Opening Google Reviews..."}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-300" />
                    <span>Copy Review & Open Google</span>
                    <ExternalLink className="w-4 h-4 ml-0.5 opacity-70" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 mt-2.5 text-[11px] text-zinc-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Copies to clipboard & opens official Google Review box</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Guarantee */}
        <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Powered by FastQR / ReviewBoost</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Restaurant Partner
          </span>
        </div>
      </div>
    </div>
  );
}
