"use client";

import React, { useState } from "react";
import { ReviewTemplateSet, Store } from "@/lib/types";
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
  QrCode,
  Sparkles,
  HelpCircle,
  Search,
  RefreshCw,
  Save,
  Check,
} from "lucide-react";
import Link from "next/link";
import { getGoogleReviewUrl, isDirectReviewUrl } from "@/lib/review-links";
import { generateOfflineReview, STARTER_TEMPLATES } from "@/lib/ai";

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
          <h3 className="text-xs font-bold text-zinc-900">{title}</h3>
          <p className="text-[11px] text-zinc-500">{hint}</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
          {lineCount} line{lineCount === 1 ? "" : "s"}
        </span>
      </div>
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 leading-relaxed resize-y font-mono"
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Insert:
        </span>
        {tokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => onInsert(token)}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
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
    return (
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
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

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // ---- Review Studio: per-store sentence combinations ----
  const [studioStoreId, setStudioStoreId] = useState<string | null>(null);
  const [studioIntros, setStudioIntros] = useState<string>("");
  const [studioHighlights, setStudioHighlights] = useState<string>("");
  const [studioClosers, setStudioClosers] = useState<string>("");
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
    setChips([...store.chips]);
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
          setStores(stores.map((s) => (s.id === editingStoreId ? data.store : s)));
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
          setStores([...stores, data.store]);
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
  const previewText = studioStore
    ? generateOfflineReview({
        storeName: studioStore.name,
        category: studioStore.category,
        chips: (studioStore.chips || []).slice(0, 2),
        variationSeed: previewSeed,
        tone: "punchy",
        templates: hasStudioTemplates ? studioTemplates : undefined,
      })
    : "";

  const openStudio = (store: Store) => {
    setStudioStoreId(store.id);
    setStudioIntros((store.reviewTemplates?.intros || []).join("\n"));
    setStudioHighlights((store.reviewTemplates?.highlights || []).join("\n"));
    setStudioClosers((store.reviewTemplates?.closers || []).join("\n"));
    setPreviewSeed(0);
    setStudioError("");
    setStudioSaved(false);
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
        body: JSON.stringify({ reviewTemplates: studioTemplates }),
      });
      if (res.ok) {
        const data = await res.json();
        setStores((prev) => prev.map((s) => (s.id === studioStoreId ? data.store : s)));
        setStudioSaved(true);
      } else {
        const data = await res.json().catch(() => null);
        setStudioError(data?.error || "Failed to save sentence combinations");
      }
    } catch {
      setStudioError("Network error saving sentence combinations");
    } finally {
      setIsSavingStudio(false);
    }
  };

  const handleDelete = async (id: string, storeName: string) => {
    if (!confirm(`Are you sure you want to delete ${storeName}?`)) return;

    try {
      const res = await fetch(`/api/stores/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStores(stores.filter((s) => s.id !== id));
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            {isSuperAdmin ? "Client Restaurants & Table Standees" : "Your Restaurant Locations"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure dishes, craft sentence combinations in the Review Studio, and print permanent QR codes.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-2xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Restaurant Location
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-2xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search restaurants by name, slug, category, or address (e.g. Chai Sutta, Bihta, Cafe 13)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 text-xs pl-10 pr-9 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[11px] text-zinc-500 font-medium px-1">
            Showing {filteredStores.length} of {stores.length} restaurants matching &ldquo;{searchQuery}&rdquo;
          </p>
        )}
      </div>

      {/* Stores List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredStores.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-zinc-200 text-center space-y-3">
            <p className="text-sm font-bold text-zinc-700">No restaurants match your search</p>
            <p className="text-xs text-zinc-500">
              Try searching with another keyword or clear the search.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredStores.map((store) => (
          <div
            key={store.id}
            className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
          >
            {/* Store Information */}
            <div className="flex items-start gap-4 flex-1">
              <div
                className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 mt-0.5"
                style={{ backgroundColor: store.brandColor || "#0d9488" }}
              >
                {store.name.charAt(0)}
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-zinc-900">{store.name}</h3>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                    /r/{store.slug}
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {store.category}
                  </span>
                </div>

                <p className="text-xs text-zinc-600">{store.tagline || store.category}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                  {store.managerEmail && (
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      Alerts: {store.managerEmail}
                    </span>
                  )}
                  {store.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {store.address}
                    </span>
                  )}
                  {store.managerPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      {store.managerPhone}
                    </span>
                  )}
                </div>

                {/* Chips Preview */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    Clickable Highlight Chips ({store.chips.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {store.chips.map((chip) => (
                      <span
                        key={chip}
                        className="text-xs px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-medium"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
              <button
                type="button"
                onClick={() => openStudio(store)}
                className="px-3.5 py-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Edit dishes and sentence combinations"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Review Studio</span>
              </button>

              <Link
                href={`/admin/stores/${store.id}/print`}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Standee QR</span>
              </Link>

              <Link                            href={`/r/${store.slug}`}
                target="_blank"
                className="px-3.5 py-2.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
              >
                <span>Live Scan</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </Link>

              <button
                type="button"
                onClick={() => openEditModal(store)}
                className="p-2.5 rounded-xl bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-colors cursor-pointer"
                title="Edit Restaurant"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(store.id, store.name)}
                  className="p-2.5 rounded-xl bg-zinc-100 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Restaurant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))
      )}
      </div>

      {/* Add / Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  {editingStoreId ? "Edit Restaurant & QR Settings" : "Add New Restaurant / Café"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure popular dishes, Google Place ID, and owner notification email.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveStore} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Restaurant / Café Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Third Wave Coffee, Brik Oven"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    URL Slug * (Printed on Standee)
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs bg-zinc-100 px-3 py-3 border border-r-0 border-zinc-200 rounded-l-xl text-zinc-500 font-mono">
                      /r/
                    </span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))}
                      placeholder="brik-oven"
                      className="w-full text-xs p-3 rounded-r-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Cafe, Restaurant, Pizzeria, Restobar"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Brand Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-zinc-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-zinc-200 font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Tagline / Speciality Subtitle
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Artisan Coffee, Woodfired Pizzas & Fresh Bakes"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              {/* Owner's Alert Gmail - Critical feature */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                  <Mail className="w-4 h-4 text-amber-700" />
                  <span>Owner&apos;s Alert Gmail (for Low 1-3★ Review Intercepts) *</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  When a customer gives 1, 2, or 3 stars, they are blocked from Google Maps. Their complaint is immediately sent to this email address via Resend so the owner can fix it on-site!
                </p>
                <input
                  type="email"
                  required
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                  placeholder="anuragmishra3407@gmail.com or cafeowner@gmail.com"
                  className="w-full text-xs p-3 rounded-xl border border-amber-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-900">
                    Google Place ID or 1-Click Review Shortlink *
                  </label>
                  {isDirectReviewUrl(googlePlaceId) ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      🟢 1-Tap Write-Review Modal Enabled
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      🔵 Google Reviews Search
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600 leading-relaxed">
                  <p className="font-semibold text-zinc-800 mb-0.5">
                    💡 Pro-Tip for 1-Tap Customer Reviews:
                  </p>
                  Paste your Google Business Profile <strong>&quot;Ask for reviews&quot;</strong> link (e.g.{" "}
                  <code className="text-zinc-800 font-mono bg-white px-1 py-0.5 rounded border border-zinc-200">
                    https://g.page/r/.../review
                  </code>
                  ) or your Place ID (e.g.{" "}
                  <code className="text-zinc-800 font-mono bg-white px-1 py-0.5 rounded border border-zinc-200">
                    ChIJ...
                  </code>
                  ). This automatically triggers the 5-star write-review box directly on customer phones so they only need to tap Paste!
                </div>

                <input
                  type="text"
                  required
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  placeholder="e.g. https://g.page/r/.../review or ChIJ..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <p className="text-zinc-500 truncate max-w-md">
                    Target:{" "}
                    <code className="text-zinc-700 font-mono text-[10px]">
                      {getGoogleReviewUrl({ googlePlaceId, name: name || "Store Name", address, tagline, category })}
                    </code>
                  </p>
                  <a
                    href={getGoogleReviewUrl({ googlePlaceId, name: name || "Store Name", address, tagline, category })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 text-[10px]"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Dynamic Chips Customizer with Quick Add */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                <label className="block text-xs font-bold text-zinc-900 mb-1">
                  Clickable Highlight Chips (Popular dishes, staff names, ambience)
                </label>
                <p className="text-[11px] text-zinc-500 mb-3">
                  Diners tap these chips to automatically compose unique, natural reviews without writer&apos;s block.
                </p>

                {/* Current Selected Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {chips.map((chip) => (
                    <span
                      key={chip}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white border border-zinc-300 font-medium text-zinc-800 shadow-sm"
                    >
                      {chip}
                      <button
                        type="button"
                        onClick={() => removeChip(chip)}
                        className="hover:text-rose-600 text-zinc-400 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick Add Suggestions */}
                <div className="mb-3">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Quick suggestions (tap to add):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CHIP_SUGGESTIONS.filter((s) => !chips.includes(s)).slice(0, 8).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => addChip(suggestion)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-zinc-200/80 hover:bg-zinc-300 text-zinc-700 transition-colors cursor-pointer"
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
                    placeholder="Add custom dish or server name (e.g. 'Butter Chicken', 'Santosh (Barista)', 'Filter Coffee')"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => addChip()}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
                  >
                    Add Chip
                  </button>
                </div>
              </div>

              {/* Location Address */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Location / City / Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Koramangala, Bengaluru or Bandra West, Mumbai"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingStoreId ? "Save Changes" : "Create Restaurant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Studio Modal */}
      {studioStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-zinc-200 max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white flex items-start justify-between gap-4 px-6 sm:px-8 pt-6 pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Review Studio
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {studioStore.name} &bull; one sentence per line. Diners get a fresh mix every visit — the printed QR never changes.
                </p>
              </div>
              <button
                onClick={() => setStudioStoreId(null)}
                className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Live preview */}
              <div className="p-4 rounded-2xl bg-zinc-900 text-white space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Live diner preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewSeed((s) => s + 1)}
                    className="text-[11px] font-semibold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Different wording
                  </button>
                </div>
                <p className="text-sm leading-relaxed italic text-zinc-100">&ldquo;{previewText}&rdquo;</p>
                <p className="text-[10px] text-zinc-400">
                  {hasStudioTemplates
                    ? "Preview uses your sentence combinations plus this store's highlight chips."
                    : "Built-in sentence library in use until you add your own lines."}
                </p>
              </div>

              {/* Starter helper */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <p className="text-[11px] text-amber-900 leading-relaxed max-w-lg">
                  <strong>New here?</strong> Load starter sentences as a base, then rewrite them in your restaurant&apos;s voice.
                </p>
                <button
                  type="button"
                  onClick={applyStarterTemplates}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
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

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600 leading-relaxed">
                <strong className="text-zinc-800">How it works:</strong> diners only ever see these sentences after tapping your dish chips. The printed standee keeps the same QR — changing dishes or sentences here never requires a reprint.
              </div>

              {studioError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                  {studioError}
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-end gap-3">
                {studioSaved && (
                  <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1 mr-auto">
                    <Check className="w-4 h-4 stroke-[3]" /> Saved — diners see the new mix immediately
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setStudioStoreId(null)}
                  className="px-4 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveStudio}
                  disabled={isSavingStudio}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  {isSavingStudio ? "Saving..." : "Save sentence combinations"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
