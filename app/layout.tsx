import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono, Anton } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/clerk";
import "./globals.css";

// Neo-brutalism base family: geometric, quirky, heavy-capable.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Ultra-heavy poster face for the biggest display headlines.
const anton = Anton({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewBoost | Turn Table Diners into 5-Star Google Reviews in 10s",
  description:
    "AI pre-drafted reviews, interactive feature chips, 1-tap Google hand-off, and intelligent reputation firewall for restaurants and retail.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${anton.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {isClerkConfigured() ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
