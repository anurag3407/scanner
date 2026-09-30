import React from "react";
import Link from "next/link";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/clerk";
import {
  Store as StoreIcon,
  ShieldAlert,
  BarChart3,
  ExternalLink,
  Plus,
  Lock,
  Globe,
  Sparkles,
  QrCode,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | ReviewBoost Scanner",
  description: "Manage restaurant QR standees, customize chips, and intercept negative reviews.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowedEmail = (process.env.ADMIN_ALLOWED_EMAIL || "anuragmishra3407@gmail.com").toLowerCase();
  let user = null;
  let isAuthorized = true;
  let currentEmail = "";

  if (isClerkConfigured()) {
    try {
      user = await currentUser();
      if (user) {
        const userEmails = user.emailAddresses?.map((e) => e.emailAddress.toLowerCase()) || [];
        currentEmail = user.primaryEmailAddress?.emailAddress || userEmails[0] || "";
        isAuthorized = userEmails.includes(allowedEmail);
      }
    } catch (err) {
      console.error("Error retrieving Clerk current user:", err);
    }
  }

  // Restrict access strictly to anuragmishra3407@gmail.com
  if (isClerkConfigured() && user && !isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center text-white space-y-5 shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Access Restricted</h1>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              This ReviewBoost console is private and only accessible to{" "}
              <strong className="text-white">{allowedEmail}</strong>.
            </p>
            <p className="text-xs text-zinc-500 mt-2 font-mono bg-zinc-950/60 py-1.5 px-3 rounded-lg border border-zinc-800">
              Signed in as: {currentEmail}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <SignOutButton>
              <button className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-all border border-zinc-700 shadow-sm cursor-pointer">
                Sign Out / Switch Account
              </button>
            </SignOutButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row text-zinc-900 print:bg-white print:block print:min-h-0">
      {/* Sidebar for Desktop / Header for Mobile */}
      <aside className="w-full md:w-64 bg-zinc-900 text-zinc-200 flex flex-col justify-between shrink-0 print:hidden border-r border-zinc-800">
        <div>
          {/* Logo & Brand Header */}
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2.5 font-black text-white text-base tracking-tight">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                ⚡
              </span>
              <div>
                <span className="block leading-none">ReviewBoost</span>
                <span className="text-[10px] text-zinc-400 font-normal leading-none">Offline QR Agency</span>
              </div>
            </Link>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-semibold">
              Live
            </span>
          </div>

          {/* Active Admin Pill */}
          <div className="px-4 py-3 bg-zinc-950/40 border-b border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="truncate">Admin: <strong className="text-zinc-200">Anurag Mishra</strong></span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-xs font-semibold">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <StoreIcon className="w-4 h-4 text-amber-400" />
              <span>Restaurants &amp; QRs</span>
            </Link>

            <Link
              href="/admin/feedback"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Firewall Inbox</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono">
                1-3★ Alerts
              </span>
            </Link>

            <Link
              href="/admin/analytics"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Scan Analytics</span>
            </Link>
          </nav>

          {/* Quick Action */}
          <div className="px-3 pt-3">
            <Link
              href="/admin/stores"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Restaurant
            </Link>
          </div>

          {/* Client Demo Preview */}
          <div className="px-3 pt-4">
            <div className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Offline Demo Tool
              </span>
              <Link
                href="/boost"
                className="flex items-center justify-between text-zinc-300 hover:text-white group"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Live Phone Simulator
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300" />
              </Link>
            </div>
          </div>
        </div>

        {/* User profile & Clerk control */}
        <div className="p-4 border-t border-zinc-800 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-zinc-200 font-medium truncate">{user?.fullName || "Anurag Mishra"}</span>
              <span className="text-[11px] text-zinc-500 truncate">{currentEmail || allowedEmail}</span>
            </div>
            {isClerkConfigured() ? (
              <UserButton />
            ) : (
              <span className="text-[10px] font-semibold text-amber-400">Local Dev</span>
            )}
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors pt-1"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Home</span>
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
