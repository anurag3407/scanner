"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { Store } from "@/lib/types";
import QRCode from "qrcode";
import { Printer, Star, ShieldCheck, Sparkles, Scissors, ArrowLeft, Download, Copy, Check, QrCode as QrIcon } from "lucide-react";
import Link from "next/link";

interface Props {
  store: Store;
}

const FALLBACK_ORIGIN = "https://scanner.sayalabs.in";

/** No-op: `window.location.origin` cannot change within a page session. */
function subscribeToOrigin(): () => void {
  return () => {};
}

function getClientOrigin(): string {
  return window.location.origin || FALLBACK_ORIGIN;
}

/** Stable across server render and the client's first hydration pass. */
function getServerOrigin(): string {
  return process.env.NEXT_PUBLIC_APP_URL || FALLBACK_ORIGIN;
}

export default function PrintableStandee({ store }: Props) {
  // Default to empty table number so it generates the single universal 1-year QR code!
  const [tableNumber, setTableNumber] = useState<string>("");
  const [templateType, setTemplateType] = useState<"tent" | "plaque">("plaque");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [accentColor, setAccentColor] = useState<string>(store.brandColor || "#0d9488");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Reading `window.location.origin` during render produced a different origin
  // on the server than on the client's first pass, so the QR payload and the
  // displayed link differed and React logged a hydration mismatch on every
  // preview/staging deploy.
  //
  // `useSyncExternalStore` is the correct primitive here: the server snapshot and
  // the first client render both return the configured origin, then React
  // re-renders with the real one after hydration. No setState-in-effect cascade.
  const origin = useSyncExternalStore(subscribeToOrigin, getClientOrigin, getServerOrigin);

  // The QR encodes the immutable store id — never the slug. Printed standees
  // keep working even if the restaurant is renamed or its slug changes.
  const targetUrl = `${origin}/r/${store.id}${tableNumber.trim() ? `?table=${encodeURIComponent(tableNumber.trim())}` : ""}`;

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 480,
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("QR Code generation error", err));
  }, [targetUrl]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `${store.slug}-qr-code${tableNumber ? `-table-${tableNumber}` : ""}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-zinc-100 py-8 px-4 text-zinc-900 print:bg-white print:p-0 print:m-0">
      {/* Non-print control bar */}
      <div className="max-w-4xl mx-auto mb-8 bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm print:hidden space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2.5 rounded-2xl bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
              title="Back to Admin"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-zinc-900">
                  {store.name} &bull; Standee &amp; QR
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                  Permanent QR
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Target URL: <code className="text-zinc-700 font-mono">{targetUrl}</code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
            </button>

            <button
              onClick={handleDownloadQr}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save QR (.PNG)</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print 4&quot;x6&quot; Standee</span>
            </button>
          </div>
        </div>

        {/* 1-Year Universal QR Notification */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <QrIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Single 1-Year QR Mode:</strong> By leaving the Table Number empty, this exact same QR code works on all tables for the entire year. Even if the restaurant updates dishes or waiters, you update it in the admin panel and this printed QR never needs to be reprinted!
          </div>
        </div>

        {/* Customization controls */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Layout Format:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTemplateType("plaque")}
                className={`flex-1 py-2 px-3 rounded-xl border font-medium transition-all ${
                  templateType === "plaque"
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                Acrylic Stand (1-Sided)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("tent")}
                className={`flex-1 py-2 px-3 rounded-xl border font-medium transition-all ${
                  templateType === "tent"
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                Foldable Tent (2-Sided)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Table Number (Leave blank for all tables):</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="Leave empty for single QR"
              className="w-full py-2 px-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Brand Accent Color:</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-9 h-9 rounded-xl border border-zinc-200 cursor-pointer p-0.5"
              />
              <span className="font-mono text-zinc-500 uppercase">{accentColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area - Standard 4x6 sheet */}
      <div className="max-w-xl mx-auto print:max-w-none print:w-full">
        {templateType === "tent" ? (
          /* FOLDABLE TABLE TENT (Double Sided with fold line) */
          <div className="bg-white rounded-3xl shadow-xl print:shadow-none border border-zinc-200 print:border-none p-6 print:p-0">
            <div className="print:hidden text-[11px] text-zinc-400 mb-3 flex items-center justify-between border-b pb-2">
              <span>Standard 4&quot; x 6&quot; Foldable Table Tent with Center Fold Line</span>
              <span>Prints 1 per page</span>
            </div>

            <div className="relative border-2 border-dashed border-zinc-300 print:border-zinc-300 p-4 rounded-2xl">
              {/* TOP HALF (Reverse Side) */}
              <div className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50 flex flex-col items-center text-center transform rotate-180">
                <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span>How was your experience?</span>
                </div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">{store.name}</h2>
                <div className="flex items-center justify-center gap-1 my-2 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <div className="bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm my-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="Scan QR Code" className="w-36 h-36" />
                </div>
                <p className="text-xs font-bold text-zinc-900 mt-1">
                  Scan for our live menu &amp; leave a 5-star review!
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Point camera &bull; Live menu &amp; pre-drafted review &bull; 1-tap post
                </p>
                {tableNumber && (
                  <span className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 font-semibold">
                    Table #{tableNumber}
                  </span>
                )}
              </div>

              {/* FOLD LINE INDICATOR */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-dashed border-zinc-400" />
                </div>
                <div className="relative bg-white px-3 py-1 rounded-full border border-zinc-300 text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                  <Scissors className="w-3 h-3 text-zinc-400" />
                  Fold Line (Center Crease)
                </div>
              </div>

              {/* BOTTOM HALF (Facing Guest Side) */}
              <div className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50/50 flex flex-col items-center text-center">
                <div
                  className="px-3 py-1 rounded-full text-white text-[11px] font-bold mb-2 uppercase tracking-wider"
                  style={{ backgroundColor: accentColor }}
                >
                  Loved Your Visit?
                </div>
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{store.name}</h2>
                <p className="text-xs text-zinc-500 mt-0.5 font-medium">{store.tagline || store.category}</p>

                <div className="flex items-center justify-center gap-1.5 my-3 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>

                <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-md my-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="Scan QR Code" className="w-40 h-40" />
                </div>

                <div className="mt-2 space-y-1">
                  <p className="text-sm font-black text-zinc-900">
                    Scan with Phone Camera for Menu &amp; Reviews
                  </p>
                  <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
                    ✨ Live menu inside — and your 5-star review is pre-drafted! Tap, copy, post.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200/80 w-full flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Google Reviews</span>
                  {tableNumber && <span>Table #{tableNumber}</span>}
                  <span>Credo</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACRYLIC STAND / COUNTER PLAQUE (Single-Sided 4"x6") */
          <div className="bg-white rounded-3xl shadow-xl print:shadow-none border border-zinc-200 print:border-none p-6 print:p-0">
            <div className="print:hidden text-[11px] text-zinc-400 mb-3 flex items-center justify-between border-b pb-2">
              <span>Standard 4&quot; x 6&quot; Acrylic Stand Insert</span>
              <span>Ready for counter, table stand, or bill folder</span>
            </div>

            <div className="border-2 border-zinc-900 rounded-3xl p-8 bg-gradient-to-b from-zinc-50 via-white to-zinc-50 flex flex-col items-center text-center max-w-sm mx-auto shadow-sm">
              <div
                className="w-14 h-14 rounded-2xl text-white flex items-center justify-center text-2xl font-black shadow-md mb-3"
                style={{ backgroundColor: accentColor }}
              >
                {store.name.charAt(0)}
              </div>

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{store.name}</h2>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">{store.tagline || store.category}</p>

              <div className="flex items-center justify-center gap-1.5 my-3 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>

              <div className="bg-white p-3 rounded-2xl border-2 border-zinc-900 shadow-md my-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="Scan QR Code" className="w-44 h-44" />
              </div>

              <div className="mt-2 space-y-1">
                <p className="text-base font-black text-zinc-900">
                  Scan for Menu &amp; Reviews
                </p>
                <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                  Point camera &bull; Live menu &bull; Pre-drafted 5-star review
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200 w-full flex items-center justify-between text-[11px] text-zinc-500">
                <span className="font-semibold text-zinc-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Google Reviews
                </span>
                {tableNumber ? (
                  <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded font-bold">
                    Table #{tableNumber}
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400 font-mono">Dine-in Standee</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
