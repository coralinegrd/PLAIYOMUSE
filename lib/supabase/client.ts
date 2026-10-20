import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for Client Components (browser).
 * Uses only the public anon key — Row Level Security in the database is
 * what protects the data, never the secrecy of this key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
