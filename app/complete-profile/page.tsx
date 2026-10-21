import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CITY_COOKIE } from "@/lib/city";
import { isProfileComplete } from "@/lib/profileGate";
import AuthShell from "@/components/AuthShell";
import BrandHeader from "@/components/BrandHeader";
import TextField from "@/components/TextField";
import { PinIcon, UserIcon } from "@/components/icons";

/**
 * Profile-completion gate screen. Google sign-ins connect straight into
 * the app with an empty profile — Google never provides the display name
 * and city the email signup form collects — so the root layout sends any
 * signed-in user whose profile is missing either basic here, and only
 * here (plus the public/auth pages), until both are filled in.
 *
 * Signed-in users only: the proxy already redirects signed-out visitors
 * to /login (this route is not on its public list), and the check below
 * is the belt-and-braces twin of that rule.
 */
export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // The root layout already calls `connection()` before its own
  // Supabase load, which makes this page request-time rendered too;
  // repeat the signal here, before this page's own session/profile
  // reads, so the page never depends on layout ordering to stay out
  // of the prerender pass that trips over the session's Date.now().
  await connection();

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/complete-profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city")
    .eq("id", user.id)
    .maybeSingle();

  // Nothing to complete — back to the dashboard.
  if (isProfileComplete(profile)) redirect("/");

  // Prefill the name from wherever it might already exist: the profile
  // row first, then the auth metadata (Google provides full_name / name;
  // email signups store display_name — those profiles are complete and
  // never land here, but the lookup order costs nothing).
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metadataName = [metadata.display_name, metadata.full_name, metadata.name]
    .find((value): value is string => typeof value === "string" && !!value.trim());
  const prefillName = profile?.display_name?.trim()
    ? profile.display_name
    : (metadataName ?? "");
  const prefillCity = profile?.city ?? "";

  async function completeProfile(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const displayName = String(formData.get("display_name") ?? "").trim();
    // City is stored exactly as typed — Discover compares cities through
    // normalizeCityKey (accent/case/space-insensitive), so no cleanup is
    // needed here; only the non-blank validation looks at the trim.
    const city = String(formData.get("city") ?? "");

    const fail = (message: string): never =>
      redirect(`/complete-profile?error=${encodeURIComponent(message)}`);

    if (!displayName || !city.trim()) {
      fail("Add your display name and your city to continue.");
    }

    // RLS allows a user to update their own profile row, and the signup
    // trigger creates that row for every auth user (Google included), so
    // the update is the expected path. .select() tells us whether a row
    // was actually affected.
    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName, city })
      .eq("id", user.id)
      .select("id");
    if (updateError) {
      fail("We couldn't save your profile. Please try again.");
    }

    if (!updated || updated.length === 0) {
      // No row to update — should be impossible while the trigger exists.
      // Best-effort fallback: insert the row ourselves. Note profiles
      // has no client INSERT policy today (rows are trigger-created), so
      // RLS may refuse this; if it does, the user gets the honest error
      // below rather than a silent failure or a loop.
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user.id, display_name: displayName, city });
      if (insertError) {
        fail("We couldn't save your profile. Please try again.");
      }
    }

    // Persist the chosen city as the Discover selection too, mirroring
    // app/discover/set-city (same cookie, same options).
    const cookieStore = await cookies();
    cookieStore.set(CITY_COOKIE, city, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    redirect("/");
  }

  return (
    <AuthShell backHref="/">
      <div className="mt-2">
        <BrandHeader />
      </div>

      <h1 className="mt-9 text-4xl font-black text-ink">
        Complete your profile
      </h1>
      <p className="mt-2 font-semibold leading-relaxed text-muted">
        A couple of basics so people nearby can find your sessions.
      </p>

      {params.error && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral"
        >
          {params.error}
        </p>
      )}

      <form action={completeProfile} className="mt-8 space-y-4">
        <TextField
          label="Display name"
          name="display_name"
          required
          autoComplete="name"
          defaultValue={prefillName}
          icon={<UserIcon />}
        />
        <TextField
          label="City"
          name="city"
          required
          autoComplete="address-level2"
          placeholder="Montréal"
          defaultValue={prefillCity}
          icon={<PinIcon />}
        />
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-4 font-black text-white shadow-lg shadow-primary/25"
        >
          Save and continue
        </button>
      </form>

      {/* Escape hatch for a wrong-account sign-in: /auth/signout is a
          POST route handler, reachable regardless of the gate. */}
      <form action="/auth/signout" method="post" className="mt-9 text-center">
        <p className="font-semibold text-muted">
          Not you?{" "}
          <button type="submit" className="font-black text-primary">
            Log out
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
