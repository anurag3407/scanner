"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  Copy,
  Check,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  HeartHandshake,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Zap,
  Utensils,
  Heart,
  AlertTriangle,
  Send,
  HelpCircle,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Store, ScanEventType, ReviewTone } from "@/lib/types";
import { generateOfflineReview } from "@/lib/ai";

interface Props {
  store: Store;
  initialTable?: string;
  isSimulator?: boolean;
}

// 1-Tap Issue tags for Reputation Firewall (1-3 stars)
const COMMON_ISSUES = [
  { id: "wait", label: "⏳ Slow Service / Long Wait", text: "Delayed service and long wait times" },
  { id: "temp", label: "🍲 Food Was Cold / Lukewarm", text: "Food temperature was cold or lukewarm" },
  { id: "order", label: "🥩 Order Mixup / Inaccurate", text: "Order was inaccurate or missing items" },
  { id: "bill", label: "🧾 Bill / Pricing Issue", text: "Discrepancy with the bill or pricing" },
  { id: "noise", label: "🔊 Bad Seating / Too Noisy", text: "Uncomfortable seating or noisy environment" },
  { id: "staff", label: "😕 Inattentive Staff", text: "Staff was unresponsive or inattentive" },
];

function getChipBadge(chip: string): { icon: string; category: "dish" | "service" | "vibe" } {
  const lower = chip.toLowerCase();
  if (
    lower.includes("server") ||
    lower.includes("service") ||
    lower.includes("host") ||
    lower.includes("staff") ||
    lower.includes("waiter") ||
    lower.includes("chef") ||
    lower.includes("pitmaster") ||
    lower.includes("barista") ||
    lower.includes("santosh") ||
    lower.includes("rahul") ||
    lower.includes("priya") ||
    lower.includes("vikram") ||
    lower.includes("rohit") ||
    lower.includes("deepak") ||
    lower.includes("ananya") ||
    lower.includes("team") ||
    lower.includes("hospitality") ||
    lower.includes("alex") ||
    lower.includes("marco")
  ) {
    return { icon: "👤", category: "service" };
  }
  if (
    lower.includes("vibe") ||
    lower.includes("music") ||
    lower.includes("patio") ||
    lower.includes("decor") ||
    lower.includes("wifi") ||
    lower.includes("ambiance") ||
    lower.includes("atmosphere") ||
    lower.includes("view") ||
    lower.includes("seating")
  ) {
    return { icon: "✨", category: "vibe" };
  }
  return { icon: "🍽️", category: "dish" };
}

