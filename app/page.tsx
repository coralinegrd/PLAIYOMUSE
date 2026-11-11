import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParticipationCounts } from "@/lib/sessionCounts";
import SessionCard, { type SessionListItem } from "@/components/SessionCard";
import { BellIcon, PlusIcon } from "@/components/icons";
import { UsersIcon } from "@/components/icons";
import PublicLanding from "@/components/PublicLanding";

export const metadata: Metadata = {
  title: "Plaiyo — Trouve des partenaires de sport à Montréal",
  description:
    "Plaiyo rassemble les sportifs près de chez toi : trouve une session, rejoins ton groupe, joue. Lancement à Montréal.",
};

type NearbyCrew = {
  id: string;
  name: string;
  sports: { name: string } | null;
  crew_members: { count: number }[] | null;
};

// No participations embed here: RLS hides other users' rows, so occupancy
// comes from the aggregate counts view (see lib/sessionCounts.ts).
const SESSION_SELECT =
  "id, title, starts_at, location, city, capacity, is_paid, price_cents, currency, skill_level, average_pace, distance_value, distance_unit, sports(name, photo_url), profiles!sessions_host_id_fkey(display_name)";

export default async function HomePage() {
  // Request-time render: this page loads the Supabase session in its own
  // body, and the layout's connection() doesn't shield page-level reads
  // from the Cache Components prerender pass — see app/layout.tsx.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Public landing page: visible without login (see
    // components/PublicLanding.tsx). French by default.
    return <PublicLanding />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city")
    .eq("id", user.id)
    .single();

  const firstName = (profile?.display_name || "there").split(" ")[0];
  // Greeting follows the user's day, not the server's: Plaiyo's users are
  // in the America/Toronto timezone (the same zone Discover uses for its
  // Today/This week bounds).
  const torontoHour = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  const greeting =
    torontoHour < 12
      ? "Good morning"
      : torontoHour < 18
        ? "Good afternoon"
        : "Good evening";
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

  // "Crews nearby": up to 3 crews in my city, newest first (or the newest
  // overall when I have no city set). Member counts are honest: the
  // crew_members SELECT policy is readable by all authenticated users,
  // so the (count) embed counts every member — same approach as /crews.
  let crewsQuery = supabase
    .from("crews")
    .select("id, name, sports(name), crew_members(count)")
    .order("created_at", { ascending: false })
    .limit(3);
  if (city) crewsQuery = crewsQuery.eq("city", city);
  const { data: crewsNearby } = await crewsQuery;
  const nearbyCrews = (crewsNearby ?? []) as unknown as NearbyCrew[];

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between">
        <h1 className="text-3xl font-black leading-tight text-ink">
          {greeting},
          <br />
          {firstName}
        </h1>
        <span
          aria-label="Notifications"
          className="rounded-full border border-border bg-white p-2.5 text-primary"
        >
          <BellIcon className="h-6 w-6" />
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
            No nearby games yet.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-primary">
            Crews nearby
          </h2>
          <Link href="/crews" className="text-sm font-bold text-primary">
            See all
          </Link>
        </div>
        {nearbyCrews.length > 0 ? (
          <div className="space-y-3">
            {nearbyCrews.map((crew) => (
              <Link
                key={crew.id}
                href="/crews"
                className="flex items-center gap-3 rounded-3xl border border-border bg-white p-4"
              >
                <span className="rounded-2xl bg-soft p-3 text-primary">
                  <UsersIcon />
                </span>
                <span>
                  <span className="block font-black text-ink">{crew.name}</span>
                  <span className="block text-sm font-semibold text-muted">
                    {crew.sports?.name ?? "All sports"} ·{" "}
                    {crew.crew_members?.[0]?.count ?? 0} members
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-border bg-white p-4 font-semibold text-muted">
            No crews nearby yet.{" "}
            <Link href="/crews" className="font-bold text-primary">
              Explore crews
            </Link>
          </p>
        )}
      </section>

      {/* Floating create action, as on Coraline's reference home: a blue
          + circle above the bottom navigation, right-aligned to the app
          column (the column is max-w-md centered, so on wide screens the
          offset follows its right edge instead of the viewport's). */}
      <Link
        href="/sessions/new"
        aria-label="Create a session"
        className="fixed bottom-24 right-[max(1rem,calc(50%-13rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30"
      >
        <PlusIcon className="h-7 w-7" />
      </Link>
    </div>
  );
}
