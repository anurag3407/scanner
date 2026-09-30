"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  Copy,
  Check,
  Sparkles,
  RotateCcw,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Send,
  AlertCircle,
  ThumbsUp,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Store, ScanEventType } from "@/lib/types";
import { generateOfflineReview } from "@/lib/ai";
import { getGoogleReviewUrl } from "@/lib/review-links";

interface Props {
  store: Store;
  initialTable?: string;
  isSimulator?: boolean;
}

const COMMON_ISSUES = [
  "⏳ Slow service / long wait",
  "🍲 Food was cold or lukewarm",
  "🥩 Order was inaccurate / missing item",
  "🧾 Discrepancy on the bill",
  "🔊 Noisy / uncomfortable seating",
  "💬 Other feedback",
];

export default function CustomerReviewFlow({
  store,
  initialTable = "",
  isSimulator = false,
}: Props) {
  // Pre-selected 5 stars by default
  const [rating, setRating] = useState<number>(5);

  // Pick up to 2 default chips from the store
  const defaultSelectedChips = (store.chips || []).slice(0, 2);
  const [selectedChips, setSelectedChips] = useState<string[]>(defaultSelectedChips);

  // Variation seed for instant alternative drafts
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 100));

  // Current review text
  const [reviewText, setReviewText] = useState<string>(() =>
    generateOfflineReview({
      storeName: store.name,
      category: store.category,
      chips: defaultSelectedChips,
      variationSeed: seed,
      tone: "punchy",
    })
  );

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [hasOpenedGoogle, setHasOpenedGoogle] = useState<boolean>(false);
  const scanLogged = useRef<boolean>(false);

  // Private feedback state for 1-3 stars
  const [feedbackIssue, setFeedbackIssue] = useState<string>("");
  const [feedbackNote, setFeedbackNote] = useState<string>("");
  const [feedbackTable, setFeedbackTable] = useState<string>(initialTable);
  const [feedbackContact, setFeedbackContact] = useState<string>("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string>("");

  // Haptic feedback for touch devices
  const triggerHaptic = (pattern: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  // Log scan event once per visit
  useEffect(() => {
    if (isSimulator || scanLogged.current) return;
    scanLogged.current = true;
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        type: "scan",
        rating: 5,
        chips: [],
      }),
    }).catch(() => {});
  }, [isSimulator, store.id]);

  const logEvent = (type: ScanEventType, payload: { rating?: number; chips?: string[]; reviewText?: string } = {}) => {
    if (isSimulator) return;
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        type,
        rating: payload.rating ?? rating,
        chips: payload.chips ?? selectedChips,
        reviewText: payload.reviewText,
      }),
    }).catch(() => {});
  };

  // Toggle highlight chips
  const toggleChip = (chip: string) => {
    triggerHaptic(10);
    const updated = selectedChips.includes(chip)
      ? selectedChips.filter((c) => c !== chip)
      : [...selectedChips, chip];

    setSelectedChips(updated);
    const newText = generateOfflineReview({
      storeName: store.name,
      category: store.category,
      chips: updated,
      variationSeed: seed,
      tone: "punchy",
    });
    setReviewText(newText);
    logEvent("chip_toggle", { chips: updated, reviewText: newText });
  };

  // Cycle different wording
  const handleNextWording = () => {
    triggerHaptic(15);
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    const newText = generateOfflineReview({
      storeName: store.name,
      category: store.category,
      chips: selectedChips,
      variationSeed: nextSeed,
      tone: "punchy",
    });
    setReviewText(newText);
    logEvent("chip_toggle", { chips: selectedChips, reviewText: newText });
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

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

  // Google Maps / Review target URL
  const googleReviewUrl = getGoogleReviewUrl(store);

  // 1-Tap Copy & Open Google
  const handleOpenGoogle = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    triggerHaptic([25, 45, 25]);
    const ok = await copyToClipboard(reviewText);
    setCopied(ok);

    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"],
      });
    } catch {}

    logEvent("copy_open", { chips: selectedChips, reviewText });
    setHasOpenedGoogle(true);

    if (isSimulator) {
      e.preventDefault();
      setTimeout(() => setCopied(false), 4000);
      return;
    }

    setTimeout(() => setCopied(false), 8000);
  };

  // Submit private feedback (1-3 stars)
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackNote.trim() && !feedbackIssue) return;

    triggerHaptic([20, 40]);
    setIsSubmittingFeedback(true);
    setFeedbackError("");

    const fullMessage = [
      feedbackIssue ? `[ISSUE: ${feedbackIssue}]` : "",
      feedbackNote.trim(),
    ]
      .filter(Boolean)
      .join(" - ");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          storeName: store.name,
          rating,
          tableNumber: feedbackTable || "Table",
          customerContact: feedbackContact || "Guest",
          message: fullMessage,
        }),
      });

      if (res.ok) {
        setFeedbackSent(true);
        logEvent("feedback_submit", { rating });
      } else {
        setFeedbackError("Couldn't send. Please speak with our on-duty manager.");
      }
    } catch {
      setFeedbackError("Network error. Please speak with our on-duty manager.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const isFirewallActive = rating <= 3;
  const brandColor = store.brandColor || "#E11D48";

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden text-zinc-900 transition-all font-sans">
      {/* Clean Restaurant Header */}
      <div
        className="px-6 pt-6 pb-5 text-white relative overflow-hidden"
        style={{ backgroundColor: brandColor }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="pr-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-sm tracking-wide uppercase">
              <ShieldCheck className="w-3 h-3 text-white" />
              Verified Guest
            </span>
            <h1 className="text-xl font-bold mt-1.5 tracking-tight text-white line-clamp-1">{store.name}</h1>
            <p className="text-xs text-white/85 mt-0.5 line-clamp-1">
              {store.address || store.tagline || store.category}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center font-black text-xl text-white shadow-inner shrink-0">
            {store.name.charAt(0)}
          </div>
        </div>

        {isSimulator && (
          <div className="mt-3 py-1 px-2.5 rounded-lg bg-black/25 text-[11px] font-mono flex items-center justify-between text-white/90">
            <span>⚡ Interactive Preview</span>
            <span className="text-emerald-300 font-semibold">0ms AI</span>
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Step 1: Star Rating */}
        <div className="text-center mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            How was your experience today?
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setRating(star);
                  logEvent(star <= 3 ? "firewall_intercept" : "rating_change", { rating: star });
                }}
                className={`p-1.5 rounded-xl transition-all transform active:scale-90 ${
                  rating >= star
                    ? "text-amber-400 drop-shadow-sm scale-110"
                    : "text-zinc-200 hover:text-zinc-300"
                }`}
                aria-label={`Rate ${star} stars`}
              >
                <Star className="w-9 h-9 fill-current stroke-1" />
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-500 mt-2 font-medium">
            {rating === 5 && "⭐ 5/5 — Loved it!"}
            {rating === 4 && "👍 4/5 — Great experience"}
            {rating === 3 && "😐 3/5 — Average"}
            {rating === 2 && "👎 2/5 — Below expectations"}
            {rating === 1 && "⚠️ 1/5 — Not happy"}
          </p>
        </div>

        {/* 1-3 Stars: Reputation Firewall (Private Manager Feedback) */}
        {isFirewallActive ? (
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 text-left transition-all animate-fadeIn">
            {feedbackSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-zinc-900">Message Delivered to Management</h3>
                <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                  Thank you for letting us know directly. Our General Manager has been notified and will address this immediately.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">We want to make this right</h3>
                    <p className="text-[11px] text-zinc-600 mt-0.5">
                      Your note is private and goes straight to our General Manager.
                    </p>
                  </div>
                </div>

                {/* Quick Issue Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => {
                        triggerHaptic(10);
                        setFeedbackIssue(feedbackIssue === issue ? "" : issue);
                      }}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all text-left ${
                        feedbackIssue === issue
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-white text-zinc-700 border border-amber-200 hover:bg-amber-100/60"
                      }`}
                    >
                      {issue}
                    </button>
                  ))}
                </div>

                {/* Note */}
                <textarea
                  rows={2}
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder="Tell our manager what happened..."
                  className="w-full text-xs p-3 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white placeholder-zinc-400"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={feedbackTable}
                    onChange={(e) => setFeedbackTable(e.target.value)}
                    placeholder="Table # (optional)"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  <input
                    type="text"
                    value={feedbackContact}
                    onChange={(e) => setFeedbackContact(e.target.value)}
                    placeholder="Phone / Email (optional)"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingFeedback || (!feedbackNote.trim() && !feedbackIssue)}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isSubmittingFeedback ? (
                    "Sending to Manager..."
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Privately to Manager</span>
                    </>
                  )}
                </button>

                {feedbackError && (
                  <p className="text-[11px] text-rose-600 text-center font-medium">{feedbackError}</p>
                )}
              </form>
            )}
          </div>
        ) : (
          /* 4-5 Stars: The 10-Second Google Review Flow */
          <div className="space-y-4">
            {/* Step 2: Highlight Chips (Tap what you loved) */}
            {store.chips && store.chips.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-zinc-500" />
                  Tap what you enjoyed:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {store.chips.map((chip) => {
                    const active = selectedChips.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleChip(chip)}
                        className={`text-xs px-3 py-2 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                          active
                            ? "bg-zinc-900 text-white shadow-sm scale-102"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 active:scale-95"
                        }`}
                      >
                        <span>{chip}</span>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Pre-drafted Review Preview Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 text-left relative transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Your Pre-Written Review:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNextWording}
                    className="text-[11px] text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-zinc-400" />
                    Different wording
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-[11px] text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3 text-zinc-400" />
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-800 leading-relaxed resize-none"
                />
              ) : (
                <p className="text-xs text-zinc-800 leading-relaxed italic bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  &ldquo;{reviewText}&rdquo;
                </p>
              )}
            </div>

            {/* Step 4: Big Hero Action Button */}
            <div className="pt-2">
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenGoogle}
                className="w-full py-4 px-5 rounded-2xl bg-zinc-900 hover:bg-black text-white font-bold text-sm transition-all transform active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/20"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                    <span>Copied! Opening Google Maps...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-300" />
                    <span>Copy Review &amp; Open Google</span>
                    <ExternalLink className="w-4 h-4 ml-0.5 opacity-60" />
                  </>
                )}
              </a>

              {/* Simple 2-Step Paste Prompt */}
              <div className="mt-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 text-center">
                <p className="text-[11px] text-zinc-600 font-medium">
                  {copied ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Text copied to your clipboard! In Google Maps, tap 5 stars and paste.
                    </span>
                  ) : (
                    <span>
                      <strong>1 Tap:</strong> Copies your review &amp; opens Google Maps directly. Just paste!
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
