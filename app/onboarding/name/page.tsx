import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ONBOARDING_STEPS,
  firstIncompleteStep,
  loadOnboardingBasics,
  onboardingStepPath,
  type OnboardingStep,
} from "@/lib/profileGate";
import OnboardingShell from "@/components/OnboardingShell";
import TextField from "@/components/TextField";
import { UserIcon } from "@/components/icons";

const STEP: OnboardingStep = "name";
const STEP_INDEX = ONBOARDING_STEPS.indexOf(STEP);

/**
 * Onboarding step 1 of 3 — personal details (« What should we call
 * you? »). The schema has a single name field (profiles.display_name),
 * so the First/Last inputs are stored joined into it — which is also
 * how the rest of the app consumes the name (the Home greeting splits
 * on the first space). No date of birth, no gender: nothing in the
 * product reads either (see the onboarding audit, §4.1–4.2).
 *
 * Guard (shared by every step): the funnel position is derived from
 * stored data, never stored itself — an earlier incomplete step wins,
 * a complete account leaves for the app, and navigating back to fix an
 * earlier answer renders prefilled.
 */
export default async function OnboardingNamePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${onboardingStepPath(STEP)}`);

  const basics = await loadOnboardingBasics(supabase, user.id);
  const first = firstIncompleteStep(basics);
  if (first === null) redirect("/");
  if (ONBOARDING_STEPS.indexOf(first) < STEP_INDEX) {
    redirect(onboardingStepPath(first));
  }

  // Prefill: the stored profile name first, then the auth metadata
  // chain (Google provides full_name / name). Split on the first space
  // into the two inputs.
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = [metadata.display_name, metadata.full_name, metadata.name]
    .find((value): value is string => typeof value === "string" && !!value.trim());
  const storedName = basics.displayName?.trim()
    ? basics.displayName.trim()
    : (metadataName ?? "");
  const splitAt = storedName.indexOf(" ");
  const prefillFirst = splitAt === -1 ? storedName : storedName.slice(0, splitAt);
  const prefillLast = splitAt === -1 ? "" : storedName.slice(splitAt + 1).trim();

  async function saveName(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const fail = (message: string): never =>
      redirect(`${onboardingStepPath(STEP)}?error=${encodeURIComponent(message)}`);

    const firstName = String(formData.get("first_name") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const lastName = String(formData.get("last_name") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (!firstName) {
      fail("Add your first name to continue.");
    }
    const displayName = [firstName, lastName].filter(Boolean).join(" ");

    // UPDATE-only: the signup trigger guarantees the profile row exists
    // and RLS permits updating one's own row; there is deliberately no
    // client INSERT path on profiles.
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    if (error) {
      fail("We couldn't save your name. Please try again.");
    }

    // Land on the first step still incomplete after this save — not
    // blindly on the next one — so partial or out-of-order data always
    // routes correctly.
    const next = firstIncompleteStep(
      await loadOnboardingBasics(supabase, user.id),
    );
    redirect(next ? onboardingStepPath(next) : "/");
  }

  return (
    <OnboardingShell backHref="/" step={1} heading="What should we call you?">
      {params.error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral"
        >
          {params.error}
        </p>
      )}

      <form action={saveName} className="mt-8 space-y-4">
        <TextField
          label="First name"
          name="first_name"
          required
          autoComplete="given-name"
          defaultValue={prefillFirst}
          icon={<UserIcon />}
        />
        <TextField
          label="Last name"
          name="last_name"
          autoComplete="family-name"
          defaultValue={prefillLast}
          icon={<UserIcon />}
        />
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-4 font-black text-white shadow-lg shadow-primary/25"
        >
          Continue
        </button>
      </form>
    </OnboardingShell>
  );
}
