/**
 * Clerk is only activated when both a publishable key and a secret key are
 * present. Without keys the public diner experience keeps working and the admin
 * console shows a setup notice instead of crashing the whole application.
 */
export function isClerkConfigured(): boolean {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;
  return Boolean(publishableKey && secretKey);
}
