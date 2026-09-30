import React from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk";
import {
  LayoutDashboard,
  Store as StoreIcon,
  ShieldAlert,
  BarChart3,
  FileText,
  Printer,
  ExternalLink,
  Zap,
  Globe,
} from "lucide-react";

export const metadata = {
  title: "Admin Dashboard | FastQR ReviewBoost",
  description: "Manage restaurant stores, print standees, view scan analytics, and intercept negative reviews.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row text-zinc-900 print:bg-white print:block print:min-h-0">
      {/* Sidebar for Desktop / Header for Mobile */}
      <aside className="w-full md:w-64 bg-zinc-900 text-zinc-200 flex flex-col justify-between shrink-0 print:hidden">
        <div>
          {/* Logo */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5 font-black text-white text-base tracking-tight">
              <span className="w-7 h-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-xs">
                ⚡
              </span>
              <span>FastQR Admin</span>
            </Link>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-semibold">
              Live
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-xs font-semibold">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-zinc-400" />
              <span>Overview</span>
            </Link>

            <Link
              href="/admin/stores"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <StoreIcon className="w-4 h-4 text-zinc-400" />
              <span>Stores &amp; Standees</span>
            </Link>

            <Link
              href="/admin/feedback"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Firewall Inbox</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono">
                Intercepts
              </span>
            </Link>

            <Link
              href="/admin/analytics"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              <span>Analytics &amp; Tags</span>
            </Link>

            <Link
              href="/admin/prospectus"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>SaaS Prospectus</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300 text-[10px] font-mono">
                Pitch Deck
              </span>
            </Link>
          </nav>

          {/* Quick Simulators */}
          <div className="px-3 pt-2">
            <div className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Quick Tools
              </span>
              <Link
                href="/boost"
                className="flex items-center justify-between text-zinc-300 hover:text-white group"
              >
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Live /boost Demo
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
              </Link>
              <Link
                href="/admin/stores"
                className="flex items-center justify-between text-zinc-300 hover:text-white group"
              >
                <span className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  Table Tent Print
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
              </Link>
            </div>
          </div>
        </div>

        {/* Account & Marketing site links */}
        <div className="p-4 border-t border-zinc-800 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Signed in</span>
            {isClerkConfigured() ? (
              <UserButton />
            ) : (
              <span className="text-[10px] font-semibold text-amber-400">Auth not configured</span>
            )}
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>View Public Landing Page</span>
          </Link>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto print:overflow-visible print:block">
        {children}
      </div>
    </div>
  );
}
