/**
 * Origin / Sec-Fetch-Site verification for cookie-authenticated mutations.
 *
 * Clerk authenticates the console with a cookie, so any browser will attach it
 * to a cross-site request automatically. The mutating admin routes are guarded
 * by method-specific authz, but a same-site attacker page could still try to
 * ride the victim's session.
 *
 * This check is defense-in-depth layered on top of the existing gates:
 *   - requests with NO Origin header at all are allowed, because non-browser
 *     clients (curl, server-to-server, the test suite) legitimately omit it;
 *   - a present Origin must match the request's own host, which a cross-site
 *     page cannot forge (browsers set Origin on every cross-origin request).
 *   - `Sec-Fetch-Site`, when present, must not say the request is cross-site.
 *     This is checked FIRST and independently: it is set by the browser and
 *     cannot be overridden by page JavaScript, so it is the one signal here an
 *     attacker genuinely cannot control.
 */
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  // `Sec-Fetch-Site` is set by the browser and cannot be spoofed by page JS.
  // Checked before anything attacker-influenced so it can never be overridden.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false; // Malformed Origin header -> refuse.
  }

  const url = new URL(req.url);
  const candidates = new Set<string>([url.host.toLowerCase()]);

  // NOTE: `x-forwarded-host` is deliberately NOT trusted here. It is an
  // ordinary request header: any client can set it to its own domain, which
  // made `Origin: https://evil.example` match and let a cross-site mutation
  // through as "same-origin". Only a deployment behind a proxy that overwrites
  // the header could make it meaningful, and that is better expressed with
  // `CSRF_TRUSTED_HOSTS` (an explicit allowlist) than by trusting a header the
  // caller controls.
  const trusted = (process.env.CSRF_TRUSTED_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const host of trusted) candidates.add(host);

  return candidates.has(originHost);
}
