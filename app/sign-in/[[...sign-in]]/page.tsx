import React from "react";
import { connection } from "next/server";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  Users,
  Mail,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { isClerkConfigured } from "@/lib/clerk";

export const metadata = {
  title: "Sign in | ReviewBoost Admin",
  description: "Sign in to manage restaurant locations, standees, and reputation firewall feedback.",
};

const FEATURES = [
  {
    icon: ShieldAlert,
    title: "Reputation Firewall",
    description: "1–3★ complaints are intercepted privately before they ever reach Google.",
  },
  {
    icon: QrCode,
    title: "Permanent QR standees",
    description: "Print once. Update dishes and sentences anytime — the code never changes.",
  },
  {
    icon: Users,
    title: "Role-based access",
    description: "Store admins only ever see the locations you assign to them.",
  },
  {
    icon: Mail,
    title: "Owner alerts",
    description: "Low-rating alerts land in each store's own owner inbox, not a black hole.",
  },
];

export default async function SignInPage() {
  await connection();
  const clerkConfigured = isClerkConfigured();

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white text-zinc-900">
      {/* Brand Panel */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-zinc-950 text-white p-12 xl:p-16">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5 font-black text-lg tracking-tight">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold text-base shadow-lg">
              ⚡
            </span>
            ReviewBoost
          </Link>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mt-2 font-semibold">
            Review operations console
          </p>
        </div>

        <div className="relative space-y-8 max-w-lg">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-amber-300 border border-white/10 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              One console for every location
            </div>
            <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-[1.05] text-white">
              Turn every table into a five-star review.
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The console behind your QR standees — dish highlights, sentence combinations, wallet
              of analytics, and a private safety net for unhappy guests.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <feature.icon className="w-4 h-4 text-amber-400 mb-2.5" />
                <h2 className="text-xs font-bold text-white">{feature.title}</h2>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Clerk-secured sign-in
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" /> Live scan analytics
          </span>
        </div>
      </section>

      {/* Sign-in Panel */}
      <section className="flex flex-col items-center justify-center p-6 sm:p-12 bg-zinc-50">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand */}
          <div className="lg:hidden text-center space-y-2">
            <div className="inline-flex items-center gap-2 font-black text-lg tracking-tight text-zinc-900">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                ⚡
              </span>
              ReviewBoost
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">
              Sign in to your console
            </h1>
            <p className="text-xs text-zinc-500">
              Store admins sign in with the email their platform owner invited.
            </p>
          </div>

          {clerkConfigured ? (
            <div className="flex justify-center">
              <SignIn
                appearance={{
                  variables: {
                    colorPrimary: "#18181b",
                    borderRadius: "0.85rem",
                    fontSize: "0.9rem",
                  },
                  elements: {
                    rootBox: "w-full",
                    cardBox: "w-full shadow-xl border border-zinc-200 rounded-3xl",
                    card: "shadow-none bg-white",
                    headerTitle: "text-zinc-900 font-bold",
                    headerSubtitle: "text-zinc-500",
                    socialButtonsBlockButton:
                      "border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors",
                    formButtonPrimary:
                      "bg-zinc-900 hover:bg-black text-white shadow-md normal-case text-sm font-semibold",
                    footerActionLink: "text-zinc-900 font-semibold hover:text-black",
                  },
                }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-amber-200 shadow-sm p-6 space-y-3 text-center">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <KeyRound className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-zinc-900">
                Admin authentication is not set up yet
              </h2>
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

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to ReviewBoost home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
