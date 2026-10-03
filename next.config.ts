import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not advertise the framework and version to every visitor.
  poweredByHeader: false,

  // Baseline hardening headers.
  //
  // The CSP is intentionally strict but must still permit what the app
  // genuinely uses: Clerk's hosted sign-in iframe/script, Supabase calls from
  // the browser, Google Fonts (next/font self-hosts, so no font origin needed)
  // and inline styles React emits for dynamic values such as brand colors.
  // `unsafe-inline` on styles is required by Tailwind's runtime style objects;
  // scripts stay locked to same-origin, which is what stops injected markup
  // from executing even if HTML injection is ever introduced.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Permissions-Policy",
            // The diner flow uses the clipboard to copy the drafted review.
            value: "camera=(), microphone=(), geolocation=(), clipboard-write=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Clerk injects its widget/iframe for the sign-in page.
              "script-src 'self' https://clerk.com",
              "frame-src 'self' https://clerk.com https://accounts.google.com",
              "connect-src 'self' https://clerk.com https://*.clerk.accounts.dev https://*.supabase.co",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "style-src 'self' 'unsafe-inline'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
