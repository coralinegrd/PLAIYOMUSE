import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CITY_COOKIE, cleanCityName, normalizeCityKey } from "@/lib/city";
import {
  ONBOARDING_STEPS,
  firstIncompleteStep,
  loadOnboardingBasics,
  onboardingStepPath,
  type OnboardingStep,
} from "@/lib/profileGate";
import OnboardingShell from "@/components/OnboardingShell";
import TextField from "@/components/TextField";
import { PinIcon } from "@/components/icons";

const STEP: OnboardingStep = "city";
const STEP_INDEX = ONBOARDING_STEPS.indexOf(STEP);

/**
 * Onboarding step 2 of 3 — location (« Where do you want to play? »).
 * Manual entry only: the product has no GPS machinery and a settled
 * no-GPS rule, and this step must work for the first user in a city
 * with no sessions yet. Cities are free text reconciled by
 * normalizeCityKey, so validation is the platform's existing hygiene —
 * cleanCityName + non-blank + the 80-char cap Discover's set-city
 * route already applies. Suggestions come from cities that actually
 * exist in the data (upcoming sessions + member profiles).
 */
export default async function OnboardingCityPage({
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

  // Suggestion set: distinct cities from upcoming scheduled sessions
  // and from member profiles, deduplicated by comparison key, keeping
  // the first cleaned display form, sorted alphabetically.
  const now = new Date().toISOString();
  const [{ data: sessionCities }, { data: profileCities }] = await Promise.all([
    supabase
      .from("sessions")
      .select("city")
      .eq("status", "scheduled")
      .gte("starts_at", now)
      .limit(300),
    supabase.from("profiles").select("city").limit(500),
  ]);
  const byKey = new Map<string, string>();
  for (const row of [...(sessionCities ?? []), ...(profileCities ?? [])]) {
    const cleaned = cleanCityName(row.city ?? "");
    if (!cleaned) continue;
    const key = normalizeCityKey(cleaned);
    if (!byKey.has(key)) byKey.set(key, cleaned);
  }
  const suggestions = [...byKey.values()].sort((a, b) => a.localeCompare(b));

  async function saveCity(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const fail = (message: string): never =>
      redirect(`${onboardingStepPath(STEP)}?error=${encodeURIComponent(message)}`);

    const city = cleanCityName(String(formData.get("city") ?? "")).slice(0, 80);
    if (!city) {
      fail("Add your city to continue.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ city })
      .eq("id", user.id);
    if (error) {
      fail("We couldn't save your city. Please try again.");
    }

    // Persist the choice as the Discover selection too, mirroring
    // app/discover/set-city (same cookie, same options): Discover
    // resolves URL > cookie > profile city, and both now agree.
    const cookieStore = await cookies();
    cookieStore.set(CITY_COOKIE, city, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    const next = firstIncompleteStep(
      await loadOnboardingBasics(supabase, user.id),
    );
    redirect(next ? onboardingStepPath(next) : "/");
  }

  return (
    <OnboardingShell
      backHref={onboardingStepPath("name")}
      step={2}
      heading="Where do you want to play?"
      subcopy="We'll help you find games and people near you."
    >
      {params.error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral"
        >
          {params.error}
        </p>
      )}

      <form action={saveCity} className="mt-8 space-y-4">
        <TextField
          label="City"
          name="city"
          required
          autoComplete="address-level2"
          placeholder="Montréal"
          defaultValue={basics.city ?? ""}
          list="onboarding-city-suggestions"
          icon={<PinIcon />}
        />
        <datalist id="onboarding-city-suggestions">
          {suggestions.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
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
