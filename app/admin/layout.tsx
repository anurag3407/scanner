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
  title: "Admin Dashboard | Credo Scanner",
  description: "Manage restaurant QR standees, live menus, review keywords, and intercept negative reviews.",
};

function RestrictedScreen({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-5 border-4 border-white bg-black p-8 text-center text-white shadow-neo-white-md">
        <div className="mx-auto flex h-16 w-16 -rotate-3 items-center justify-center border-4 border-white bg-neo-red text-2xl text-black">
          <Lock className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-black uppercase tracking-wide">Access restricted</h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-white/80">
            This console is private. Ask your platform administrator to invite{" "}
            <strong className="bg-neo-yellow px-1 text-black">{email || "this email"}</strong> to a
            store before signing in.
          </p>
          <div className="mt-3 border-2 border-white bg-black px-2.5 py-2 font-mono text-xs font-bold text-white/80">
            Signed in as: <span className="font-black text-neo-yellow">{email || "Unauthorized Account"}</span>
          </div>
        </div>
        <div className="flex justify-center pt-2">
          <SignOutButton>
            <button className="cursor-pointer border-4 border-white bg-white px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-white-sm transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-1 active:translate-y-1 active:shadow-none">
              Sign out / switch account
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
    <div className="flex min-h-screen flex-col bg-cream bg-neo-grid text-black md:flex-row print:block print:min-h-0 print:bg-white">
      {/* Sidebar for Desktop / Header for Mobile */}
      <aside className="flex w-full shrink-0 flex-col justify-between border-b-4 border-black bg-black text-white print:hidden md:w-64 md:border-b-0 md:border-r-4">
        <div>
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between border-b-4 border-white/20 p-5">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 -rotate-6 items-center justify-center border-4 border-white bg-neo-yellow text-sm font-black text-black shadow-neo-white-sm">
                ⚡
              </span>
              <span className="text-base font-black uppercase leading-none tracking-tight">
                Credo
                <span className="block pt-0.5 text-[10px] font-bold tracking-widest text-white/60">
                  Review Console
                </span>
              </span>
            </Link>
            <span className="rotate-3 border-2 border-white bg-neo-green px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest text-black">
              Live
            </span>
          </div>

          {/* Active User Pill */}
          <div className="flex items-center gap-2 border-b-4 border-white/20 bg-black px-4 py-3 text-[11px] font-bold text-white/70">
            <span className="h-2 w-2 shrink-0 animate-pulse bg-neo-green"></span>
            <span className="truncate">
              {isSuperAdmin ? "Platform Owner" : "Store Admin"}:{" "}
              <strong className="font-black text-white">{user.email}</strong>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-2 p-3 text-xs">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 border-2 border-transparent px-3 py-2.5 font-black uppercase tracking-widest text-white transition-all duration-100 ease-linear hover:border-white hover:bg-white hover:text-black hover:shadow-neo-white-sm"
            >
              <StoreIcon className="h-4 w-4 text-neo-yellow" strokeWidth={2.5} />
              <span>{isSuperAdmin ? "Restaurants & QRs" : "My Restaurants"}</span>
            </Link>

            <Link
              href="/admin/feedback"
              className="flex items-center justify-between border-2 border-transparent px-3 py-2.5 font-black uppercase tracking-widest text-white transition-all duration-100 ease-linear hover:border-white hover:bg-white hover:text-black hover:shadow-neo-white-sm"
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-neo-red" strokeWidth={2.5} />
                Firewall Inbox
              </span>
              <span className="border-2 border-white bg-neo-red px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
                1-3★
              </span>
            </Link>

            <Link
              href="/admin/analytics"
              className="flex items-center gap-2.5 border-2 border-transparent px-3 py-2.5 font-black uppercase tracking-widest text-white transition-all duration-100 ease-linear hover:border-white hover:bg-white hover:text-black hover:shadow-neo-white-sm"
            >
              <BarChart3 className="h-4 w-4 text-neo-blue" strokeWidth={2.5} />
              <span>Scan Analytics</span>
            </Link>

            {isSuperAdmin && (
              <Link
                href="/admin/team"
                className="flex items-center gap-2.5 border-2 border-transparent px-3 py-2.5 font-black uppercase tracking-widest text-white transition-all duration-100 ease-linear hover:border-white hover:bg-white hover:text-black hover:shadow-neo-white-sm"
              >
                <Users className="h-4 w-4 text-neo-green" strokeWidth={2.5} />
                <span>Team &amp; Access</span>
              </Link>
            )}
          </nav>

          {/* Quick Action — creating locations is platform-owner only */}
          {isSuperAdmin && (
            <div className="px-3 pt-3">
              <Link
                href="/admin/stores"
                className="flex w-full items-center justify-center gap-2 border-4 border-white bg-neo-yellow px-3 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-white-sm transition-all duration-100 ease-linear hover:bg-white active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Add new restaurant
              </Link>
            </div>
          )}

          {/* Store-admin context note */}
          {!isSuperAdmin && (
            <div className="px-3 pt-3">
              <div className="border-2 border-white/40 bg-black p-3 text-[11px] font-bold leading-relaxed text-white/70">
                You can manage the reviews, menus, dishes and standees for{" "}
                <strong className="bg-neo-yellow px-1 text-black">
                  {user.storeIds.length} location{user.storeIds.length === 1 ? "" : "s"}
                </strong>{" "}
                assigned to you.
              </div>
            </div>
          )}
        </div>

        {/* User profile & Clerk control */}
        <div className="space-y-3 border-t-4 border-white/20 p-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-col pr-2">
              <span className="truncate font-black uppercase tracking-widest text-white">
                {isSuperAdmin ? "Platform Owner" : "Store Admin"}
              </span>
              <span className="truncate text-[11px] font-bold text-white/60">{user.email}</span>
            </div>
            {isClerkConfigured() ? (
              <UserButton />
            ) : (
              <span className="border-2 border-neo-yellow bg-neo-yellow px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-black">
                Local Dev
              </span>
            )}
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 border-2 border-transparent px-1 py-1 font-black uppercase tracking-widest text-white/70 transition-all duration-100 ease-linear hover:border-white hover:bg-white hover:text-black"
          >
            <Globe className="h-3.5 w-3.5" strokeWidth={3} />
            <span>Public Home</span>
          </Link>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex min-w-0 flex-1 flex-col print:block print:overflow-visible">
        {children}
      </div>
    </div>
  );
}
