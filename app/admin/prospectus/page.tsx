import React from "react";
import ProspectusClient from "@/components/ProspectusClient";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export const metadata = {
  title: "SaaS Investment & Pitch Prospectus | Credo Admin",
  description: "Comprehensive B2B SaaS prospectus: unit economics, TAM, restaurant ROI, and viral QR distribution flywheel.",
};

export default function AdminProspectusPage() {
  return (
    <div className="w-full">
      <div className="bg-white border-b-[3px] border-black px-6 py-3 flex items-center justify-between text-xs print:hidden">
        <span className="text-black/60 font-black uppercase tracking-widest">
          Executive Deck Mode • Internal Review
        </span>
        <Link
          href="/prospectus"
          target="_blank"
          className="inline-flex items-center gap-1.5 font-black uppercase tracking-widest text-black hover:bg-neo-yellow"
        >
          Open Public Presentation Deck <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ProspectusClient />
    </div>
  );
}
