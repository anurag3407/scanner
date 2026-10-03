"use client";

import React, { useState } from "react";
import { ReviewTemplateSet, ReviewTone, Store } from "@/lib/types";
import {
  Plus,
  Edit2,
  Trash2,
  Printer,
  ExternalLink,
  X,
  MapPin,
  Mail,
  Phone,
  Sparkles,
  Search,
  RefreshCw,
  Save,
  Check,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { getGoogleReviewUrl, isDirectReviewUrl } from "@/lib/review-links";
import {
  estimateReviewCombinations,
  generateUniqueReview,
  STARTER_KEYWORD_SUGGESTIONS,
  STARTER_TEMPLATES,
} from "@/lib/ai";

interface Props {
  initialStores: Store[];
  isSuperAdmin: boolean;
}

/** One editable list of sentence combinations (intros / highlights / closers). */
function SentenceSection({
  title,
  hint,
  value,
  placeholder,
  tokens,
  onChange,
  onInsert,
}: {
  title: string;
  hint: string;
  value: string;
  placeholder: string;
  tokens: string[];
  onChange: (value: string) => void;
  onInsert: (token: string) => void;
}) {
  const lineCount = value.split("\n").filter((line) => line.trim()).length;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-black">{title}</h3>
          <p className="text-[11px] font-bold text-black/60">{hint}</p>
        </div>
        <span className="border-2 border-black bg-cream px-2 py-0.5 font-mono text-[10px] font-black text-black shadow-neo-xs">
          {lineCount} line{lineCount === 1 ? "" : "s"}
        </span>
      </div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y border-[3px] border-black bg-cream p-3 font-mono text-xs font-bold leading-relaxed text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-black/50">Insert:</span>
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => onInsert(token)}
            className="cursor-pointer border-2 border-black bg-white px-2 py-1 font-mono text-[11px] font-bold text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-violet active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {token}
          </button>
        ))}
      </div>
    </div>
  );
}

const QUICK_CHIP_SUGGESTIONS = [
  "Flat White",
  "Butter Chicken",
  "Cold Brew",
  "Sourdough Toast",
  "Truffle Pizza",
  "Crispy Garlic Bread",
  "OG Tiramisu",
  "Great Ambience",
  "Attentive Staff",
  "Rahul (Barista)",
  "Santosh (Server)",
  "Fast Billing",
  "Cozy Seating",
  "Family Friendly",
];

