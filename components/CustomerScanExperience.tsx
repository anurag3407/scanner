"use client";

import React, { useEffect, useRef, useState } from "react";
import { UtensilsCrossed, Star, ShieldCheck } from "lucide-react";
import { PublicMenuItem, PublicStore, ScanEventType } from "@/lib/types";
import PublicMenu from "./PublicMenu";
import CustomerReviewFlow from "./CustomerReviewFlow";

interface Props {
  store: PublicStore;
  initialMenuItems: PublicMenuItem[];
  initialMenuVersion: string;
  initialTable?: string;
  /** Deep-link override: owners can share a straight-to-menu or straight-to-review QR. */
  initialView?: ScanTab;
}

type ScanTab = "menu" | "review";

/**
 * The single QR destination: one scan opens BOTH the live menu and the review
 * flow. The tab defaults to the menu when the restaurant has published one
 * (a diner at the table wants tonight's menu first), otherwise it goes
 * straight into the 10-second review flow. `?view=review|menu` overrides the
 * default so printed materials can point diners at either experience.
 */
export default function CustomerScanExperience({
  store,
  initialMenuItems,
  initialMenuVersion,
  initialTable = "",
  initialView,
}: Props) {
  const hasMenu = initialMenuItems.length > 0;
  const [tab, setTab] = useState<ScanTab>(initialView ?? (hasMenu ? "menu" : "review"));
  const scanLogged = useRef<boolean>(false);

  // One telemetry event per scan, regardless of which tab the diner lands on.
  useEffect(() => {
    if (scanLogged.current) return;
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
  }, [store.id]);

  const logEvent = (type: ScanEventType) => {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: store.id, type, rating: 5, chips: [] }),
    }).catch(() => {});
  };

  const brandColor = store.brandColor || "#E11D48";

  const tabs: { id: ScanTab; label: string; icon: React.ReactNode }[] = [
    { id: "menu", label: "Menu", icon: <UtensilsCrossed className="w-4 h-4" strokeWidth={2.5} /> },
    { id: "review", label: "Review", icon: <Star className="w-4 h-4" strokeWidth={2.5} /> },
  ];

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* Restaurant header — brand color block, sticker structure */}
      <div
        className="relative border-4 border-black p-5 shadow-neo-md"
        style={{ backgroundColor: brandColor }}
      >
        {/* Corner sticker */}
        <span className="absolute -top-3 -left-2 -rotate-6 border-2 border-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs">
          <ShieldCheck className="mr-1 inline h-3 w-3" strokeWidth={3} />
          Verified Guest
        </span>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight tracking-tight text-white [text-shadow:3px_3px_0_#000]">
              {store.name}
            </h1>
            <p className="mt-1 line-clamp-1 text-xs font-bold text-black/80">
              {store.address || store.tagline || store.category}
            </p>
          </div>
          <div className="flex h-14 w-14 shrink-0 -rotate-3 items-center justify-center border-4 border-black bg-white font-black text-2xl text-black shadow-neo-xs">
            {store.name.charAt(0)}
          </div>
        </div>
      </div>

      {/* Tab switcher — mechanical switches */}
      <div className="grid grid-cols-2 gap-3">
        {tabs.map((t, idx) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (t.id !== tab && t.id === "menu") logEvent("menu_view");
                setTab(t.id);
              }}
              aria-current={isActive}
              className={`flex items-center justify-center gap-2 border-4 border-black px-4 py-3 text-sm font-black uppercase tracking-widest transition-all duration-100 ease-linear shadow-neo-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-yellow ${
                isActive
                  ? "bg-black text-white"
                  : `bg-white text-black hover:bg-neo-yellow active:translate-x-1 active:translate-y-1 active:shadow-none ${
                      idx === 0 ? "-rotate-1" : "rotate-1"
                    } hover:rotate-0`
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "menu" ? (
        <PublicMenu
          storeId={store.id}
          initialItems={initialMenuItems}
          initialVersion={initialMenuVersion}
          currency={store.currency}
          active={tab === "menu"}
          onLeaveReview={() => setTab("review")}
        />
      ) : (
        <CustomerReviewFlow store={store} initialTable={initialTable} />
      )}
    </div>
  );
}
