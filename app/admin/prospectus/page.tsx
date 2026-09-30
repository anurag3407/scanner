import React from "react";
import ProspectusClient from "@/components/ProspectusClient";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata = {
  title: "SaaS Investment & Pitch Prospectus | ReviewBoost Admin",
  description: "Comprehensive B2B SaaS prospectus: unit economics, TAM, restaurant ROI, and viral QR distribution flywheel.",
};

export default function AdminProspectusPage() {
  return (
    <div className="w-full">
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between text-xs print:hidden">
        <span className="text-zinc-500 font-medium">
          Executive Deck Mode • Internal Review
        </span>
        <Link
          href="/prospectus"
          target="_blank"
          className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800"
        >
          Open Public Presentation Deck <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ProspectusClient />
    </div>
  );
}
