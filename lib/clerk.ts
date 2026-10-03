/**
 * Clerk is only activated when both a publishable key and a secret key are
 * present. Without keys the public diner experience keeps working and the admin
 * console shows a setup notice instead of crashing the whole application.
 *
 * Values are trimmed and required to look like real Clerk keys. A variable set
 * to whitespace only (`"   "`, `"\n"`) is truthy, so a bare truthiness check
 * would treat a misconfigured deployment as configured — sending admin traffic
 * down the Clerk code path where it fails with an opaque 500 instead of the
 * actionable 503 this module is meant to produce.
 */
export function isClerkConfigured(): boolean {
  const publishableKey = (
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || ""
  ).trim();
  const secretKey = (process.env.CLERK_SECRET_KEY || "").trim();

  return (
    publishableKey.length > 0 &&
    secretKey.length > 0 &&
    publishableKey.startsWith("pk_") &&
    secretKey.startsWith("sk_")
  );
}
