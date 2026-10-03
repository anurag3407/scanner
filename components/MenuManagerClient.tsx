"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Edit2,
  ExternalLink,
  Leaf,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  X,
  Power,
} from "lucide-react";
import { MenuItem, Store } from "@/lib/types";
import MenuItemImage from "./MenuItemImage";

interface Props {
  store: Store;
  initialItems: MenuItem[];
}

/** Quick section labels offered while typing a category. */
const CATEGORY_SUGGESTIONS = ["Starters", "Mains", "Breads & Rice", "Beverages", "Desserts", "Others"];

interface DraftItem {
  name: string;
  description: string;
  price: string;
  category: string;
  isVeg: boolean;
  imageUrl: string;
}

const EMPTY_DRAFT: DraftItem = {
  name: "",
  description: "",
  price: "",
  category: "Mains",
  isVeg: false,
  imageUrl: "",
};

function formatPrice(price: number, currency?: string): string {
  if (!price || price <= 0) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    }).format(price);
  } catch {
    return price.toFixed(2);
  }
}

/**
 * Owner console for the live digital menu. Every change is persisted through
 * the scoped menu API and reaches diner phones within one 12s poll cycle —
 * the printed QR never changes.
 */
export default function MenuManagerClient({ store, initialItems }: Props) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftItem>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState("");

  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [listError, setListError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    if (!q) return ordered;
    return ordered.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q) ||
        (i.category || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const sections = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of filteredItems) {
      const key = item.category || "Others";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filteredItems]);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  const openAdd = () => {
    setEditingItemId(null);
    setDraft(EMPTY_DRAFT);
    setEditorError("");
    setIsEditorOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItemId(item.id);
    setDraft({
      name: item.name,
      description: item.description || "",
      price: item.price > 0 ? String(item.price) : "",
      category: item.category || "Others",
      isVeg: item.isVeg,
      imageUrl: item.imageUrl || "",
    });
    setEditorError("");
    setIsEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setEditorError("Item name is required");
      return;
    }

    setIsSaving(true);
    setEditorError("");
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        price: draft.price === "" ? 0 : draft.price,
        category: draft.category,
        isVeg: draft.isVeg,
        // Empty string clears the image; a link sets it.
        imageUrl: draft.imageUrl,
      };

      const res = editingItemId
        ? await fetch(`/api/menu/${editingItemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/stores/${store.id}/menu`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          editingItemId
            ? prev.map((i) => (i.id === editingItemId ? data.item : i))
            : [...prev, data.item]
        );
        setIsEditorOpen(false);
        flashSaved();
      } else {
        const data = await res.json().catch(() => null);
        setEditorError(data?.error || "Failed to save item");
      }
    } catch {
      setEditorError("Network error — item not saved. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /** Optimistic availability toggle with rollback — the most frequent action. */
  const toggleAvailability = async (item: MenuItem) => {
    const next = !item.isAvailable;
    setBusyItemId(item.id);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: next } : i)));
    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? data.item : i)));
      flashSaved();
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)));
      setListError("Couldn't update availability. Please try again.");
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Remove "${item.name}" from the menu?`)) return;
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        flashSaved();
      } else {
        setListError("Failed to remove item. Please try again.");
      }
    } catch {
      setListError("Network error removing item. Please try again.");
    } finally {
      setBusyItemId(null);
    }
  };

  /** Move an item one slot within the FULL ordering (not the filtered view). */
  const moveItem = async (item: MenuItem, direction: -1 | 1) => {
    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((i) => i.id === item.id);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ordered.length) return;

    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    const itemIds = next.map((i) => i.id);

    // Optimistic: reorder by index so the UI is instant.
    setItems(next.map((i, idx) => ({ ...i, sortOrder: idx })));
    setBusyItemId(item.id);
    try {
      const res = await fetch(`/api/stores/${store.id}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds }),
      });
      if (!res.ok) throw new Error();
      flashSaved();
    } catch {
      setItems(ordered); // rollback
      setListError("Couldn't save the new order. Please try again.");
    } finally {
      setBusyItemId(null);
    }
  };

  const canMoveUp = (item: MenuItem) => {
    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    return ordered.length > 1 && ordered[0].id !== item.id;
  };
  const canMoveDown = (item: MenuItem) => {
    const ordered = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    return ordered.length > 1 && ordered[ordered.length - 1].id !== item.id;
  };

  const availableCount = items.filter((i) => i.isAvailable).length;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-6 sm:p-10">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <Link
            href="/admin/stores"
            className="mt-1 border-4 border-black bg-white p-2 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            title="Back to restaurants"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={3} />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black uppercase tracking-tight text-black">
              <span className="inline-flex -rotate-2 border-4 border-black bg-neo-yellow p-2 shadow-neo-xs">
                <UtensilsCrossed className="h-6 w-6" strokeWidth={2.5} />
              </span>
              Live Menu
            </h1>
            <p className="mt-1.5 max-w-lg text-xs font-bold leading-relaxed text-black/70">
              {store.name} &bull; served on the same QR as reviews. Changes reach diner phones
              within seconds — no reprint needed.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={`/r/${store.slug}`}
            target="_blank"
            className="border-[3px] border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-violet active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            View scan page
            <ExternalLink className="ml-1.5 inline h-3.5 w-3.5" strokeWidth={3} />
          </Link>
          <button
            type="button"
            onClick={openAdd}
            className="border-4 border-black bg-neo-red px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <Plus className="mr-1 inline h-4 w-4" strokeWidth={3} /> Add item
          </button>
        </div>
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-4 border-black bg-white p-3.5 shadow-neo-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="-rotate-1 border-2 border-black bg-neo-green px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
            {availableCount} live
          </span>
          <span className="rotate-1 border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
            {items.length - availableCount} hidden
          </span>
          {savedFlash && (
            <span className="inline-flex items-center gap-1 border-2 border-black bg-neo-yellow px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
              <Check className="h-3.5 w-3.5" strokeWidth={4} /> Live on diner phones
            </span>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-black" strokeWidth={3} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or sections..."
            className="w-full border-[3px] border-black bg-cream py-2 pl-9 pr-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
          />
        </div>
      </div>

      {listError && (
        <div className="border-[3px] border-black bg-neo-red px-3 py-2.5 text-xs font-black uppercase tracking-wide text-black shadow-neo-xs">
          {listError}
        </div>
      )}

      {/* Menu list */}
      {items.length === 0 ? (
        <div className="border-4 border-dashed border-black bg-white p-12 text-center shadow-neo-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 -rotate-3 items-center justify-center border-4 border-black bg-neo-violet text-2xl shadow-neo-xs">
            🍽️
          </div>
          <h3 className="text-lg font-black uppercase tracking-wide text-black">Your menu is empty</h3>
          <p className="mx-auto mt-1 max-w-md text-xs font-bold leading-relaxed text-black/70">
            Add your first dish and it appears instantly on the scan page. Tip: keep prices fresh —
            diners notice.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-2 border-4 border-black bg-neo-red px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <Plus className="h-4 w-4" strokeWidth={3} /> Add first item
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="border-4 border-dashed border-black bg-white p-10 text-center shadow-neo-sm">
          <p className="text-sm font-black uppercase tracking-wide text-black">
            No items match &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      ) : (
        Array.from(sections.entries()).map(([section, sectionItems]) => (
          <section key={section} className="border-4 border-black bg-white shadow-neo-md">
            <div className="flex items-center justify-between border-b-4 border-black bg-neo-yellow px-5 py-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-black">{section}</h2>
              <span className="border-2 border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-black">
                {sectionItems.length}
              </span>
            </div>
            <ul>
              {sectionItems.map((item, idx) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${!item.isAvailable ? "opacity-60" : ""} ${
                    idx < sectionItems.length - 1 ? "border-b-2 border-black" : ""
                  }`}
                >
                  {/* Reorder controls */}
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={!canMoveUp(item) || busyItemId === item.id}
                      onClick={() => moveItem(item, -1)}
                      className="border-2 border-black bg-white p-0.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      disabled={!canMoveDown(item) || busyItemId === item.id}
                      onClick={() => moveItem(item, 1)}
                      className="border-2 border-black bg-white p-0.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" strokeWidth={3} />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.isVeg && (
                        <span
                          title="Vegetarian"
                          className="flex h-4 w-4 shrink-0 items-center justify-center border-2 border-black bg-white"
                        >
                          <Leaf className="h-2.5 w-2.5 text-neo-green" strokeWidth={4} />
                        </span>
                      )}
                      <h3 className="text-sm font-black text-black">{item.name}</h3>
                      {!item.isAvailable && (
                        <span className="rotate-1 border-2 border-black bg-neo-red px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                          Sold out / hidden
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs font-bold text-black/60">{item.description}</p>
                    )}
                    {item.imageUrl && (
                      <p className="mt-1 truncate font-mono text-[10px] font-bold text-black/40">{item.imageUrl}</p>
                    )}
                  </div>

                  {item.imageUrl && (
                    <MenuItemImage key={item.imageUrl} src={item.imageUrl} alt={item.name} className="h-11 w-11 shrink-0" />
                  )}

                  <span className="shrink-0 border-2 border-black bg-cream px-2 py-1 text-sm font-black tabular-nums text-black shadow-neo-xs">
                    {formatPrice(item.price, store.currency)}
                  </span>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(item)}
                      disabled={busyItemId === item.id}
                      className={`border-2 border-black p-2 shadow-neo-xs transition-all duration-100 ease-linear enabled:hover:bg-neo-yellow enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-wait disabled:opacity-50 cursor-pointer ${
                        item.isAvailable ? "bg-neo-green text-black" : "bg-white text-black"
                      }`}
                      title={item.isAvailable ? "Hide from diners (sold out)" : "Show to diners"}
                    >
                      <Power className="h-4 w-4" strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="border-2 border-black bg-white p-2 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
                      title="Edit item"
                    >
                      <Edit2 className="h-4 w-4" strokeWidth={3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={busyItemId === item.id}
                      className="border-2 border-black bg-white p-2 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-wait disabled:opacity-50 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={3} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Add / Edit modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-4 border-black bg-white shadow-neo-xl">
            <div className="sticky top-0 flex items-center justify-between border-b-4 border-black bg-neo-yellow px-6 py-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wide text-black">
                  {editingItemId ? "Edit menu item" : "Add menu item"}
                </h2>
                <p className="text-[11px] font-bold text-black/70">
                  Saves go live on every diner&apos;s phone within seconds.
                </p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="border-2 border-black bg-white p-1.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>

            {editorError && (
              <div className="mx-6 mt-4 border-[3px] border-black bg-neo-red px-3 py-2 text-xs font-black uppercase tracking-wide text-black">
                {editorError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5 p-6">
              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                  Item name *
                </label>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Butter Chicken, Cold Brew Tonic"
                  className="w-full border-[3px] border-black bg-cream px-3 py-3 text-sm font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="e.g. Slow-cooked in a tomato-cashew gravy, served with butter naan"
                  className="w-full resize-none border-[3px] border-black bg-cream px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Price ({(store.currency || "INR").toUpperCase()}) — blank to hide
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                    placeholder="e.g. 280"
                    className="w-full border-[3px] border-black bg-cream px-3 py-3 text-sm font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Section
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="menu-category-suggestions"
                      value={draft.category}
                      onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                      placeholder="e.g. Mains"
                      className="w-full border-[3px] border-black bg-cream px-3 py-3 pr-8 text-sm font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-3.5 w-3.5 text-black" strokeWidth={3} />
                    <datalist id="menu-category-suggestions">
                      {CATEGORY_SUGGESTIONS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 border-[3px] border-black bg-cream p-3.5 shadow-neo-xs transition-colors hover:bg-neo-violet">
                <input
                  type="checkbox"
                  checked={draft.isVeg}
                  onChange={(e) => setDraft({ ...draft, isVeg: e.target.checked })}
                  className="h-4 w-4 accent-black"
                />
                <Leaf className="h-4 w-4 text-neo-green" strokeWidth={3} />
                <span className="text-xs font-black uppercase tracking-wide text-black">
                  Vegetarian (shows the green leaf mark)
                </span>
              </label>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                  Image link (optional)
                </label>
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                  placeholder="https://example.com/butter-chicken.jpg"
                  className="w-full border-[3px] border-black bg-cream px-3 py-3 font-mono text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                />
                <p className="mt-1 text-[10px] font-bold text-black/50">
                  Paste a direct photo link (https://...). It shows next to the dish on the diner
                  menu — leave blank for text-only.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t-[3px] border-black pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="border-2 border-transparent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black transition-all duration-100 ease-linear hover:border-black hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="border-4 border-black bg-neo-red px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow disabled:cursor-wait disabled:opacity-50 enabled:active:translate-x-1 enabled:active:translate-y-1 enabled:active:shadow-none cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingItemId ? "Save changes" : "Add to menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
