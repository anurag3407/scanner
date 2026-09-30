"use client";

import React, { useState, useEffect } from "react";
import { Store } from "@/lib/types";
import QRCode from "qrcode";
import { Printer, Star, ShieldCheck, Sparkles, Scissors, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  store: Store;
}

export default function PrintableStandee({ store }: Props) {
  const [tableNumber, setTableNumber] = useState<string>("7");
  const [templateType, setTemplateType] = useState<"tent" | "plaque">("tent");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [accentColor, setAccentColor] = useState<string>(store.brandColor || "#E11D48");

  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://fastqr.review";
    const targetUrl = `${origin}/r/${store.slug}${tableNumber ? `?table=${encodeURIComponent(tableNumber)}` : ""}`;

    QRCode.toDataURL(targetUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error("QR Code generation error", err));
  }, [store.slug, tableNumber]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 py-8 px-4 text-zinc-900 print:bg-white print:p-0 print:m-0">
      {/* Non-print control bar */}
      <div className="max-w-4xl mx-auto mb-8 bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/stores"
              className="p-2 rounded-xl bg-zinc-100 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 transition-colors"
              title="Back to Stores"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-zinc-900">
                Print Table Tent &amp; Standee Generator
              </h1>
              <p className="text-xs text-zinc-500">
                Configuring for: <strong className="text-zinc-800">{store.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" /> Print Standee (4&quot;x6&quot;)
            </button>
          </div>
        </div>

        {/* Customization controls */}
        <div className="mt-5 pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Layout Template:</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTemplateType("tent")}
                className={`flex-1 py-1.5 px-3 rounded-lg border font-medium ${
                  templateType === "tent"
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                Foldable Tent (2-Sided)
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("plaque")}
                className={`flex-1 py-1.5 px-3 rounded-lg border font-medium ${
                  templateType === "plaque"
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                Acrylic Plaque (1-Sided)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Table Number (Optional):</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. 7 or Bar"
              className="w-full py-1.5 px-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Brand Accent Color:</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
              />
              <span className="font-mono text-zinc-500 uppercase">{accentColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area - Standard 4x6 or 2x 4x6 sheet */}
      <div className="max-w-xl mx-auto print:max-w-none print:w-full">
        {templateType === "tent" ? (
          /* FOLDABLE TABLE TENT (Double Sided with fold line) */
          <div className="bg-white rounded-2xl shadow-xl print:shadow-none border border-zinc-200 print:border-none p-6 print:p-0">
            {/* Guide header */}
            <div className="print:hidden text-[11px] text-zinc-400 mb-3 flex items-center justify-between border-b pb-2">
              <span>Standard 4&quot; x 6&quot; Foldable Table Tent with Center Fold Line</span>
              <span>Prints 1 per page</span>
            </div>

            <div className="relative border-2 border-dashed border-zinc-300 print:border-zinc-300 p-4 rounded-xl">
              {/* TOP HALF (Reverse Side) */}
              <div className="p-6 border border-zinc-100 rounded-xl bg-zinc-50/50 flex flex-col items-center text-center transform rotate-180">
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
                <div className="bg-white p-2 rounded-xl border border-zinc-200 shadow-sm my-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeUrl} alt="Scan QR Code" className="w-36 h-36" />
                </div>
                <p className="text-xs font-bold text-zinc-900 mt-1">
                  Scan to leave a 5-star review in 10 seconds!
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Point camera • Pre-written review • 1-tap post
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
              <div className="p-6 border border-zinc-100 rounded-xl bg-zinc-50/50 flex flex-col items-center text-center">
                <div
                  className="px-3 py-1 rounded-full text-white text-[11px] font-bold mb-2 uppercase tracking-wider"
                  style={{ backgroundColor: accentColor }}
                >
                  Loved Your Meal?
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
                    Scan with Phone Camera to Review
                  </p>
                  <p className="text-xs text-zinc-600 max-w-xs mx-auto leading-relaxed">
                    ✨ Your 5-star review is already pre-drafted! Just tap highlights and copy.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200/80 w-full flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Google Verified Partner</span>
                  {tableNumber && <span>Table #{tableNumber}</span>}
                  <span>FastQR ReviewBoost</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACRYLIC STAND / COUNTER PLAQUE (Single-Sided 4"x6") */
          <div className="bg-white rounded-2xl shadow-xl print:shadow-none border border-zinc-200 print:border-none p-6 print:p-0">
            <div className="print:hidden text-[11px] text-zinc-400 mb-3 flex items-center justify-between border-b pb-2">
              <span>Standard 4&quot; x 6&quot; Acrylic Stand Insert</span>
              <span>Ready for counter or table clip</span>
            </div>

            <div className="border-2 border-zinc-900 rounded-3xl p-8 bg-gradient-to-b from-zinc-50 via-white to-zinc-50 flex flex-col items-center text-center max-w-sm mx-auto shadow-sm">
              <div
                className="w-14 h-14 rounded-2xl text-white flex items-center justify-center text-2xl font-black shadow-md mb-3"
                style={{ backgroundColor: accentColor }}
              >
                {store.name.charAt(0)}
              </div>

              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{store.name}</h2>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">{store.category}</p>

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
                  Scan to Share Your Experience
                </p>
                <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                  Fast 1-tap review pre-loader. Zero typing required!
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-200 w-full flex items-center justify-between text-[11px] text-zinc-500">
                <span className="font-semibold text-zinc-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Google Reviews
                </span>
                {tableNumber && (
                  <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded font-bold">
                    Table #{tableNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
