import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  firstIncompleteStep,
  loadOnboardingBasics,
  onboardingStepPath,
} from "@/lib/profileGate";

/**
 * Redirect stub. /complete-profile was the single-screen completion
 * form until the 2026-10-20 onboarding redesign split it into the
 * three-step funnel under /onboarding (name → city → sports). The
 * route stays alive so bookmarks, old links and in-flight sessions
 * land in the new funnel instead of 404ing:
 *
 *   no user   → /login (the proxy already enforces this; belt-and-braces)
 *   complete  → /
 *   incomplete → the account's first incomplete onboarding step
 *
 * It stays in the gate's exempt prefixes so the stub itself can render.
 */
export default async function CompleteProfilePage() {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/complete-profile");

  const step = firstIncompleteStep(
    await loadOnboardingBasics(supabase, user.id),
  );
  if (step === null) redirect("/");
  redirect(onboardingStepPath(step));
}