export default function StoreManagementClient({ initialStores, isSuperAdmin }: Props) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  const filteredStores = stores.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    // Defensive: these fields are coerced by the row mapper today, but this is
    // a client component fed by a plain prop contract — an undefined field
    // would otherwise throw and blank the entire list.
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.slug || "").toLowerCase().includes(q) ||
      (s.category || "").toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q))
    );
  });

  // Form state
  const [name, setName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const [category, setCategory] = useState<string>("Cafe / Restaurant");
  const [googlePlaceId, setGooglePlaceId] = useState<string>("");
  const [brandColor, setBrandColor] = useState<string>("#0d9488");
  const [managerEmail, setManagerEmail] = useState<string>("");
  const [managerPhone, setManagerPhone] = useState<string>("");
  const [tableCount, setTableCount] = useState<number>(1);
  const [address, setAddress] = useState<string>("");

  // Dynamic chips tag editor
  const [chips, setChips] = useState<string[]>([]);
  const [newChipInput, setNewChipInput] = useState<string>("");

  // Menu price currency for the scan page (ISO 4217)
  const [currency, setCurrency] = useState<string>("INR");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // ---- Review Studio: per-store sentence combinations ----
  const [studioStoreId, setStudioStoreId] = useState<string | null>(null);
  const [studioIntros, setStudioIntros] = useState<string>("");
  const [studioHighlights, setStudioHighlights] = useState<string>("");
  const [studioClosers, setStudioClosers] = useState<string>("");
  const [studioTone, setStudioTone] = useState<ReviewTone>("punchy");
  const [studioKeywords, setStudioKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState<string>("");
  const [previewSeed, setPreviewSeed] = useState<number>(0);
  const [isSavingStudio, setIsSavingStudio] = useState<boolean>(false);
  const [studioError, setStudioError] = useState<string>("");
  const [studioSaved, setStudioSaved] = useState<boolean>(false);

  const openAddModal = () => {
    setEditingStoreId(null);
    setName("");
    setSlug("");
    setTagline("");
    setCategory("Cafe / Restaurant");
    setGooglePlaceId("");
    setBrandColor("#0d9488");
    // Owner inboxes only — alerts never fall back to the platform account.
    setManagerEmail("");
    setManagerPhone("");
    setTableCount(1);
    setAddress("");
    setChips(["Specialty Coffee", "Fresh Sourdough", "Friendly Staff", "Great Ambience"]);
    setCurrency("INR");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStoreId(store.id);
    setName(store.name);
    setSlug(store.slug);
    setTagline(store.tagline || "");
    setCategory(store.category || "Cafe / Restaurant");
    setGooglePlaceId(store.googlePlaceId);
    setBrandColor(store.brandColor || "#0d9488");
    setManagerEmail(store.managerEmail || "");
    setManagerPhone(store.managerPhone || "");
    setTableCount(store.tableCount || 10);
    setAddress(store.address || "");
    setChips([...(store.chips || [])]);
    setCurrency(store.currency || "INR");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingStoreId) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  };

  const addChip = (chipToAdd?: string) => {
    const chipText = (chipToAdd || newChipInput).trim();
    if (!chipText) return;
    if (!chips.includes(chipText)) {
      setChips([...chips, chipText]);
    }
    if (!chipToAdd) {
      setNewChipInput("");
    }
  };

  const removeChip = (chipToRemove: string) => {
    setChips(chips.filter((c) => c !== chipToRemove));
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setErrorMsg("Store name and URL slug are required");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        name,
        slug,
        tagline,
        category,
        googlePlaceId,
        brandColor,
        managerEmail,
        managerPhone,
        tableCount,
        address,
        chips,
        currency,
      };

      if (editingStoreId) {
        // Update
        const res = await fetch(`/api/stores/${editingStoreId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          // Functional updater: the awaited fetch can resolve after another
          // mutation has already replaced `stores`, and closing over the stale
          // array would silently discard the other change.
          setStores((prev) => prev.map((s) => (s.id === editingStoreId ? data.store : s)));
          setIsModalOpen(false);
        } else {
          const data = await res.json().catch(() => null);
          setErrorMsg(data?.error || "Failed to update restaurant");
        }
      } else {
        // Create
        const res = await fetch("/api/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          setStores((prev) => [...prev, data.store]);
          setIsModalOpen(false);
        } else {
          const data = await res.json().catch(() => null);
          setErrorMsg(data?.error || "Failed to create restaurant");
        }
      }
    } catch {
      setErrorMsg("Network error saving restaurant");
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Review Studio                                                          */
  /* ---------------------------------------------------------------------- */

  const studioStore = stores.find((s) => s.id === studioStoreId) || null;

  const linesToArray = (value: string): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of value.split("\n")) {
      const line = raw.replace(/\s+/g, " ").trim().slice(0, 280);
      if (!line || seen.has(line)) continue;
      seen.add(line);
      result.push(line);
      if (result.length >= 60) break;
    }
    return result;
  };

  const studioTemplates: ReviewTemplateSet = {
    intros: linesToArray(studioIntros),
    highlights: linesToArray(studioHighlights),
    closers: linesToArray(studioClosers),
  };
  const hasStudioTemplates =
    studioTemplates.intros.length + studioTemplates.highlights.length + studioTemplates.closers.length > 0;

  // Pure client-side render — exactly what a diner would see on their phone.
  // The same engine runs there, so this preview includes tone + keywords.
  const previewText = studioStore
    ? generateUniqueReview(
        {
          storeName: studioStore.name,
          category: studioStore.category,
          chips: (studioStore.chips || []).slice(0, 2),
          variationSeed: previewSeed,
          tone: studioTone,
          templates: hasStudioTemplates ? studioTemplates : undefined,
          keywords: studioKeywords,
        },
        []
      )
    : "";

  // The anti-block headroom: how many distinct drafts this configuration can
  // mint before it must repeat itself. Bigger pool = fewer Google dupe flags.
  const uniqueCombinations = studioStore
    ? estimateReviewCombinations({
        chips: studioStore.chips || [],
        keywords: studioKeywords,
        tone: studioTone,
        templates: hasStudioTemplates ? studioTemplates : undefined,
      })
    : 0;

  const openStudio = (store: Store) => {
    setStudioStoreId(store.id);
    setStudioIntros((store.reviewTemplates?.intros || []).join("\n"));
    setStudioHighlights((store.reviewTemplates?.highlights || []).join("\n"));
    setStudioClosers((store.reviewTemplates?.closers || []).join("\n"));
    setStudioTone(store.reviewTone || "punchy");
    setStudioKeywords([...(store.signatureKeywords || [])]);
    setPreviewSeed(0);
    setStudioError("");
    setStudioSaved(false);
  };

  const addStudioKeyword = (keywordToAdd?: string) => {
    const keyword = (keywordToAdd || newKeywordInput).trim().slice(0, 60);
    if (!keyword) return;
    if (!studioKeywords.some((k) => k.toLowerCase() === keyword.toLowerCase())) {
      setStudioKeywords((prev) => [...prev, keyword]);
    }
    if (!keywordToAdd) setNewKeywordInput("");
  };

  const removeStudioKeyword = (keyword: string) => {
    setStudioKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const appendToSection = (section: "intros" | "highlights" | "closers", token: string) => {
    const current = { intros: studioIntros, highlights: studioHighlights, closers: studioClosers }[section].trimEnd();
    const next = current ? `${current}\n${token}` : token;
    if (section === "intros") setStudioIntros(next);
    if (section === "highlights") setStudioHighlights(next);
    if (section === "closers") setStudioClosers(next);
  };

  const applyStarterTemplates = () => {
    setStudioIntros(STARTER_TEMPLATES.intros.join("\n"));
    setStudioHighlights(STARTER_TEMPLATES.highlights.join("\n"));
    setStudioClosers(STARTER_TEMPLATES.closers.join("\n"));
    setStudioSaved(false);
  };

  const handleSaveStudio = async () => {
    if (!studioStoreId) return;
    setIsSavingStudio(true);
    setStudioError("");
    setStudioSaved(false);
    try {
      const res = await fetch(`/api/stores/${studioStoreId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewTemplates: studioTemplates,
          reviewTone: studioTone,
          signatureKeywords: studioKeywords,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setStores((prev) => prev.map((s) => (s.id === studioStoreId ? data.store : s)));
        setStudioSaved(true);
      } else {
        const data = await res.json().catch(() => null);
        setStudioError(data?.error || "Failed to save review settings");
      }
    } catch {
      setStudioError("Network error saving review settings");
    } finally {
      setIsSavingStudio(false);
    }
  };

  const handleDelete = async (id: string, storeName: string) => {
    if (!confirm(`Are you sure you want to delete ${storeName}?`)) return;

    try {
      const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
      if (res.ok) {
        // Functional updater so a delete that lands while a save is in flight
        // cannot resurrect the removed row from a captured `stores` array.
        setStores((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Failed to delete store");
      }
    } catch {
      alert("Error deleting store");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="inline-block -rotate-1 border-4 border-black bg-neo-yellow px-4 py-1.5 text-2xl font-black uppercase tracking-tight text-black shadow-neo-sm sm:text-3xl">
            {isSuperAdmin ? "Client Restaurants" : "Your Restaurants"}
          </h1>
          <p className="mt-2.5 text-xs font-bold text-black/70">
            Configure dishes, live menus, keywords and sentence combinations — then print permanent
            QR codes.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openAddModal}
            className="shrink-0 cursor-pointer border-4 border-black bg-neo-red px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Plus className="mr-1 inline h-4 w-4" strokeWidth={3} /> Add restaurant
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2 border-4 border-black bg-white p-3.5 shadow-neo-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder="Search by name, slug, category, or address (e.g. Chai Sutta, Bihta, Cafe 13)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-[3px] border-black bg-cream py-2.5 pl-10 pr-9 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 cursor-pointer border border-black bg-white px-1 text-xs font-black text-black hover:bg-neo-red"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="px-1 text-[11px] font-bold text-black/70">
            Showing {filteredStores.length} of {stores.length} restaurants matching &ldquo;{searchQuery}&rdquo;
          </p>
        )}
      </div>

      {/* Stores List */}
      <div className="grid grid-cols-1 gap-6">
        {filteredStores.length === 0 ? (
          <div className="border-4 border-dashed border-black bg-white p-10 text-center shadow-neo-sm">
            <p className="text-sm font-black uppercase tracking-wide text-black">
              No restaurants match your search
            </p>
            <p className="mt-1 text-xs font-bold text-black/70">
              Try searching with another keyword or clear the search.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 border-[3px] border-black bg-black px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredStores.map((store) => (
            <div
              key={store.id}
              className="flex flex-col items-start justify-between gap-6 border-4 border-black bg-white p-6 shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-neo-md lg:flex-row lg:items-center"
            >
              {/* Store Information */}
              <div className="flex flex-1 items-start gap-4">
                <div
                  className="mt-0.5 flex h-14 w-14 shrink-0 -rotate-3 items-center justify-center border-[3px] border-black text-2xl font-black text-white [text-shadow:2px_2px_0_#000]"
                  style={{ backgroundColor: store.brandColor || "#0d9488" }}
                >
                  {store.name.charAt(0)}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-black">{store.name}</h3>
                    <span className="border-2 border-black bg-cream px-2.5 py-0.5 font-mono text-[11px] font-black text-black shadow-neo-xs">
                      /r/{store.slug}
                    </span>
                    <span className="border-2 border-black bg-neo-green px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                      {store.category}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-black/70">{store.tagline || store.category}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-black/70">
                    {store.managerEmail && (
                      <span className="flex items-center gap-1 font-black text-black">
                        <Mail className="h-3.5 w-3.5" strokeWidth={3} />
                        Alerts: {store.managerEmail}
                      </span>
                    )}
                    {store.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-black" strokeWidth={3} />
                        {store.address}
                      </span>
                    )}
                    {store.managerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-black" strokeWidth={3} />
                        {store.managerPhone}
                      </span>
                    )}
                  </div>

                  {/* Chips Preview */}
                  <div className="pt-1">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-black/50">
                      Clickable highlight chips ({(store.chips || []).length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(store.chips || []).map((chip, i) => (
                        <span
                          key={chip}
                          className={`border-2 border-black bg-white px-2 py-0.5 text-xs font-black text-black shadow-neo-xs ${
                            i % 2 === 0 ? "-rotate-1" : "rotate-1"
                          }`}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full flex-wrap items-center justify-end gap-2.5 border-t-[3px] border-black pt-3 lg:w-auto lg:border-t-0 lg:pt-0">
                <Link
                  href={`/admin/stores/${store.id}/menu`}
                  className="border-[3px] border-black bg-neo-green px-3.5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  title="Update the live digital menu"
                >
                  <UtensilsCrossed className="mr-1 inline h-3.5 w-3.5" strokeWidth={3} />
                  Live menu
                </Link>

                <button
                  type="button"
                  onClick={() => openStudio(store)}
                  className="cursor-pointer border-[3px] border-black bg-neo-yellow px-3.5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  title="Edit keywords, tone and sentence combinations"
                >
                  <Sparkles className="mr-1 inline h-3.5 w-3.5" strokeWidth={3} />
                  Review studio
                </button>

                <Link
                  href={`/admin/stores/${store.id}/print`}
                  className="border-[3px] border-black bg-black px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <Printer className="mr-1 inline h-4 w-4" strokeWidth={3} />
                  Print QR
                </Link>

                <Link
                  href={`/r/${store.slug}`}
                  target="_blank"
                  className="border-[3px] border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-violet active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Live scan
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-80" strokeWidth={3} />
                </Link>

                <button
                  type="button"
                  onClick={() => openEditModal(store)}
                  className="cursor-pointer border-2 border-black bg-white p-2.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-blue hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  title="Edit restaurant"
                >
                  <Edit2 className="h-4 w-4" strokeWidth={3} />
                </button>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(store.id, store.name)}
                    className="cursor-pointer border-2 border-black bg-white p-2.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    title="Delete restaurant"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-4 border-black bg-white shadow-neo-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-black bg-neo-yellow px-6 py-4 sm:px-8">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wide text-black sm:text-xl">
                  {editingStoreId ? "Edit restaurant & QR" : "Add new restaurant / café"}
                </h2>
                <p className="text-[11px] font-bold text-black/70">
                  Configure popular dishes, Google Place ID, and owner notification email.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer border-2 border-black bg-white p-1.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 border-[3px] border-black bg-neo-red px-3 py-2 text-xs font-black uppercase tracking-wide text-black sm:mx-8">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveStore} className="mt-6 space-y-4 px-6 pb-6 sm:px-8 sm:pb-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Restaurant / café name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Third Wave Coffee, Brik Oven"
                    className="w-full border-[3px] border-black bg-cream px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    URL slug * (printed on standee)
                  </label>
                  <div className="flex items-center">
                    <span className="-mr-[3px] border-[3px] border-black bg-neo-violet px-3 py-3 font-mono text-xs font-black text-black">
                      /r/
                    </span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))}
                      placeholder="brik-oven"
                      className="w-full border-[3px] border-black bg-cream px-3 py-3 font-mono text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Cafe, Restaurant, Pizzeria, Restobar"
                    className="w-full border-[3px] border-black bg-cream px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Brand accent color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer border-[3px] border-black bg-white p-0.5"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-full border-[3px] border-black bg-cream px-3 py-3 font-mono text-xs font-black uppercase text-black shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                  Tagline / speciality subtitle
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Artisan Coffee, Woodfired Pizzas & Fresh Bakes"
                  className="w-full border-[3px] border-black bg-cream px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                />
              </div>

              {/* Owner's Alert Gmail - Critical feature */}
              <div className="space-y-1.5 border-[3px] border-black bg-neo-violet p-4 shadow-neo-xs">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black">
                  <Mail className="h-4 w-4" strokeWidth={3} />
                  <span>Owner&apos;s alert Gmail (for low 1-3★ review intercepts) *</span>
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-black/70">
                  When a customer gives 1, 2, or 3 stars, they are blocked from Google Maps. Their
                  complaint is immediately sent to this email address via Resend so the owner can
                  fix it on-site!
                </p>
                <input
                  type="email"
                  required
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="cafeowner@gmail.com"
                  className="w-full border-[3px] border-black bg-white px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-widest text-black">
                    Google Place ID or 1-click review shortlink *
                  </label>
                  {isDirectReviewUrl(googlePlaceId) ? (
                    <span className="border-2 border-black bg-neo-green px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                      🟢 1-tap modal
                    </span>
                  ) : (
                    <span className="border-2 border-black bg-neo-blue px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-neo-xs">
                      🔵 Google search
                    </span>
                  )}
                </div>

                <div className="border-[3px] border-black bg-cream p-3 text-[11px] font-bold leading-relaxed text-black/70">
                  <p className="mb-0.5 font-black uppercase tracking-wide text-black">
                    💡 Pro-tip for 1-tap customer reviews:
                  </p>
                  Paste your Google Business Profile <strong>&quot;Ask for reviews&quot;</strong> link (e.g.{" "}
                  <code className="border border-black bg-white px-1 font-mono text-black">
                    https://g.page/r/.../review
                  </code>
                  ) or your Place ID (e.g.{" "}
                  <code className="border border-black bg-white px-1 font-mono text-black">ChIJ...</code>
                  ). This automatically triggers the 5-star write-review box directly on customer
                  phones so they only need to tap Paste!
                </div>

                <input
                  type="text"
                  required
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  placeholder="e.g. https://g.page/r/.../review or ChIJ..."
                  className="w-full border-[3px] border-black bg-cream px-3 py-3 font-mono text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <p className="max-w-md truncate font-bold text-black/60">
                    Target:{" "}
                    <code className="border border-black bg-white px-1 font-mono text-[10px] font-bold text-black">
                      {getGoogleReviewUrl({ googlePlaceId, name: name || "Store Name", address, tagline, category })}
                    </code>
                  </p>
                  <a
                    href={getGoogleReviewUrl({ googlePlaceId, name: name || "Store Name", address, tagline, category })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-green active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    Test link <ExternalLink className="ml-1 inline h-3 w-3" strokeWidth={3} />
                  </a>
                </div>
              </div>

              {/* Dynamic Chips Customizer with Quick Add */}
              <div className="border-[3px] border-black bg-cream p-4 shadow-neo-xs">
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-black">
                  Clickable highlight chips (popular dishes, staff names, ambience)
                </label>
                <p className="mb-3 text-[11px] font-bold text-black/60">
                  Diners tap these chips to automatically compose unique, natural reviews without
                  writer&apos;s block.
                </p>

                {/* Current Selected Chips */}
                <div className="mb-3 flex flex-wrap gap-2">
                  {chips.map((chip, i) => (
                    <span
                      key={chip}
                      className={`inline-flex items-center gap-1.5 border-[3px] border-black bg-white px-3 py-1.5 text-xs font-black text-black shadow-neo-xs ${
                        i % 2 === 0 ? "-rotate-1" : "rotate-1"
                      }`}
                    >
                      {chip}
                      <button
                        type="button"
                        onClick={() => removeChip(chip)}
                        className="cursor-pointer text-black transition-colors hover:text-neo-red"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick Add Suggestions */}
                <div className="mb-3">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-black/50">
                    Quick suggestions (tap to add):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CHIP_SUGGESTIONS.filter((s) => !chips.includes(s))
                      .slice(0, 8)
                      .map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => addChip(suggestion)}
                          className="cursor-pointer border-2 border-black bg-white px-2 py-1 text-[11px] font-black text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        >
                          + {suggestion}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChipInput}
                    onChange={(e) => setNewChipInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChip();
                      }
                    }}
                    placeholder="Add custom dish or server name (e.g. 'Butter Chicken', 'Santosh (Barista)')"
                    className="flex-1 border-[3px] border-black bg-white px-2.5 py-2.5 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addChip()}
                    className="cursor-pointer border-[3px] border-black bg-black px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  >
                    Add chip
                  </button>
                </div>
              </div>

              {/* Location Address + Currency */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Location / city / address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Koramangala, Bengaluru or Bandra West, Mumbai"
                    className="w-full border-[3px] border-black bg-cream px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Menu currency
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="INR"
                    maxLength={3}
                    className="w-full border-[3px] border-black bg-cream px-3 py-3 font-mono text-xs font-black uppercase text-black shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] font-bold text-black/50">ISO code shown with menu prices.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t-[3px] border-black pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer border-2 border-transparent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black transition-all duration-100 ease-linear hover:border-black hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="cursor-pointer border-4 border-black bg-neo-red px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow disabled:cursor-wait disabled:opacity-50 enabled:active:translate-x-1 enabled:active:translate-y-1 enabled:active:shadow-none"
                >
                  {isSaving ? "Saving..." : editingStoreId ? "Save changes" : "Create restaurant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Studio Modal */}
      {studioStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto border-4 border-black bg-white shadow-neo-xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b-4 border-black bg-neo-yellow px-6 pt-6 pb-4 sm:px-8">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black uppercase tracking-wide text-black">
                  <span className="inline-flex -rotate-3 border-[3px] border-black bg-white p-1.5 shadow-neo-xs">
                    <Sparkles className="h-4 w-4 text-black" strokeWidth={3} />
                  </span>
                  Review Studio
                </h2>
                <p className="mt-0.5 text-xs font-bold text-black/70">
                  {studioStore.name} &bull; one sentence per line. Diners get a fresh mix every visit
                  — the printed QR never changes.
                </p>
              </div>
              <button
                onClick={() => setStudioStoreId(null)}
                className="shrink-0 cursor-pointer border-2 border-black bg-white p-1.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              {/* Live preview */}
              <div className="space-y-2.5 border-4 border-black bg-black p-4 shadow-neo">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex -rotate-1 items-center gap-1.5 border-2 border-neo-yellow bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                    <Sparkles className="h-3 w-3" strokeWidth={3} /> Live diner preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewSeed((s) => s + 1)}
                    className="cursor-pointer border-2 border-white bg-black px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white transition-all duration-100 ease-linear hover:bg-white hover:text-black active:translate-x-0.5 active:translate-y-0.5"
                  >
                    <RefreshCw className="mr-1 inline h-3 w-3" strokeWidth={3} /> Different wording
                  </button>
                </div>
                <p className="border-[3px] border-white bg-black p-3 text-sm font-bold italic leading-relaxed text-white">
                  &ldquo;{previewText}&rdquo;
                </p>
                <p className="text-[10px] font-bold leading-relaxed text-white/60">
                  ≈ {uniqueCombinations.toLocaleString()} unique drafts before a repeat — every draft
                  a diner posts is different, which keeps Google&apos;s spam filter from blocking
                  reviews.{" "}
                  {hasStudioTemplates
                    ? "Using your sentence combinations plus this store's highlight chips and keywords."
                    : "Built-in sentence library in use until you add your own lines."}
                </p>
              </div>

              {/* Draft voice (tone) */}
              <div className="space-y-2">
                <div>
                  <h3 className="inline-block -rotate-1 border-2 border-black bg-neo-violet px-2.5 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
                    Draft voice
                  </h3>
                  <p className="mt-1.5 text-[11px] font-bold text-black/60">
                    The sentence style every generated review uses for this location.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: "punchy", label: "Punchy", hint: "Short & energetic" },
                      { id: "foodie", label: "Foodie", hint: "Flavour-forward" },
                      { id: "hospitality", label: "Hospitality", hint: "Warm & service-led" },
                    ] as { id: ReviewTone; label: string; hint: string }[]
                  ).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setStudioTone(option.id)}
                      className={`cursor-pointer border-[3px] border-black p-3 text-left transition-all duration-100 ease-linear shadow-neo-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow ${
                        studioTone === option.id
                          ? "-rotate-1 bg-black text-white"
                          : "bg-white text-black hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      }`}
                    >
                      <span className="block text-xs font-black uppercase tracking-wide">{option.label}</span>
                      <span
                        className={`mt-0.5 block text-[10px] font-bold ${
                          studioTone === option.id ? "text-white/70" : "text-black/60"
                        }`}
                      >
                        {option.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Signature keywords */}
              <div className="space-y-3 border-[3px] border-black bg-cream p-4 shadow-neo-xs">
                <div>
                  <h3 className="inline-block rotate-1 border-2 border-black bg-neo-green px-2.5 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
                    Signature keywords &amp; word combinations
                  </h3>
                  <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-black/60">
                    Phrases the engine blends into drafts (dishes, specialities, what makes you
                    different). A larger word pool = more unique reviews = fewer blocked by Google.
                  </p>
                </div>
                {studioKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {studioKeywords.map((keyword, i) => (
                      <span
                        key={keyword}
                        className={`inline-flex items-center gap-1.5 border-[3px] border-black bg-white px-3 py-1.5 text-xs font-black text-black shadow-neo-xs ${
                          i % 2 === 0 ? "-rotate-1" : "rotate-1"
                        }`}
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeStudioKeyword(keyword)}
                          className="cursor-pointer text-black transition-colors hover:text-neo-red"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div>
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-black/50">
                    Quick suggestions (tap to add):
                  </span>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {STARTER_KEYWORD_SUGGESTIONS.filter((s) => !studioKeywords.includes(s))
                      .slice(0, 6)
                      .map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => addStudioKeyword(suggestion)}
                          className="cursor-pointer border-2 border-black bg-white px-2 py-1 text-[11px] font-black text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        >
                          + {suggestion}
                        </button>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addStudioKeyword();
                        }
                      }}
                      placeholder="e.g. wood-fired oven, secret family masala"
                      className="flex-1 border-[3px] border-black bg-white px-2.5 py-2.5 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addStudioKeyword()}
                      className="cursor-pointer border-[3px] border-black bg-black px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Starter helper */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-[3px] border-black bg-neo-yellow p-3.5 shadow-neo-xs">
                <p className="max-w-lg text-[11px] font-bold leading-relaxed text-black">
                  <strong className="font-black uppercase">New here?</strong> Load starter sentences
                  as a base, then rewrite them in your restaurant&apos;s voice.
                </p>
                <button
                  type="button"
                  onClick={applyStarterTemplates}
                  className="shrink-0 cursor-pointer border-[3px] border-black bg-black px-3.5 py-2 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-white hover:text-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  Load starter sentences
                </button>
              </div>

              <SentenceSection
                title="Opening lines (intros)"
                hint="First sentence of every draft. Use {name} for the restaurant name."
                value={studioIntros}
                placeholder={"Had such a wonderful experience at {name} today!\nEvery visit to {name} feels like a treat."}
                tokens={["{name}", "{store}", "{category}"]}
                onChange={setStudioIntros}
                onInsert={(token) => appendToSection("intros", token)}
              />

              <SentenceSection
                title="Dish highlights"
                hint="One line per dish or standout. {chip} is replaced with the highlights the diner tapped."
                value={studioHighlights}
                placeholder={"The {chip} was prepared to perfection.\nYou cannot leave without trying the {chip}."}
                tokens={["{chip}", "{name}", "{store}"]}
                onChange={setStudioHighlights}
                onInsert={(token) => appendToSection("highlights", token)}
              />

              <SentenceSection
                title="Closing lines (closers)"
                hint="Last sentence of the draft. Keep it warm and inviting."
                value={studioClosers}
                placeholder="Will definitely be returning soon and bringing friends along. Highly recommended!"
                tokens={["{name}", "{store}"]}
                onChange={setStudioClosers}
                onInsert={(token) => appendToSection("closers", token)}
              />

              <div className="border-[3px] border-black bg-neo-violet p-3.5 text-[11px] font-bold leading-relaxed text-black">
                <strong className="font-black uppercase">How it works:</strong> diners only ever see
                these sentences after tapping your dish chips. The printed standee keeps the same QR
                — changing dishes, menus or sentences here never requires a reprint.
              </div>

              {studioError && (
                <div className="border-[3px] border-black bg-neo-red px-3 py-2 text-xs font-black uppercase tracking-wide text-black">
                  {studioError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t-[3px] border-black pt-4">
                {studioSaved && (
                  <span className="mr-auto inline-flex items-center gap-1 border-2 border-black bg-neo-green px-2.5 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
                    <Check className="h-4 w-4" strokeWidth={4} /> Saved — diners see it immediately
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setStudioStoreId(null)}
                  className="cursor-pointer border-2 border-transparent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black transition-all duration-100 ease-linear hover:border-black hover:bg-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveStudio}
                  disabled={isSavingStudio}
                  className="flex cursor-pointer items-center gap-1.5 border-4 border-black bg-neo-red px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow disabled:cursor-wait disabled:opacity-50 enabled:active:translate-x-1 enabled:active:translate-y-1 enabled:active:shadow-none"
                >
                  <Save className="h-3.5 w-3.5" strokeWidth={3} />
                  {isSavingStudio ? "Saving..." : "Save review settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
