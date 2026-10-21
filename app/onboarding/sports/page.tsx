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

const STEP: OnboardingStep = "sports";
const STEP_INDEX = ONBOARDING_STEPS.indexOf(STEP);

/**
 * Onboarding step 3 of 3 — sports preferences (« What sports are you
 * into? »), and the end of the funnel: a successful save makes the
 * derived completion predicate true, so the user lands directly on
 * Discover (no congratulations interstitial, no completion flag to
 * mark — completion IS the persisted data). Discover already
 * preselects the city saved in step 2, and the chosen sports are NOT
 * applied there as a hidden filter.
 *
 * The options are the real taxonomy (all sports, grouped by category),
 * using the same checkbox-chip pattern and replace-semantics save as
 * /profile/edit. Completing requires at least one sport; there is no
 * maximum. No per-sport level is asked: user_sports.level is read by
 * nothing in the product today (see the onboarding audit, §4.6), so
 * inserts omit it and the column default applies.
 */
export default async function OnboardingSportsPage({
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

  const { data: allSports } = await supabase
    .from("sports")
    .select("id, name, category")
    .order("category")
    .order("name");

  const { data: mySports } = await supabase
    .from("user_sports")
    .select("sport_id")
    .eq("profile_id", user.id);
  const selectedIds = new Set((mySports ?? []).map((s) => s.sport_id));

  // Group by category, preserving the query's category/name order.
  const categories: { name: string; sports: { id: string; name: string }[] }[] =
    [];
  for (const sport of allSports ?? []) {
    let group = categories.find((c) => c.name === sport.category);
    if (!group) {
      group = { name: sport.category, sports: [] };
      categories.push(group);
    }
    group.sports.push({ id: sport.id, name: sport.name });
  }

  async function saveSports(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const fail = (message: string): never =>
      redirect(`${onboardingStepPath(STEP)}?error=${encodeURIComponent(message)}`);

    const selected = formData.getAll("sport_ids").map(String);
    if (selected.length < 1) {
      fail("Pick at least one sport to continue.");
    }

    // Replace semantics, mirroring /profile/edit: the submitted set
    // becomes the whole set, so re-saving after going back, deselecting
    // and retrying after a failure all converge. If the insert fails,
    // the user is simply still incomplete at this step (completion is
    // derived) and sees the error — never falsely complete.
    const { error: deleteError } = await supabase
      .from("user_sports")
      .delete()
      .eq("profile_id", user.id);
    if (deleteError) {
      fail("We couldn't save your sports. Please try again.");
    }
    const { error: insertError } = await supabase.from("user_sports").insert(
      selected.map((sportId) => ({
        profile_id: user.id,
        sport_id: sportId,
      })),
    );
    if (insertError) {
      fail("We couldn't save your sports. Please try again.");
    }

    // Onboarding is complete the moment this save lands (the predicate
    // is derived) — straight to Discover, city already preselected.
    redirect("/discover");
  }

  return (
    <OnboardingShell
      backHref={onboardingStepPath("city")}
      step={3}
      heading="What sports are you into?"
      subcopy="Pick your favorites. You can always change them later."
    >
      {params.error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral"
        >
          {params.error}
        </p>
      )}

      <form action={saveSports} className="mt-8">
        <div className="space-y-6">
          {categories.map((category) => (
            <fieldset key={category.name}>
              <legend className="text-xs font-black uppercase tracking-widest text-primary">
                {category.name}
              </legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {category.sports.map((sport) => (
                  <label
                    key={sport.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm font-bold text-ink has-checked:border-primary has-checked:bg-primary has-checked:text-white"
                  >
                    <input
                      type="checkbox"
                      name="sport_ids"
                      value={sport.id}
                      defaultChecked={selectedIds.has(sport.id)}
                      className="sr-only"
                    />
                    {sport.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <button
          type="submit"
          className="mt-8 w-full rounded-full bg-primary py-4 font-black text-white shadow-lg shadow-primary/25"
        >
          Let&rsquo;s play
        </button>
      </form>
    </OnboardingShell>
  );
}
