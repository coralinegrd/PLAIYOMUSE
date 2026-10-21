import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city, neighbourhood, bio, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: mySports } = await supabase
    .from("user_sports")
    .select("level, sports(id, name, photo_url)")
    .eq("profile_id", user.id);

  const { data: allSports } = await supabase
    .from("sports")
    .select("id, name, category")
    .order("category")
    .order("name");

  const { data: hosted } = await supabase
    .from("sessions")
    .select("id, title, starts_at")
    .eq("host_id", user.id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);

  async function saveProfile(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    await supabase
      .from("profiles")
      .update({
        display_name: String(formData.get("display_name") ?? ""),
        city: String(formData.get("city") ?? ""),
        neighbourhood: String(formData.get("neighbourhood") ?? ""),
        bio: String(formData.get("bio") ?? ""),
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
      <header className="rounded-3xl bg-navy p-6 text-center text-warm-white">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-black text-white">
            {(profile?.display_name || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="mt-3 text-2xl font-black">
          {profile?.display_name || "Your profile"}
        </h1>
        <p className="font-semibold text-warm-white/75">
          {[profile?.city, profile?.neighbourhood]
            .filter(Boolean)
            .join(" · ") || "Set your city below"}
        </p>
      </header>

      {params.saved && (
        <p className="rounded-full bg-lime/25 px-4 py-2 text-center text-sm font-bold text-ink">
          Profile saved.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-primary">
          My sports
        </h2>
        {(mySports ?? []).length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {(mySports ?? []).map((s) => {
              const sport = s.sports as unknown as {
                id: string;
                name: string;
                photo_url: string | null;
              } | null;
              if (!sport) return null;
              return (
                <li
                  key={sport.id}
                  className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pr-3 pl-1 text-sm font-bold text-ink"
                >
                  {sport.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sport.photo_url}
                      alt=""
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[10px] font-black text-warm-white">
                      {sport.name.slice(0, 1)}
                    </span>
                  )}
                  {sport.name}
                  <span className="text-muted capitalize">· {s.level}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="font-semibold text-muted">
            No sports selected yet — add yours below.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-primary">
          Hosting
        </h2>
        {(hosted ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(hosted ?? []).map((s) => (
              <li
                key={s.id}
                className="rounded-3xl border border-border bg-white p-4 font-bold text-ink"
              >
                {s.title}
                <span className="block text-sm font-semibold text-muted">
                  {new Date(s.starts_at).toLocaleString("en-CA")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-semibold text-muted">
            You are not hosting any upcoming session.
          </p>
        )}
      </section>

      <form
        action={saveProfile}
        className="space-y-3 rounded-3xl border border-border bg-white p-5"
      >
        <h2 className="font-black text-ink">Edit profile</h2>
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

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full rounded-full border border-border bg-white py-3 font-black text-ink"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
