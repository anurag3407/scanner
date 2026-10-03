import { createClient, SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (clientInstance) return clientInstance;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  // Only a secret key is acceptable for the server-side Data Access Layer.
  // The publishable (anon) key is shipped to the browser and is constrained by
  // Row Level Security, so using it here would silently degrade every query to
  // an RLS-denied no-op instead of failing loudly.
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const supabaseKey =
    secretKey || process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY || undefined;

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) {
      console.error(
        "Supabase URL is configured but no SUPABASE_SECRET_KEY is set. " +
          "Falling back to the local JSON store. Do not use a publishable key here — " +
          "it is browser-exposed and blocked by Row Level Security."
      );
    }
    return null;
  }

  try {
    clientInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return clientInstance;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    return null;
  }
}
