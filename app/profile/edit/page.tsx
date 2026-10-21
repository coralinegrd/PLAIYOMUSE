import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGender } from "@/lib/profileGate";
import GenderField from "@/components/GenderField";
import { ArrowLeftIcon } from "@/components/icons";

/**
 * Edit profile — the form that used to live inline on /profile, moved to
 * its own page when the hub was rebuilt to Coraline's reference layout.
 * The hub links here from the gear, the avatar badge and the
 * « Modify my account » row. Save behaviour is unchanged: profile fields
 * update, the sport selection is replaced wholesale, and the city field
 * stays the profile city that Discover and the gate rely on.
 */
export default async function EditProfilePage() {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city, neighbourhood, bio, gender")
    .eq("id", user.id)
    .single();

  const { data: mySports } = await supabase
    .from("user_sports")
    .select("sports(id)")
    .eq("profile_id", user.id);

  const { data: allSports } = await supabase
    .from("sports")
    .select("id, name, category")
    .order("category")
    .order("name");

  async function saveProfile(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Gender rides along with the rest of the form. The selector
    // always renders with the current value selected, so a normal save
    // keeps it; the isGender guard also means a save can never write
    // an out-of-set value or null the column out.
    const gender = String(formData.get("gender") ?? "");
    await supabase
      .from("profiles")
      .update({
        display_name: String(formData.get("display_name") ?? ""),
        city: String(formData.get("city") ?? ""),
        neighbourhood: String(formData.get("neighbourhood") ?? ""),
        bio: String(formData.get("bio") ?? ""),
        ...(isGender(gender) ? { gender } : {}),
      })
      .eq("id", user.id);

    // Replace the user's sport selections with the submitted set.
    const selected = formData.getAll("sport_ids").map(String);
    await supabase.from("user_sports").delete().eq("profile_id", user.id);
    if (selected.length > 0) {
      await supabase.from("user_sports").insert(
        selected.map((sportId) => ({
          profile_id: user.id,
          sport_id: sportId,
          level: "intermediate",
        })),
      );
    }
    redirect("/profile?saved=1");
  }

  const selectedIds = new Set(
    (mySports ?? []).map((s) => (s.sports as unknown as { id: string })?.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 font-black text-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Profile
        </Link>
        <h1 className="mt-3 text-3xl font-black text-ink">Modify my account</h1>
      </div>

      <form
        action={saveProfile}
        className="space-y-3 rounded-3xl border border-border bg-white p-5"
      >
        <label className="block">
          <span className="text-sm font-bold text-muted">Display name</span>
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ""}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2.5 font-semibold outline-none focus:border-primary"
          />
        </label>
        <div className="flex gap-3">
          <label className="block flex-1">
            <span className="text-sm font-bold text-muted">City</span>
            <input
              name="city"
              defaultValue={profile?.city ?? ""}
              placeholder="Montréal"
              className="mt-1 w-full rounded-2xl border border-border px-3 py-2.5 font-semibold outline-none focus:border-primary"
            />
          </label>
          <label className="block flex-1">
            <span className="text-sm font-bold text-muted">Neighbourhood</span>
            <input
              name="neighbourhood"
              defaultValue={profile?.neighbourhood ?? ""}
              className="mt-1 w-full rounded-2xl border border-border px-3 py-2.5 font-semibold outline-none focus:border-primary"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-bold text-muted">Bio</span>
          <textarea
            name="bio"
            defaultValue={profile?.bio ?? ""}
            rows={3}
            className="mt-1 w-full rounded-2xl border border-border px-3 py-2.5 font-semibold outline-none focus:border-primary"
          />
        </label>
        <GenderField
          label="Gender"
          variant="card"
          defaultValue={profile?.gender}
        />
        <fieldset>
          <legend className="text-sm font-bold text-muted">My sports</legend>
          <div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
            {(allSports ?? []).map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-bold text-ink has-checked:bg-primary has-checked:text-white"
              >
                <input
                  type="checkbox"
                  name="sport_ids"
                  value={s.id}
                  defaultChecked={selectedIds.has(s.id)}
                  className="sr-only"
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-3 font-black text-white"
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
