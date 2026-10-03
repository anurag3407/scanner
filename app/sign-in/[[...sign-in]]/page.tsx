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
    bg: "bg-neo-red",
  },
  {
    icon: QrCode,
    title: "Permanent QR standees",
    description: "Print once. Update menus, dishes and sentences anytime — the code never changes.",
    bg: "bg-neo-yellow",
  },
  {
    icon: Users,
    title: "Role-based access",
    description: "Store admins only ever see the locations you assign to them.",
    bg: "bg-neo-violet",
  },
  {
    icon: Mail,
    title: "Owner alerts",
    description: "Low-rating alerts land in each store's own owner inbox, not a black hole.",
    bg: "bg-neo-green",
  },
];

export default async function SignInPage() {
  await connection();
  const clerkConfigured = isClerkConfigured();

  return (
    <main className="grid min-h-screen bg-cream bg-neo-grid text-black lg:grid-cols-2">
      {/* Brand Panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r-4 border-black bg-black p-12 text-white xl:p-16 lg:flex">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rotate-12 bg-neo-halftone opacity-20" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-black uppercase tracking-tight">
            <span className="flex h-10 w-10 -rotate-6 items-center justify-center border-4 border-white bg-neo-yellow text-base font-black text-black shadow-neo-white-sm">
              ⚡
            </span>
            ReviewBoost
          </Link>
          <p className="mt-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
            Review operations console
          </p>
        </div>

        <div className="relative max-w-lg space-y-8">
          <div className="space-y-4">
            <div className="inline-flex rotate-1 items-center gap-1.5 border-2 border-white bg-neo-yellow px-3 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-white-sm">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={3} />
              One console for every location
            </div>
            <h1 className="text-4xl font-black uppercase leading-[1.05] tracking-tight xl:text-5xl">
              Turn every table into a{" "}
              <span className="border-4 border-white bg-neo-red px-2 text-black">five-star</span>{" "}
              review.
            </h1>
            <p className="text-sm font-bold leading-relaxed text-white/70">
              The console behind your QR standees — live menus, dish highlights, sentence
              combinations, a wallet of analytics, and a private safety net for unhappy guests.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`border-[3px] border-white bg-black p-4 shadow-neo-white-sm ${
                  i % 2 === 0 ? "-rotate-1" : "rotate-1"
                } transition-transform hover:rotate-0`}
              >
                <span className={`mb-2.5 inline-flex border-2 border-white p-1.5 text-black ${feature.bg}`}>
                  <feature.icon className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">{feature.title}</h2>
                <p className="mt-1 text-[11px] font-bold leading-relaxed text-white/60">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-4 text-[11px] font-black uppercase tracking-widest text-white/60">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-neo-green" strokeWidth={3} /> Clerk-secured sign-in
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-neo-blue" strokeWidth={3} /> Live scan analytics
          </span>
        </div>
      </section>

      {/* Sign-in Panel */}
      <section className="flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand */}
          <div className="space-y-2 text-center lg:hidden">
            <div className="inline-flex items-center gap-2 text-lg font-black uppercase tracking-tight text-black">
              <span className="flex h-9 w-9 -rotate-6 items-center justify-center border-[3px] border-black bg-neo-yellow text-sm font-black shadow-neo-xs">
                ⚡
              </span>
              ReviewBoost
            </div>
          </div>

          <div className="space-y-1 text-center">
            <h1 className="inline-block -rotate-1 border-[3px] border-black bg-neo-yellow px-3 py-1 text-2xl font-black uppercase tracking-tight text-black shadow-neo-xs">
              Sign in to your console
            </h1>
            <p className="pt-1 text-xs font-bold text-black/60">
              Store admins sign in with the email their platform owner invited.
            </p>
          </div>

          {clerkConfigured ? (
            <div className="flex justify-center">
              <SignIn
                appearance={{
                  variables: {
                    colorPrimary: "#000000",
                    borderRadius: "0px",
                    fontSize: "0.9rem",
                  },
                  elements: {
                    rootBox: "w-full",
                    cardBox: "w-full border-4 border-black shadow-neo-md bg-white",
                    card: "shadow-none bg-white",
                    headerTitle: "text-black font-black uppercase tracking-wide",
                    headerSubtitle: "text-black/60 font-bold",
                    socialButtonsBlockButton:
                      "border-2 border-black text-black font-bold hover:bg-neo-yellow rounded-none transition-colors",
                    formButtonPrimary:
                      "bg-black hover:bg-neo-red hover:text-black text-white shadow-[4px_4px_0px_0px_#000] rounded-none normal-case text-sm font-bold",
                    footerActionLink: "text-black font-black hover:bg-neo-yellow",
                  },
                }}
              />
            </div>
          ) : (
            <div className="space-y-3 border-4 border-black bg-white p-6 text-center shadow-neo-md">
              <div className="mx-auto flex h-11 w-11 -rotate-3 items-center justify-center border-[3px] border-black bg-neo-yellow shadow-neo-xs">
                <KeyRound className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <h2 className="text-base font-black uppercase tracking-wide text-black">
                Admin authentication is not set up yet
              </h2>
              <p className="text-xs font-bold leading-relaxed text-black/70">
                Add your Clerk keys to this deployment, then reload this page. The diner scan pages,
                live menus, review generation, and private feedback form keep working without them.
              </p>
              <div className="space-y-1 border-[3px] border-black bg-cream p-3 text-left font-mono text-[11px] font-bold text-black">
                <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...</div>
                <div>CLERK_SECRET_KEY=sk_...</div>
              </div>
              <p className="text-[11px] font-bold text-black/60">
                Get both keys at{" "}
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-neo-yellow px-1 font-black text-black underline decoration-2 underline-offset-2"
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
              className="inline-flex items-center gap-1.5 border-2 border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-yellow active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={3} /> Back to ReviewBoost home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
