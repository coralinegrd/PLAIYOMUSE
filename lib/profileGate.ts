/**
 * Profile-completion gate.
 *
 * Every account needs the two basics the email signup form collects —
 * a display name and a city — before it can use the app. Email signups
 * provide them up front (they travel in the auth metadata and the signup
 * trigger copies them into the profile row), but Google sign-ins never
 * do: the account connects straight in with an EMPTY profile. The root
 * layout therefore checks the signed-in user's profile on every render
 * and redirects incomplete profiles to /complete-profile.
 */

/**
 * Request header the proxy stamps with the current pathname
 * (lib/supabase/middleware.ts), so Server Components — which otherwise
 * don't know the URL being rendered — can apply the gate's exemptions.
 */
export const PATHNAME_HEADER = "x-pathname";

/** The slice of the profiles row the gate cares about. */
export type ProfileBasics = {
  display_name?: string | null;
  city?: string | null;
} | null | undefined;

/**
 * Complete = both basics present and non-blank. The profiles columns are
 * `not null default ''`, so "unset" arrives as an empty string, never as
 * SQL NULL — but OAuth metadata edge cases are cheap to guard against.
 */
export function isProfileComplete(profile: ProfileBasics): boolean {
  return Boolean(profile?.display_name?.trim()) && Boolean(profile?.city?.trim());
}

/**
 * Paths a signed-in user with an incomplete profile may still render:
 * the completion page itself, the auth route handlers' namespace, and
 * the public/auth pages (their logged-out behaviour is untouched either
 * way; a signed-in user landing on them is never trapped by the gate).
 * Everything else — /, /discover, /crews, /messages, /profile,
 * /sessions/* — is an app route and stays gated until completion.
 */
const GATE_EXEMPT_PREFIXES = [
  "/complete-profile",
  "/auth",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
];

export function isGateExemptPath(pathname: string): boolean {
  return GATE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
