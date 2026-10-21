import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Profile-completion gate + onboarding state.
 *
 * Every account must finish a three-step onboarding before it can use
 * the app: a display name and a gender (step 1), a city (step 2), and
 * at least one sport (step 3). "Complete" is DERIVED from the stored
 * data — never from a stored flag — so the gate, the step-resume logic
 * and the step pages all run the same computation and can never
 * disagree:
 *
 *   firstIncompleteStep(basics) — the step the user must do next
 *   isProfileComplete(basics)  — firstIncompleteStep(basics) === null
 *
 * Google sign-ins arrive with an empty profile (Google never provides
 * the name/city the product needs, and no sports), and email signups
 * now collect nothing up front either — both funnels enter onboarding
 * at their first incomplete step. The root layout checks the signed-in
 * user's state on every render and redirects incomplete profiles to
 * that step; each step page re-runs the same derivation as its guard.
 */

/**
 * Request header the proxy stamps with the current pathname
 * (lib/supabase/middleware.ts), so Server Components — which otherwise
 * don't know the URL being rendered — can apply the gate's exemptions.
 */
export const PATHNAME_HEADER = "x-pathname";

/** The three onboarding steps, in funnel order. */
export const ONBOARDING_STEPS = ["name", "city", "sports"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function onboardingStepPath(step: OnboardingStep): string {
  return `/onboarding/${step}`;
}

/**
 * The allowed gender values — the profiles.gender CHECK constraint in
 * SQL form. Gender is collected for exactly one product rule (decision
 * 2026-10-21): men cannot join women-only sessions, enforced in the
 * join action and by the enforce_women_only_eligibility DB trigger.
 * It is never displayed publicly.
 */
export const GENDERS = ["man", "woman", "non_binary"] as const;
export type Gender = (typeof GENDERS)[number];

export function isGender(value: unknown): value is Gender {
  return (
    typeof value === "string" &&
    (GENDERS as readonly string[]).includes(value)
  );
}

/** The onboarding state of one account, derived from stored data. */
export type OnboardingBasics = {
  displayName?: string | null;
  gender?: string | null;
  city?: string | null;
  sportsCount: number;
};

/**
 * The first step the account has not finished, or null when onboarding
 * is complete. The name/city columns are `not null default ''`, so
 * "unset" arrives as an empty string, never as SQL NULL — but OAuth
 * metadata edge cases are cheap to guard against. Gender is different:
 * a nullable column, NULL until the user picks one on the name step.
 */
export function firstIncompleteStep(
  basics: OnboardingBasics,
): OnboardingStep | null {
  if (!basics.displayName?.trim() || !isGender(basics.gender)) return "name";
  if (!basics.city?.trim()) return "city";
  if (basics.sportsCount < 1) return "sports";
  return null;
}

/** Complete = no incomplete step remains. */
export function isProfileComplete(basics: OnboardingBasics): boolean {
  return firstIncompleteStep(basics) === null;
}

/**
 * Loads the onboarding state for one user in a single round trip: the
 * profile row plus the count of its user_sports rows (PostgREST
 * relationship embed on the user_sports.profile_id → profiles.id FK).
 * Falls back to a head-count query if the embed ever comes back
 * without a count, so callers always get a real number.
 */
export async function loadOnboardingBasics(
  supabase: SupabaseClient,
  userId: string,
): Promise<OnboardingBasics> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city, gender, user_sports(count)")
    .eq("id", userId)
    .maybeSingle();

  const row = profile as {
    display_name?: string | null;
    city?: string | null;
    gender?: string | null;
    user_sports?: { count?: number }[];
  } | null;

  let sportsCount: number | null = null;
  if (Array.isArray(row?.user_sports)) {
    const count = row.user_sports[0]?.count;
    if (typeof count === "number") sportsCount = count;
  }
  if (sportsCount === null) {
    const { count } = await supabase
      .from("user_sports")
      .select("sport_id", { count: "exact", head: true })
      .eq("profile_id", userId);
    sportsCount = count ?? 0;
  }

  return {
    displayName: row?.display_name ?? "",
    gender: row?.gender ?? null,
    city: row?.city ?? "",
    sportsCount,
  };
}

/**
 * Paths a signed-in user with an incomplete profile may still render:
 * the onboarding funnel itself, the /complete-profile redirect stub,
 * the auth route handlers' namespace, and the public/auth pages (their
 * logged-out behaviour is untouched either way; a signed-in user
 * landing on them is never trapped by the gate). Everything else —
 * /, /discover, /crews, /messages, /profile, /sessions/* — is an app
 * route and stays gated until onboarding is complete.
 */
const GATE_EXEMPT_PREFIXES = [
  "/onboarding",
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