export default function CustomerReviewFlow({ store, initialTable = "", isSimulator = false }: Props) {
  const [rating, setRating] = useState<number>(5);
  const initialChips = Array.isArray(store.chips) ? store.chips.slice(0, 2) : [];
  const [selectedChips, setSelectedChips] = useState<string[]>(initialChips);
  const [customChips, setCustomChips] = useState<string[]>([]);
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [customInputText, setCustomInputText] = useState<string>("");

  // Review tone & length state
  const [tone, setTone] = useState<ReviewTone>("punchy");

  const [initialRandomSeed] = useState<number>(() => Math.floor(Math.random() * 1000));
  const [variationSeed, setVariationSeed] = useState<number>(initialRandomSeed);

  const [reviewText, setReviewText] = useState<string>(() =>
    generateOfflineReview({
      storeName: store.name,
      category: store.category,
      chips: initialChips,
      variationSeed: initialRandomSeed,
      tone: "punchy",
    })
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFailed, setCopyFailed] = useState<boolean>(false);
  const scanLogged = useRef<boolean>(false);
  const firewallWasActive = useRef<boolean>(false);
  const editedByDiner = useRef<boolean>(false);
  const reviewTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Hand-off & return-to-tab guidance state
  const [hasOpenedGoogle, setHasOpenedGoogle] = useState<boolean>(false);
  const [showReturnDrawer, setShowReturnDrawer] = useState<boolean>(false);
  const [reviewPostedSuccess, setReviewPostedSuccess] = useState<boolean>(false);
  const [showAltPlatforms, setShowAltPlatforms] = useState<boolean>(false);
  const [complimentSubmitted, setComplimentSubmitted] = useState<boolean>(false);
  const [isSendingCompliment, setIsSendingCompliment] = useState<boolean>(false);

  // Reputation Firewall form state
  const [feedbackTable, setFeedbackTable] = useState<string>(initialTable);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerContact, setCustomerContact] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [resolutionPreference, setResolutionPreference] = useState<"manager_now" | "contact_later">("manager_now");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [feedbackError, setFeedbackError] = useState<string>("");

  // Haptic feedback trigger for mobile touch devices
  const triggerHaptic = (pattern: number | number[] = 15) => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  // Telemetry is only recorded for real diner sessions.
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

  // Log the initial table scan once per visit
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

  // Record when a diner is routed into the Reputation Firewall (1-3 stars)
  useEffect(() => {
    if (isSimulator) return;
    const active = rating <= 3;
    if (active && !firewallWasActive.current) {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: store.id, type: "firewall_intercept", rating, chips: [] }),
      }).catch(() => {});
    }
    firewallWasActive.current = active;
  }, [rating, isSimulator, store.id]);

  // Listen for returning to tab after Google review handoff
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && hasOpenedGoogle && !reviewPostedSuccess) {
        setShowReturnDrawer(true);
      }
    };
    const handleFocus = () => {
      if (hasOpenedGoogle && !reviewPostedSuccess) {
        setShowReturnDrawer(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [hasOpenedGoogle, reviewPostedSuccess]);

  // Handle toggling of chips
  const toggleChip = async (chip: string) => {
    triggerHaptic(12);
    let next: string[];
    if (selectedChips.includes(chip)) {
      next = selectedChips.filter((c) => c !== chip);
    } else {
      next = [...selectedChips, chip];
    }
    setSelectedChips(next);
    logEvent("chip_toggle", { chips: next });
    await updateReview(next, variationSeed, tone);
  };

  // Add custom dish / mention chip
  const handleAddCustomChip = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInputText.trim();
    if (!trimmed) return;

    triggerHaptic(20);
    const updatedCustom = [...customChips, trimmed];
    const updatedSelected = [...selectedChips, trimmed];
    setCustomChips(updatedCustom);
    setSelectedChips(updatedSelected);
    setCustomInputText("");
    setShowAddCustom(false);
    await updateReview(updatedSelected, variationSeed, tone);
  };

  const handleRatingSelect = (nextRating: number) => {
    triggerHaptic(nextRating >= 4 ? 20 : [30, 40]);
    if (nextRating === rating) return;
    setRating(nextRating);
    logEvent("rating_change", { rating: nextRating, chips: [] });
  };

  // Tone switch handler
  const handleToneSelect = async (nextTone: ReviewTone) => {
    if (nextTone === tone) return;
    triggerHaptic(12);
    setTone(nextTone);
    editedByDiner.current = false;
    await updateReview(selectedChips, variationSeed, nextTone);
  };

  // Re-generate or shuffle
  const handleShuffle = async () => {
    triggerHaptic(15);
    const nextSeed = variationSeed + 1;
    setVariationSeed(nextSeed);
    editedByDiner.current = false;
    await updateReview(selectedChips, nextSeed, tone);
  };

  const updateReview = async (chips: string[], seed: number, currentTone: ReviewTone) => {
    const validChips = chips.filter(Boolean);

    // Instant 0ms draft so diner never experiences network wait
    const instantDraft = generateOfflineReview({
      storeName: store.name,
      category: store.category,
      chips: validChips,
      variationSeed: seed,
      tone: currentTone,
    });

    if (!editedByDiner.current) {
      setReviewText(instantDraft);
    }

    setIsGenerating(true);
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
          tone: currentTone,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.review && !editedByDiner.current) {
          setReviewText((prev) => (prev === instantDraft ? data.review : prev));
        }
      }
    } catch {
      // Offline draft is already on screen
    }
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

  const googleReviewUrl = store.googlePlaceId
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(store.googlePlaceId)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name} ${store.address || store.tagline || store.category}`.trim())}`;

  // 1-Tap Hand-off to Google
  const handleHandoff = (e: React.MouseEvent<HTMLAnchorElement>) => {
    triggerHaptic([25, 45, 25]);
    const copyResult = copyToClipboard(reviewText);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"],
      });
    } catch {}

    logEvent("copy_open", { chips: selectedChips, reviewText });
    setHasOpenedGoogle(true);

    if (isSimulator) {
      e.preventDefault();
    }

    void copyResult.then((ok) => {
      setCopied(ok);
      setCopyFailed(!ok);
      if (!ok && reviewTextareaRef.current) {
        reviewTextareaRef.current.focus();
        reviewTextareaRef.current.select();
      }
      setTimeout(() => setCopied(false), 6000);
    });
  };

  // 1-Tap Issue chip toggling for Reputation Firewall
  const handleToggleIssue = (issueId: string) => {
    triggerHaptic(15);
    let next: string[];
    if (selectedIssueIds.includes(issueId)) {
      next = selectedIssueIds.filter((id) => id !== issueId);
    } else {
      next = [...selectedIssueIds, issueId];
    }
    setSelectedIssueIds(next);

    // Auto-compose message from selected issues
    const selectedTexts = next
      .map((id) => COMMON_ISSUES.find((item) => item.id === id)?.text)
      .filter(Boolean);

    if (selectedTexts.length > 0) {
      setFeedbackMessage(`Notice: ${selectedTexts.join(". ")}.`);
    } else {
      setFeedbackMessage("");
    }
  };

  // Reputation Firewall submit
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    triggerHaptic([30, 50]);
    setIsSubmittingFeedback(true);
    setFeedbackError("");

    const fullMessage =
      resolutionPreference === "manager_now"
        ? `[PRIORITY: MANAGER TABLE VISIT REQUESTED] ${feedbackMessage}`
        : `[FOLLOW-UP: CONTACT GUEST] ${feedbackMessage}`;

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
          message: fullMessage,
        }),
      });

      if (res.ok) {
        setFeedbackSubmitted(true);
      } else {
        setFeedbackError("We couldn't deliver your message. Please tell a staff member directly.");
      }
    } catch {
      setFeedbackError("We couldn't deliver your message. Please tell a staff member directly.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Direct manager compliment (for non-Google users)
  const handleSendDirectCompliment = async () => {
    triggerHaptic([20, 40]);
    setIsSendingCompliment(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          storeName: store.name,
          rating: 5,
          tableNumber: initialTable || "Direct Review",
          customerName: "Verified Guest",
          message: `[5-STAR GUEST COMPLIMENT] ${reviewText}`,
        }),
      });
      if (res.ok) {
        setComplimentSubmitted(true);
        confetti({ particleCount: 50, spread: 60 });
      }
    } catch {}
    setIsSendingCompliment(false);
  };

  const isFirewallActive = rating <= 3;
  const allChips = [...store.chips, ...customChips];

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
        {/* 3-step visual orientation strip */}
        <div className="grid grid-cols-3 gap-1.5 mb-5 text-center">
          {[
            { step: "1", label: "Tap your stars" },
            { step: "2", label: "Pick highlights" },
            { step: "3", label: "Paste in Google" },
          ].map((item) => (
            <div key={item.step} className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="w-4 h-4 rounded-full bg-zinc-900 text-white text-[9px] font-bold inline-flex items-center justify-center">
                {item.step}
              </span>
              <p className="text-[10px] font-semibold text-zinc-600 mt-1 leading-tight">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Star Rating Selector with tactile feedback */}
        <div className="text-center mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
            How was your visit today?
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingSelect(star)}
                className={`p-2 rounded-xl transition-all transform active:scale-90 ${
                  rating >= star
                    ? "text-amber-400 drop-shadow-sm scale-105"
                    : "text-zinc-200 hover:text-zinc-300"
                }`}
                aria-label={`Rate ${star} stars`}
              >
                <Star className="w-8 h-8 fill-current stroke-1" />
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
                <h3 className="text-base font-bold text-zinc-900">
                  {resolutionPreference === "manager_now"
                    ? "🚨 Priority Alert Sent to General Manager"
                    : "Message Delivered to Management"}
                </h3>
                <p className="text-xs text-zinc-600 mt-1.5 leading-relaxed">
                  {resolutionPreference === "manager_now"
                    ? `Our on-duty manager has received your priority alert for ${feedbackTable || "your table"} and is on their way over to make this right.`
                    : "Thank you for being candid. Our General Manager has received your notes and will follow up with you promptly."}
                </p>
                <div className="mt-5 p-3 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-800 font-medium">
                  We truly appreciate giving us the opportunity to resolve this directly.
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 mt-0.5">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900">We want to make this right immediately</h2>
                    <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                      Tap what went wrong below. This is strictly private and goes straight to our General Manager.
                    </p>
                  </div>
                </div>

                {/* 1-Tap Quick Issue Chips */}
                <div className="mt-3 mb-4">
                  <span className="block text-[11px] font-semibold text-zinc-700 mb-1.5">
                    Tap to report in 1 second:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_ISSUES.map((issue) => {
                      const active = selectedIssueIds.includes(issue.id);
                      return (
                        <button
                          key={issue.id}
                          type="button"
                          onClick={() => handleToggleIssue(issue.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all text-left ${
                            active
                              ? "bg-amber-600 text-white shadow-sm ring-1 ring-amber-700"
                              : "bg-white text-zinc-700 border border-amber-200/90 hover:bg-amber-100/60"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {issue.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleFeedbackSubmit} className="space-y-3">
                  {/* Resolution Preference Toggle */}
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="block text-[11px] font-semibold text-zinc-700 mb-1.5">
                      How would you like us to resolve this?
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(12);
                          setResolutionPreference("manager_now");
                        }}
                        className={`text-[11px] py-1.5 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
                          resolutionPreference === "manager_now"
                            ? "bg-rose-600 text-white font-semibold shadow-sm"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Send GM to Table Now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(12);
                          setResolutionPreference("contact_later");
                        }}
                        className={`text-[11px] py-1.5 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 ${
                          resolutionPreference === "contact_later"
                            ? "bg-zinc-900 text-white font-semibold shadow-sm"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                        }`}
                      >
                        Follow up later
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
                      Details / Notes
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Add any specific details here..."
                      className="w-full text-xs p-2.5 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white placeholder-zinc-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                        Table # {resolutionPreference === "manager_now" && <span className="text-rose-600">*</span>}
                      </label>
                      <input
                        type="text"
                        required={resolutionPreference === "manager_now"}
                        value={feedbackTable}
                        onChange={(e) => setFeedbackTable(e.target.value)}
                        placeholder="Table 4"
                        className="w-full text-xs px-2.5 py-2 rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-medium"
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
                      Phone or Email (for follow-up)
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
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-zinc-900 text-white font-medium text-xs hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {isSubmittingFeedback ? (
                      "Sending to Manager..."
                    ) : resolutionPreference === "manager_now" ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                        Dispatch Alert to GM Table-Side
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        Send Privately to General Manager
                      </>
                    )}
                  </button>

                  {feedbackError && (
                    <p className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                      {feedbackError}
                    </p>
                  )}
                </form>

                {googleReviewUrl && (
                  <div className="mt-3.5 pt-2.5 text-center border-t border-amber-200/60">
                    <a
                      href={googleReviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 underline decoration-zinc-300 font-medium inline-flex items-center gap-1"
                    >
                      Prefer to post your review on Google directly? <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* POSITIVE FLOW: 4-5 Stars -> 1-Tap Google Reviews */
          <div className="space-y-4">
            {/* Feature Chips with Smart Category Badges */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-700">Tap highlights to personalize:</span>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(!showAddCustom)}
                  className="text-[11px] text-zinc-600 hover:text-zinc-900 font-semibold flex items-center gap-1 hover:underline"
                >
                  <Plus className="w-3 h-3 text-zinc-500" />
                  {showAddCustom ? "Cancel" : "Add custom dish"}
                </button>
              </div>

              {/* Inline Custom Dish Input */}
              {showAddCustom && (
                <form onSubmit={handleAddCustomChip} className="mb-2.5 flex items-center gap-1.5 animate-fadeIn">
                  <input
                    type="text"
                    autoFocus
                    value={customInputText}
                    onChange={(e) => setCustomInputText(e.target.value)}
                    placeholder="e.g. Tiramisu, Espresso Martini..."
                    className="text-xs px-3 py-1.5 rounded-full border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 flex-1 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!customInputText.trim()}
                    className="text-xs px-3 py-1.5 bg-zinc-900 text-white rounded-full font-semibold hover:bg-black disabled:opacity-40"
                  >
                    Add
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-1.5">
                {allChips.map((chip) => {
                  const active = selectedChips.includes(chip);
                  const badge = getChipBadge(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                        active
                          ? "bg-zinc-900 text-white shadow-sm scale-102"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80"
                      }`}
                    >
                      <span className="text-[11px]">{badge.icon}</span>
                      <span>{chip}</span>
                      {active && <Check className="w-3 h-3 text-emerald-400 stroke-[3] ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 1-Tap Tone & Length Switcher */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Review Style &amp; Length:
                </span>
                <span className="text-[10px] text-zinc-400">1-Tap Match</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToneSelect("punchy")}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                    tone === "punchy"
                      ? "bg-zinc-900 text-white shadow-sm font-semibold"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  Quick (1-2 lines)
                </button>
                <button
                  type="button"
                  onClick={() => handleToneSelect("foodie")}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                    tone === "foodie"
                      ? "bg-zinc-900 text-white shadow-sm font-semibold"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <Utensils className="w-3 h-3 text-emerald-400" />
                  Foodie Focus
                </button>
                <button
                  type="button"
                  onClick={() => handleToneSelect("hospitality")}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-1 ${
                    tone === "hospitality"
                      ? "bg-zinc-900 text-white shadow-sm font-semibold"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <Heart className="w-3 h-3 text-rose-400" />
                  Warm &amp; Friendly
                </button>
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
                  <RotateCcw className="w-3 h-3" />
                  {isGenerating ? "Refining..." : "Shuffle Tone"}
                </button>
              </div>
              <textarea
                ref={reviewTextareaRef}
                rows={3}
                value={reviewText}
                onChange={(e) => {
                  editedByDiner.current = true;
                  setReviewText(e.target.value);
                }}
                className="w-full text-xs p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 leading-relaxed text-zinc-800 transition-all resize-none font-normal"
              />
            </div>

            {/* 2-Step Paste Guidance Callout when Google is opened */}
            {hasOpenedGoogle && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-left space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    How to paste into Google in 2 seconds:
                  </span>
                  <span className="text-[10px] bg-indigo-200/70 text-indigo-900 font-bold px-2 py-0.5 rounded-full">
                    Copied ✓
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-indigo-900">
                  <div className="p-2 rounded-xl bg-white border border-indigo-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>Tap <strong>5 Stars</strong> on Google</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span>Long-press box &amp; tap <strong>Paste</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* 1-Tap Google Button */}
            <div className="pt-1 sticky bottom-0 -mx-6 px-6 pb-1 bg-white/95 backdrop-blur-sm border-t border-zinc-100 sm:static sm:mx-0 sm:px-0 sm:pb-0 sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none">
              {copyFailed && (
                <div className="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                  Automatic copy was blocked by your browser. The review text is selected above — long-press it, tap{" "}
                  <strong>Copy</strong>, then paste it into Google.
                </div>
              )}

              {googleReviewUrl ? (
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleHandoff}
                  className="w-full py-4 px-5 rounded-2xl bg-zinc-900 hover:bg-black text-white font-semibold text-sm transition-all transform active:scale-98 flex items-center justify-center gap-2.5 shadow-lg shadow-zinc-900/15"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                      <span>{isSimulator ? "Copied to clipboard! ⚡" : "Copied! Now paste it in Google"}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-amber-300" />
                      <span>Copy Review &amp; Open Google</span>
                      <ExternalLink className="w-4 h-4 ml-0.5 opacity-70" />
                    </>
                  )}
                </a>
              ) : (
                <div className="w-full py-4 px-4 rounded-2xl bg-zinc-200 text-zinc-600 text-xs font-semibold text-center">
                  Google Reviews isn&apos;t linked for this location yet — please ask a team member.
                </div>
              )}

              <div className="flex items-start justify-center gap-2 mt-2 text-[11px] text-zinc-500 text-center leading-relaxed">
                {copied ? (
                  <span className="text-emerald-700 font-semibold">
                    Review text is copied to your clipboard — in Google, hold down the text box and tap Paste.
                  </span>
                ) : (
                  <span>
                    Google requires manual paste. Tapping above copies your draft and opens Google Maps in 1 step.
                  </span>
                )}
              </div>

              {/* Multi-Platform & "No Google Account" Alternative */}
              <div className="mt-3 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowAltPlatforms(!showAltPlatforms)}
                  className="w-full text-center text-[11px] text-zinc-500 hover:text-zinc-800 font-medium flex items-center justify-center gap-1"
                >
                  <HelpCircle className="w-3 h-3 text-zinc-400" />
                  Don&apos;t have a Google account? Tap here
                  {showAltPlatforms ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showAltPlatforms && (
                  <div className="mt-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2 animate-fadeIn text-left">
                    <p className="text-[11px] text-zinc-600">
                      No Google login needed! Choose how you would like to share your appreciation:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Direct GM compliment */}
                      <button
                        type="button"
                        onClick={handleSendDirectCompliment}
                        disabled={isSendingCompliment || complimentSubmitted}
                        className="p-2.5 rounded-xl bg-white border border-zinc-200 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100 flex items-center justify-center gap-1.5 transition-all"
                      >
                        {complimentSubmitted ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Sent to GM &amp; Kitchen!</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-rose-500" />
                            <span>Send Note to GM &amp; Chef</span>
                          </>
                        )}
                      </button>

                      {/* Copy for TripAdvisor / Yelp */}
                      <button
                        type="button"
                        onClick={async () => {
                          triggerHaptic(15);
                          await copyToClipboard(reviewText);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 3000);
                        }}
                        className="p-2.5 rounded-xl bg-white border border-zinc-200 text-[11px] font-semibold text-zinc-800 hover:bg-zinc-100 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5 text-amber-500" />
                        <span>Copy for Yelp or TripAdvisor</span>
                      </button>
                    </div>

                    {complimentSubmitted && (
                      <p className="text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-lg text-center font-medium">
                        Your kind words have been sent directly to restaurant management. Thank you!
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sticky Re-Copy / Return-To-Tab Drawer */}
        {showReturnDrawer && !reviewPostedSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-zinc-900 text-white shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-300">
                <Check className="w-4 h-4 stroke-[3]" />
                Did you finish pasting in Google?
              </span>
              <button
                type="button"
                onClick={() => setShowReturnDrawer(false)}
                className="text-[10px] text-zinc-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  triggerHaptic(15);
                  await copyToClipboard(reviewText);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Copy className="w-3 h-3 text-amber-300" />
                Re-Copy Review
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([20, 50]);
                  setReviewPostedSuccess(true);
                  setShowReturnDrawer(false);
                  try {
                    confetti({ particleCount: 70, spread: 60 });
                  } catch {}
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Check className="w-3 h-3 stroke-[3]" />
                I Posted It! 🎉
              </button>
            </div>
          </div>
        )}

        {/* Post-Review Gratitude Screen */}
        {reviewPostedSuccess && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center animate-fadeIn">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <h4 className="text-sm font-bold text-zinc-900">You&apos;re Awesome! Thank You!</h4>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              Your review directly helps {store.name} thrive as a local business. We truly appreciate your support!
            </p>
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
