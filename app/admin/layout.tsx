import React from "react";
import Link from "next/link";
import { UserButton, SignOutButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/clerk";
import { assertAdminAuth } from "@/lib/auth";
import {
  Store as StoreIcon,
  ShieldAlert,
  BarChart3,
  Lock,
  Globe,
  Plus,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Dashboard | ReviewBoost Scanner",
  description: "Manage restaurant QR standees, customize chips, and intercept negative reviews.",
};

function RestrictedScreen({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center text-white space-y-5 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-2xl">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Access Restricted</h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            This console is private. Ask your platform administrator to invite{" "}
            <strong className="text-white font-semibold">{email || "this email"}</strong> to a
            store before signing in.
          </p>
          <div className="mt-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400">
            Signed in as:{" "}
            <span className="text-rose-400 font-semibold">{email || "Unauthorized Account"}</span>
          </div>
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await assertAdminAuth();

  // Unauthenticated (and Clerk-less) visitors are sent to sign-in; signed-in
  // users who are not in the team directory see the restricted screen.
  if (!auth.authorized || !auth.user) {
    if (!isClerkConfigured() || auth.status === 401 || auth.status === 503) {
      redirect("/sign-in");
    }
    return <RestrictedScreen email={auth.email || ""} />;
  }

  const user = auth.user;
  const isSuperAdmin = user.isSuperAdmin;

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
                <span className="text-[10px] text-zinc-400 font-normal leading-none">Review Console</span>
              </div>
            </Link>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-semibold">
              Live
            </span>
          </div>

          {/* Active User Pill */}
          <div className="px-4 py-3 bg-zinc-950/40 border-b border-zinc-800/80 flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">
              {isSuperAdmin ? "Platform Owner" : "Store Admin"}:{" "}
              <strong className="text-zinc-200">{user.email}</strong>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-xs font-semibold">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <StoreIcon className="w-4 h-4 text-amber-400" />
              <span>{isSuperAdmin ? "Restaurants & QRs" : "My Restaurants"}</span>
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
                1-3★
              </span>
            </Link>

            <Link
              href="/admin/analytics"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>Scan Analytics</span>
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin/team"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Team &amp; Access</span>
              </Link>
            )}
          </nav>

          {/* Quick Action — creating locations is platform-owner only */}
          {isSuperAdmin && (
            <div className="px-3 pt-3">
              <Link
                href="/admin/stores"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-100 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Restaurant
              </Link>
            </div>
          )}

          {/* Store-admin context note */}
          {!isSuperAdmin && (
            <div className="px-3 pt-3">
              <div className="p-3 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 text-[11px] text-zinc-400 leading-relaxed">
                You can manage the reviews, dishes and standees for{" "}
                <strong className="text-zinc-200">
                  {user.storeIds.length} location{user.storeIds.length === 1 ? "" : "s"}
                </strong>{" "}
                assigned to you.
              </div>
            </div>
          )}
        </div>

        {/* User profile & Clerk control */}
        <div className="p-4 border-t border-zinc-800 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span className="text-zinc-200 font-medium truncate">
                {isSuperAdmin ? "Platform Owner" : "Store Admin"}
              </span>
              <span className="text-[11px] text-zinc-500 truncate">{user.email}</span>
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
