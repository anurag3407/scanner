import React from "react";
import { connection } from "next/server";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { isClerkConfigured } from "@/lib/clerk";

export const metadata = {
  title: "Sign in | FastQR ReviewBoost Admin",
  description: "Sign in to manage restaurant locations, standees, and reputation firewall feedback.",
};

export default async function SignInPage() {
  await connection();
  const clerkConfigured = isClerkConfigured();

  return (
    <main className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center space-y-1.5">
        <div className="flex items-center justify-center gap-1.5 text-zinc-900 font-black text-lg tracking-tight">
          <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
            ⚡
          </span>
          FastQR Admin
        </div>
        <p className="text-xs text-zinc-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Manager access to locations, standees, and firewall inbox
        </p>
      </div>

      {clerkConfigured ? (
        <SignIn />
      ) : (
        <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 shadow-sm p-6 space-y-3 text-center">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <KeyRound className="w-5 h-5" />
          </div>
          <h1 className="text-base font-bold text-zinc-900">Admin authentication is not set up yet</h1>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Add your Clerk keys to this deployment, then reload this page. The diner scan pages,
            review generation, and private feedback form keep working without them.
          </p>
          <div className="text-left bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-[11px] font-mono text-zinc-700 space-y-1">
            <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...</div>
            <div>CLERK_SECRET_KEY=sk_...</div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Get both keys at{" "}
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-semibold hover:underline"
            >
              dashboard.clerk.com
            </a>{" "}
            → API Keys.
          </p>
        </div>
      )}

      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to ReviewBoost home
      </Link>
    </main>
  );
}
