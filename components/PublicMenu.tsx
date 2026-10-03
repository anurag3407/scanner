"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Leaf, RefreshCw, Wifi, UtensilsCrossed, Star } from "lucide-react";
import { PublicMenuItem } from "@/lib/types";
import MenuItemImage from "./MenuItemImage";

interface Props {
  /** The store id used in the public menu feed URL. */
  storeId: string;
  initialItems: PublicMenuItem[];
  initialVersion: string;
  currency?: string;
  /** Called when the diner taps the review CTA under the menu. */
  onLeaveReview?: () => void;
  /** Polling pauses while the menu tab is hidden to save diners' data. */
  active: boolean;
}

/** How often the diner's device checks whether the owner changed the menu. */
const POLL_INTERVAL_MS = 12_000;

function formatPrice(price: number, currency?: string): string {
  if (!price || price <= 0) return "Ask staff";
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

/** One human label per sync state, refreshed on a timer (never during render). */
function syncLabel(secondsAgo: number): string {
  if (secondsAgo < 5) return "just now";
  if (secondsAgo < 60) return `${secondsAgo}s ago`;
  return `${Math.round(secondsAgo / 60)}m ago`;
}

/**
 * The live digital menu on the diner scan page.
 *
 * Owners edit from the console; every connected diner's phone picks the change
 * up within one poll cycle — no app update, no QR reprint. Polling (rather
 * than a socket) is deliberate: it works through every captive proxy, carries
 * no long-lived connection cost on the Worker, and 12s is real-time enough for
 * a printed menu being replaced.
 */
export default function PublicMenu({
  storeId,
  initialItems,
  initialVersion,
  currency,
  onLeaveReview,
  active,
}: Props) {
  const [items, setItems] = useState<PublicMenuItem[]>(initialItems);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hadError, setHadError] = useState<boolean>(false);
  const [syncedText, setSyncedText] = useState<string>("just now");

  // Refs keep render pure: no Date.now(), no fetch, during render.
  const versionRef = useRef<string>(initialVersion);
  const lastSyncedAt = useRef<number>(0);
  // A response that started BEFORE a newer fetch must never overwrite newer
  // data (slow-network race). Monotonic request ids guard against that.
  const requestSeq = useRef<number>(0);

  // Keep the "synced Xs ago" label fresh without re-rendering on every tick.
  useEffect(() => {
    lastSyncedAt.current = Date.now();
    const update = () =>
      setSyncedText(syncLabel(Math.round((Date.now() - lastSyncedAt.current) / 1000)));
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++requestSeq.current;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/public/menu/${encodeURIComponent(storeId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`menu fetch failed: ${res.status}`);
      const data = await res.json();
      if (seq !== requestSeq.current) return; // a newer fetch already won
      const nextVersion: string = typeof data.version === "string" ? data.version : "";
      // Nothing changed since the last poll — skip the re-render entirely.
      if (nextVersion && nextVersion === versionRef.current) {
        setHadError(false);
        return;
      }
      versionRef.current = nextVersion;
      setItems(Array.isArray(data.items) ? data.items : []);
      lastSyncedAt.current = Date.now();
      setHadError(false);
    } catch {
      if (seq === requestSeq.current) {
        // Keep showing the last good menu; a transient blip must not blank it.
        setHadError(true);
      }
    } finally {
      if (seq === requestSeq.current) setIsRefreshing(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        refresh();
      }
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, refresh]);

  // Group into sections while preserving the owner's sort order.
  const sections = new Map<string, PublicMenuItem[]>();
  for (const item of items) {
    const key = item.category || "Others";
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(item);
  }

  return (
    <div className="space-y-4">
      {/* Live sync status strip */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex -rotate-1 items-center gap-1.5 border-2 border-black bg-neo-green px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs">
          <Wifi className="h-3.5 w-3.5" strokeWidth={3} />
          Live menu
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-black/60">
          synced {syncedText}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow"
          aria-label="Refresh menu"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} strokeWidth={3} />
          Refresh
        </button>
      </div>

      {hadError && (
        <p className="border-[3px] border-black bg-neo-yellow px-3 py-2 text-xs font-bold text-black shadow-neo-xs">
          Couldn&apos;t check for menu updates just now — showing the last version.
        </p>
      )}

      {items.length === 0 ? (
        <div className="border-4 border-dashed border-black bg-white p-10 text-center shadow-neo-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-4 border-black bg-neo-violet shadow-neo-xs">
            <UtensilsCrossed className="h-8 w-8 text-black" strokeWidth={2.5} />
          </div>
          <h3 className="text-base font-black uppercase tracking-wide text-black">Menu coming right up</h3>
          <p className="mx-auto mt-2 max-w-xs text-xs font-bold leading-relaxed text-black/70">
            Our team is plating up the digital menu. It appears here the second it&apos;s published.
          </p>
        </div>
      ) : (
        Array.from(sections.entries()).map(([section, sectionItems]) => (
          <section key={section} className="border-4 border-black bg-white shadow-neo-md">
            {/* Section header — color-blocked */}
            <div className="flex items-center justify-between border-b-4 border-black bg-neo-yellow px-4 py-2.5">
              <h3 className="text-sm font-black uppercase tracking-widest text-black">{section}</h3>
              <span className="border-2 border-black bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-black">
                {sectionItems.length}
              </span>
            </div>
            <ul>
              {sectionItems.map((item, idx) => (
                <li
                  key={item.id}
                  className={`flex items-start gap-3 px-4 py-4 ${
                    idx < sectionItems.length - 1 ? "border-b-2 border-black" : ""
                  }`}
                >
                  {item.imageUrl && (
                    <MenuItemImage key={item.imageUrl} src={item.imageUrl} alt={item.name} className="h-16 w-16 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.isVeg && (
                        <span
                          title="Vegetarian"
                          className="flex h-4 w-4 shrink-0 items-center justify-center border-2 border-black bg-white"
                        >
                          <Leaf className="h-2.5 w-2.5 text-neo-green" strokeWidth={4} />
                        </span>
                      )}
                      <h4 className="text-sm font-black leading-snug text-black">{item.name}</h4>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-xs font-bold leading-relaxed text-black/60">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 border-2 border-black bg-cream px-2 py-1 text-sm font-black tabular-nums text-black shadow-neo-xs">
                    {formatPrice(item.price, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {onLeaveReview && (
        <button
          type="button"
          onClick={onLeaveReview}
          className="flex w-full items-center justify-center gap-2 border-4 border-black bg-neo-red px-5 py-4 text-sm font-black uppercase tracking-widest text-white shadow-neo transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow active:translate-x-1.5 active:translate-y-1.5 active:shadow-none cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow"
        >
          <Star className="h-4 w-4 fill-neo-yellow text-neo-yellow" />
          <span>Enjoyed your meal? Leave a review</span>
        </button>
      )}
    </div>
  );
}
