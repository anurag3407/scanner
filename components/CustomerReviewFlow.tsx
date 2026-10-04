"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Star,
  Copy,
  Check,
  Sparkles,
  RotateCcw,
  Edit3,
  ExternalLink,
  Send,
  AlertCircle,
  ThumbsUp,
} from "lucide-react";
import confetti from "canvas-confetti";
import { PublicStore, ScanEventType } from "@/lib/types";
import { DEFAULT_CHIPS, generateUniqueReview } from "@/lib/ai";
import { getGoogleReviewUrl, isDirectReviewUrl } from "@/lib/review-links";

interface Props {
  store: PublicStore;
  initialTable?: string;
}

const COMMON_ISSUES = [
  "⏳ Slow service / long wait",
  "🍲 Food was cold or lukewarm",
  "🥩 Order was inaccurate / missing item",
  "🧾 Discrepancy on the bill",
  "🔊 Noisy / uncomfortable seating",
  "💬 Other feedback",
];

export default function CustomerReviewFlow({ store, initialTable = "" }: Props) {
  // Pre-selected 5 stars by default
  const [rating, setRating] = useState<number>(5);

  // The store's own chips, or generic ones so every QR has a working flow.
  const availableChips = store.chips && store.chips.length > 0 ? store.chips : DEFAULT_CHIPS;

  // Pick up to 2 default chips from the store
  const defaultSelectedChips = availableChips.slice(0, 2);
  const [selectedChips, setSelectedChips] = useState<string[]>(defaultSelectedChips);

  // Variation seed for instant alternative drafts
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 100_000));

  // Drafts this visitor has already been shown — the generator never repeats one.
  const seenDrafts = useRef<string[]>([]);

  const tone = store.reviewTone ?? "punchy";

  const generateDraft = (chips: string[], variationSeed: number): string => {
    const draft = generateUniqueReview(
      {
        storeName: store.name,
        category: store.category,
        chips,
        variationSeed,
        // Pass the rating through. Without this the generator cannot know the
        // diner tapped 4 rather than 5, so a 4-star guest is handed "Five stars
        // all around" — the integrity defect recorded as Gap 4.
        rating,
        tone,
        templates: store.reviewTemplates,
        keywords: store.signatureKeywords,
      },
      seenDrafts.current
    );
    seenDrafts.current = [...seenDrafts.current.slice(-11), draft];
    return draft;
  };

  // Current review text. The very first draft is produced without touching the
  // seen-history ref (refs must not be accessed during render); it is recorded
  // by the mount effect below instead.
  const [reviewText, setReviewText] = useState<string>(() =>
    generateUniqueReview({
      storeName: store.name,
      category: store.category,
      chips: defaultSelectedChips,
      variationSeed: Math.floor(Math.random() * 100_000),
      tone,
      templates: store.reviewTemplates,
      keywords: store.signatureKeywords,
    }, [])
  );

  // Record the initial draft as seen, so "Different wording" never repeats it.
  useEffect(() => {
    seenDrafts.current = [reviewText];
    // Runs once on mount: the initial draft is the one being registered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

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

  const logEvent = (type: ScanEventType, payload: { rating?: number; chips?: string[]; reviewText?: string } = {}) => {
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
    const newText = generateDraft(updated, seed);
    setReviewText(newText);
    logEvent("chip_toggle", { chips: updated, reviewText: newText });
  };

  // Cycle different wording
  const handleNextWording = () => {
    triggerHaptic(15);
    const nextSeed = seed + 1;
    setSeed(nextSeed);
    const newText = generateDraft(selectedChips, nextSeed);
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
  const handleOpenGoogle = async () => {
    triggerHaptic([25, 45, 25]);
    const ok = await copyToClipboard(reviewText);
    setCopied(ok);

    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#FF6B6B", "#FFD93D", "#C4B5FD", "#6BCB77", "#000000"],
      });
    } catch {}

    logEvent("copy_open", { chips: selectedChips, reviewText });
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

  // The restaurant header (brand banner + "Verified Guest") is rendered by the
  // CustomerScanExperience wrapper that hosts this flow — one header per scan
  // page, never two.

  return (
    <div className="w-full border-4 border-black bg-white shadow-neo-md">
      <div className="p-5 sm:p-6">
        {/* Step 1: Star Rating */}
        <div className="mb-6 text-center">
          <p className="mb-3 inline-block border-2 border-black bg-neo-violet px-3 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
            How was your experience today?
          </p>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setRating(star);
                  logEvent(star <= 3 ? "firewall_intercept" : "rating_change", { rating: star });
                }}
                className={`rounded-none p-1 transition-all duration-100 ease-linear active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow ${
                  rating >= star ? "scale-110" : "opacity-40 hover:opacity-80"
                }`}
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`h-10 w-10 sm:h-11 sm:w-11 stroke-[1.5] ${
                    rating >= star ? "fill-neo-yellow text-black" : "fill-white text-black"
                  }`}
                />
              </button>
            ))}
          </div>

          <p className="mt-3 inline-block border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-black shadow-neo-xs">
            {rating === 5 && "⭐ 5/5 — Loved it!"}
            {rating === 4 && "👍 4/5 — Great experience"}
            {rating === 3 && "😐 3/5 — Average"}
            {rating === 2 && "👎 2/5 — Below expectations"}
            {rating === 1 && "⚠️ 1/5 — Not happy"}
          </p>
        </div>

        {/* 1-3 Stars: Reputation Firewall (Private Manager Feedback) */}
        {isFirewallActive ? (
          <div className="border-4 border-black bg-neo-violet p-5 shadow-neo transition-all">
            {feedbackSent ? (
              <div className="bg-white p-5 text-center shadow-neo-xs">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border-[3px] border-black bg-neo-green">
                  <Check className="h-6 w-6 text-black" strokeWidth={3.5} />
                </div>
                <h3 className="text-base font-black uppercase tracking-wide text-black">
                  Message delivered to management
                </h3>
                <p className="mt-1.5 text-xs font-bold leading-relaxed text-black/70">
                  Thank you for letting us know directly. Our General Manager has been notified and
                  will address this immediately.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <div className="mb-3 flex items-start gap-2 bg-white p-3 shadow-neo-xs">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-black" strokeWidth={3} />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wide text-black">
                      We want to make this right
                    </h3>
                    <p className="mt-0.5 text-[11px] font-bold text-black/70">
                      Your note is private and goes straight to our General Manager.
                    </p>
                  </div>
                </div>

                {/* Quick Issue Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {COMMON_ISSUES.map((issue) => (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => {
                        triggerHaptic(10);
                        setFeedbackIssue(feedbackIssue === issue ? "" : issue);
                      }}
                      className={`border-[3px] border-black px-2.5 py-1.5 text-left text-[11px] font-bold transition-all duration-100 ease-linear shadow-neo-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white ${
                        feedbackIssue === issue
                          ? "bg-black text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                          : "bg-white text-black hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
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
                  className="w-full border-[3px] border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none resize-none"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={feedbackTable}
                    onChange={(e) => setFeedbackTable(e.target.value)}
                    placeholder="Table # (optional)"
                    className="w-full border-[3px] border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                  <input
                    type="text"
                    value={feedbackContact}
                    onChange={(e) => setFeedbackContact(e.target.value)}
                    placeholder="Phone / Email (optional)"
                    className="w-full border-[3px] border-black bg-white px-3 py-2.5 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingFeedback || (!feedbackNote.trim() && !feedbackIssue)}
                  className="flex w-full items-center justify-center gap-1.5 border-[3px] border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black disabled:cursor-not-allowed disabled:opacity-50 enabled:active:translate-x-1 enabled:active:translate-y-1 enabled:active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                >
                  {isSubmittingFeedback ? (
                    "Sending to Manager..."
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" strokeWidth={3} />
                      <span>Send privately to manager</span>
                    </>
                  )}
                </button>

                {feedbackError && (
                  <p className="border-2 border-black bg-neo-red px-3 py-1.5 text-center text-[11px] font-black uppercase tracking-wide text-black">
                    {feedbackError}
                  </p>
                )}

                {/* Google Policy Compliance: Unrestricted access to Google Reviews */}
                <div className="border-t-[3px] border-black pt-3 text-center">
                  <a
                    href={googleReviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-white px-2 py-1 text-[11px] font-bold text-black underline decoration-2 underline-offset-2 transition-colors hover:bg-neo-yellow"
                  >
                    <span>Prefer to leave a public review on Google Maps instead?</span>
                    <ExternalLink className="h-3 w-3" strokeWidth={3} />
                  </a>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* 4-5 Stars: The 10-Second Google Review Flow */
          <div className="space-y-5">
            {/* Step 2: Highlight Chips (Tap what you loved) */}
            <div>
              <p className="mb-2.5 inline-block -rotate-1 border-2 border-black bg-neo-violet px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                <ThumbsUp className="mr-1 inline h-3 w-3" strokeWidth={3} />
                Tap what you enjoyed:
              </p>
              <div className="flex flex-wrap gap-2.5">
                {availableChips.map((chip, i) => {
                  const active = selectedChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={`border-[3px] border-black px-3 py-2 text-xs font-black uppercase tracking-wide transition-all duration-100 ease-linear shadow-neo-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow ${
                        active
                          ? "-rotate-1 bg-black text-white"
                          : `bg-white text-black hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                              i % 2 === 0 ? "rotate-0" : "rotate-1"
                            } hover:rotate-0`
                      }`}
                    >
                      <span>{chip}</span>
                      {active && <Check className="ml-1.5 inline h-3.5 w-3.5 text-neo-yellow" strokeWidth={4} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Pre-drafted Review Preview Card */}
            <div className="border-4 border-black bg-neo-yellow p-4 shadow-neo transition-all">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                  <Sparkles className="h-3 w-3" strokeWidth={3} />
                  Your pre-written review
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNextWording}
                    className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" strokeWidth={3} />
                    Reroll
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center gap-1 border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-black hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" strokeWidth={3} />
                    {isEditing ? "Done" : "Edit"}
                  </button>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  rows={3}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full resize-none border-[3px] border-black bg-white p-3 text-xs font-bold leading-relaxed text-black shadow-neo-xs transition-all duration-100 ease-linear focus:shadow-neo-sm focus:outline-none"
                />
              ) : (
                <p className="border-[3px] border-black bg-white p-3 text-xs font-bold italic leading-relaxed text-black shadow-neo-xs">
                  &ldquo;{reviewText}&rdquo;
                </p>
              )}
            </div>

            {/* Step 4: Big Hero Action Button */}
            <div className="pt-1">
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOpenGoogle}
                className="flex w-full items-center justify-center gap-2 border-4 border-black bg-neo-red px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-neo transition-all duration-100 ease-linear hover:bg-black hover:text-white active:translate-x-1.5 active:translate-y-1.5 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow"
              >
                {copied ? (
                  <>
                    <Check className="h-5 w-5 text-neo-green" strokeWidth={3.5} />
                    <span>Copied! Opening Google Reviews...</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" strokeWidth={3} />
                    <span>
                      {isDirectReviewUrl(store.googlePlaceId)
                        ? "Copy review & open 5★ review box"
                        : "Copy review & open Google Reviews"}
                    </span>
                    <ExternalLink className="ml-0.5 h-4 w-4 opacity-70" />
                  </>
                )}
              </a>

              {/* 3-Step Clear Paste Guidance */}
              <div className="mt-4">
                {copied ? (
                  <div className="border-[3px] border-black bg-neo-green p-4 text-left shadow-neo-sm">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black">
                      <Check className="h-4 w-4" strokeWidth={4} />
                      <span>Review copied to clipboard!</span>
                    </div>
                    <div className="mt-3 space-y-2 text-[11px] font-bold text-black">
                      <p className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center border-2 border-black bg-white text-[10px] font-black">1</span>
                        Tap the <strong>5th star ⭐</strong> on Google
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center border-2 border-black bg-white text-[10px] font-black">2</span>
                        Tap the review box &amp; tap <strong>Paste 📋</strong>
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center border-2 border-black bg-white text-[10px] font-black">3</span>
                        Tap <strong>Post 🚀</strong> — done in 3 seconds!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-black bg-cream px-3 py-2.5 text-center">
                    <p className="text-[11px] font-bold text-black/70">
                      <strong className="text-black">1 TAP:</strong> copies your review &amp; opens
                      Google Reviews. Just tap paste!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
