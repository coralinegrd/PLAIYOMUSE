import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getParticipationCounts } from "@/lib/sessionCounts";
import SessionCard, { type SessionListItem } from "@/components/SessionCard";

// No participations embed here: RLS hides other users' rows, so occupancy
// comes from the aggregate counts view (see lib/sessionCounts.ts).
const SESSION_SELECT =
  "id, title, starts_at, location, city, capacity, is_paid, price_cents, currency, skill_level, average_pace, distance_value, distance_unit, sports(name, photo_url), profiles!sessions_host_id_fkey(display_name)";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6 pt-10">
        <div className="rounded-3xl bg-navy p-6 text-warm-white">
          <p className="text-3xl font-black leading-tight">
            Find people to play sports with, near you.
          </p>
          <p className="mt-3 font-semibold text-warm-white/80">
            Join local sessions or host your own: running, padel, tennis,
            yoga and 70+ other sports.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="flex-1 rounded-full bg-primary py-3 text-center font-black text-white"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="flex-1 rounded-full border border-border bg-white py-3 text-center font-black text-ink"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city")
    .eq("id", user.id)
    .single();

  const firstName = (profile?.display_name || "there").split(" ")[0];
  const city = profile?.city ?? "";
  const now = new Date().toISOString();

  // My next session: merge the sessions I host and the ones I joined,
  // keep the soonest upcoming one. Real data only.
  const [{ data: hosted }, { data: joined }] = await Promise.all([
    supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .eq("host_id", user.id)
      .eq("status", "scheduled")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase
      .from("participations")
      .select(`sessions(${SESSION_SELECT})`)
      .eq("user_id", user.id)
      .limit(20),
  ]);

  const mine = [
    ...((hosted ?? []) as unknown as SessionListItem[]),
    ...((joined ?? [])
      .map((p) => p.sessions as unknown as SessionListItem | null)
      .filter((s): s is SessionListItem => !!s && s.starts_at >= now) ?? []),
  ].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const nextSession = mine[0] ?? null;

  // "Happening near you": other people's sessions in my city.
  // Rule from Coraline (2026-10-20): my own sessions never appear here.
  let nearbyQuery = supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("status", "scheduled")
    .neq("host_id", user.id)
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(10);
  if (city) nearbyQuery = nearbyQuery.eq("city", city);
  const { data: nearby } = await nearbyQuery;
  const nearbySessions = (nearby ?? []) as unknown as SessionListItem[];

  // Attach real occupancy counts to the cards we are about to render.
  const counts = await getParticipationCounts(supabase, [
    ...(nextSession ? [nextSession.id] : []),
    ...nearbySessions.map((s) => s.id),
  ]);
  const withCounts = (s: SessionListItem): SessionListItem => ({
    ...s,
    confirmed_count: counts.get(s.id)?.confirmed_count ?? 0,
  });
  const nextWithCounts = nextSession ? withCounts(nextSession) : null;
  const nearbyWithCounts = nearbySessions.map(withCounts);

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between">
        <h1 className="text-3xl font-black leading-tight text-ink">
          Good afternoon,
          <br />
          {firstName}
        </h1>
        <span
          aria-label="Notifications"
          className="rounded-full border border-border bg-white p-2.5 text-primary"
        >
          🔔
        </span>
      </header>

      <p className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-sm font-bold text-primary">
        <span className="h-2 w-2 rounded-full bg-lime" />
        {nextSession ? "You have a session coming up" : "No sessions today"}
      </p>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-primary">
          Next game
        </h2>
        {nextWithCounts ? (
          <SessionCard session={nextWithCounts} />
        ) : (
          <div className="rounded-3xl bg-navy p-6 text-warm-white">
            <p className="text-2xl font-black leading-snug">
              Launch your next outing.
            </p>
            <p className="mt-2 font-semibold text-warm-white/80">
              Choose your sport, time and place. Plaiyo brings the right
              people together.
            </p>
            <Link
              href="/sessions/new"
              className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 font-black text-white"
            >
              Create a session
            </Link>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">
            Happening near you
          </h2>
          <Link href="/discover" className="text-sm font-bold text-primary">
            See all
          </Link>
        </div>
        {nearbyWithCounts.length > 0 ? (
          <div className="space-y-3">
            {nearbyWithCounts.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-border bg-white p-4 font-semibold text-muted">
            No nearby games yet. Try widening your distance in settings.
          </p>
        )}
      </section>
    </div>
  );
}
