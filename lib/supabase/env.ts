/**
 * Whether a Supabase client can be constructed in this environment.
 *
 * The two public vars are the only ones the request path needs. Vercel
 * scopes env vars per environment: if they were added as
 * Production-only, Preview deployments have neither, and
 * createServerClient() throws ("Your project's URL and Key are required
 * to create a Supabase client!") from the proxy on every request —
 * before any page renders — so the deployment serves a plain 500 on
 * every route even though the build itself passes.
 *
 * Callers must treat a missing env as "no session can be verified":
 * public routes render logged-out, protected routes stay closed
 * (redirect to /login). Never treat it as "skip auth".
 */
export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
