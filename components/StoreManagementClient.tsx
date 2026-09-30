"use client";

import React, { useState } from "react";
import { Store } from "@/lib/types";
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
} from "lucide-react";
import Link from "next/link";

interface Props {
  initialStores: Store[];
}

export default function StoreManagementClient({ initialStores }: Props) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState<string>("");
  const [slug, setSlug] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const [category, setCategory] = useState<string>("Restaurant");
  const [googlePlaceId, setGooglePlaceId] = useState<string>("");
  const [brandColor, setBrandColor] = useState<string>("#E11D48");
  const [managerEmail, setManagerEmail] = useState<string>("");
  const [managerPhone, setManagerPhone] = useState<string>("");
  const [tableCount, setTableCount] = useState<number>(1);
  const [address, setAddress] = useState<string>("");

  // Dynamic chips tag editor
  const [chips, setChips] = useState<string[]>([]);
  const [newChipInput, setNewChipInput] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const openAddModal = () => {
    setEditingStoreId(null);
    setName("");
    setSlug("");
    setTagline("");
    setCategory("Restaurant");
    setGooglePlaceId("");
    setBrandColor("#E11D48");
    setManagerEmail("");
    setManagerPhone("");
    setTableCount(1);
    setAddress("");
    setChips([]);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStoreId(store.id);
    setName(store.name);
    setSlug(store.slug);
    setTagline(store.tagline || "");
    setCategory(store.category || "Restaurant");
    setGooglePlaceId(store.googlePlaceId);
    setBrandColor(store.brandColor || "#E11D48");
    setManagerEmail(store.managerEmail || "");
    setManagerPhone(store.managerPhone || "");
    setTableCount(store.tableCount || 15);
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

  const addChip = () => {
    if (!newChipInput.trim()) return;
    if (!chips.includes(newChipInput.trim())) {
      setChips([...chips, newChipInput.trim()]);
    }
    setNewChipInput("");
  };

  const removeChip = (chipToRemove: string) => {
    setChips(chips.filter((c) => c !== chipToRemove));
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setErrorMsg("Name and slug are required");
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
          setErrorMsg(data?.error || "Failed to update store");
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
          setErrorMsg(data?.error || "Failed to create store");
        }
      }
    } catch {
      setErrorMsg("Network error saving store");
    } finally {
      setIsSaving(false);
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
            Stores &amp; Table Standees
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure locations, customize 1-tap highlight chips, and generate printable 4x6&quot; table tents.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-all flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Restaurant Location
        </button>
      </div>

      {/* Stores List */}
      <div className="grid grid-cols-1 gap-4">
        {stores.map((store) => (
          <div
            key={store.id}
            className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
          >
            {/* Store Information */}
            <div className="flex items-start gap-4 flex-1">
              <div
                className="w-14 h-14 rounded-2xl text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 mt-0.5"
                style={{ backgroundColor: store.brandColor || "#E11D48" }}
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

                <p className="text-xs text-zinc-600">{store.tagline}</p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                  {store.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {store.address}
                    </span>
                  )}
                  {store.managerEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-zinc-400" />
                      {store.managerEmail}
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
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                    1-Tap Customer Highlight Chips ({store.chips.length}):
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
              <Link
                href={`/admin/stores/${store.id}/print`}
                className="px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-800 text-xs font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Print Standee</span>
              </Link>

              <Link
                href={`/r/${store.slug}`}
                target="_blank"
                className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Live Scan</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </Link>

              <button
                type="button"
                onClick={() => openEditModal(store)}
                className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
                title="Edit Store"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleDelete(store.id, store.name)}
                className="p-2 rounded-xl bg-zinc-100 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                title="Delete Store"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  {editingStoreId ? "Edit Restaurant Location" : "Add New Restaurant Location"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure the QR destination, Google Place ID, and custom chips.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors"
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
                    Store / Restaurant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Bella Napoli Pizzeria"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    URL Slug * (Unique customer URL)
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
                      placeholder="bella-napoli"
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
                    placeholder="e.g. Italian Trattoria, Specialty Cafe"
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
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Authentic Woodfired Sourdough Pizza & Handcrafted Cocktails"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Google Place ID (Target for 1-Tap Google Reviews Hand-off) *
                </label>
                <input
                  type="text"
                  required
                  value={googlePlaceId}
                  onChange={(e) => setGooglePlaceId(e.target.value)}
                  placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83frY4"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 font-mono"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Found via Google Places Place ID Finder. Clicking &ldquo;Post Review&rdquo; opens:
                  <code className="text-zinc-600 block mt-0.5">https://search.google.com/local/writereview?placeid={googlePlaceId}</code>
                </p>
              </div>

              {/* Dynamic Chips Customizer */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                <label className="block text-xs font-bold text-zinc-900 mb-1">
                  1-Tap Feature Chips (Dish names, Server names, Atmosphere highlights)
                </label>
                <p className="text-[11px] text-zinc-500 mb-3">
                  These chips appear as clickable pills on the customer scan screen. Tapping them dynamically seeds the AI review in under 400ms!
                </p>

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
                        className="hover:text-rose-600 text-zinc-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
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
                    placeholder="Add custom chip (e.g. 'Crispy Margherita', 'Alex (Server)', 'Outdoor Garden')"
                    className="flex-1 text-xs p-2.5 rounded-xl border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={addChip}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors"
                  >
                    Add Chip
                  </button>
                </div>
              </div>

              {/* Contact info & tables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Manager Alert Email
                  </label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="gm@restaurant.com"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Manager Alert Phone
                  </label>
                  <input
                    type="text"
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Table / Stand Count
                  </label>
                  <input
                    type="number"
                    value={tableCount}
                    onChange={(e) => setTableCount(Number(e.target.value))}
                    min={1}
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 520 Main Street, Suite 4B"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-700 text-xs font-semibold hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : editingStoreId ? "Save Changes" : "Create Store Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
