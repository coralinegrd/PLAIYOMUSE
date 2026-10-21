import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParticipationCounts } from "@/lib/sessionCounts";
import SessionCard, { type SessionListItem } from "@/components/SessionCard";

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
    // Logged-out landing, following Coraline's reference screen.
    // Mobile: full-bleed navy hero (abstract lime + Electric Blue curved
    // shapes, official lockup) with a white card overlapping the bottom.
    // Desktop (lg+): a genuine split — navy brand panel on the left, the
    // card content left-aligned on a light panel on the right.
    // The official lockup PNG (public/logo-lockup.png, used as-is) has a
    // Midnight Blue #0B2340 background — sampled from the file itself —
    // so the hero uses bg-midnight and the artwork blends in seamlessly.
    // Desktop uses Coraline's newer official artwork instead
    // (public/logo-desktop.png): white figure + wordmark on transparency,
    // cropped to its alpha bounding box, designed for this dark panel.
    // The wrapper breaks out of the layout's max-w-md column to span the
    // full viewport (relative + left-1/2 + w-screen + -translate-x-1/2,
    // with -mt-6/-mb-24 cancelling the layout's vertical padding).
    return (
      <div className="relative left-1/2 -mb-24 -mt-6 flex min-h-dvh w-screen -translate-x-1/2 flex-col bg-midnight lg:grid lg:grid-cols-2">
        <section className="relative flex min-h-[54dvh] items-center justify-center overflow-hidden lg:min-h-full">
          <svg
            aria-hidden
            viewBox="0 0 400 520"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            className="absolute inset-0 h-full w-full"
          >
            <path
              d="M452 -30 C 360 90, 500 210, 392 330 C 312 418, 420 500, 372 610"
              stroke="#165DFF"
              strokeWidth="72"
              strokeLinecap="round"
            />
            <path
              d="M-52 372 C 60 330, 28 452, 118 500 C 170 528, 150 590, 190 640"
              stroke="#B6F500"
              strokeWidth="60"
              strokeLinecap="round"
            />
          </svg>
          <Image
            src="/logo-lockup.png"
            alt="Plaiyo"
            width={1024}
            height={500}
            priority
            className="relative z-10 w-[min(74vw,330px)] lg:hidden"
          />
          <Image
            src="/logo-desktop.png"
            alt="Plaiyo"
            width={1672}
            height={455}
            priority
            className="relative z-10 hidden h-auto lg:block lg:w-[min(46vw,720px)]"
          />
        </section>

        <section className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[2rem] bg-warm-white px-6 pb-10 pt-9 lg:mt-0 lg:justify-center lg:rounded-none lg:bg-soft lg:px-20">
          <div className="w-full max-w-md">
            <h1 className="text-4xl font-black leading-[1.1] text-ink lg:text-5xl lg:leading-[1.08]">
              <span className="block">Your sport.</span>
              <span className="block">Your moment.</span>
              <span className="block">Your crew.</span>
            </h1>
            <p className="mt-4 font-semibold leading-relaxed text-muted">
              Say what you&rsquo;re up for. Plaiyo brings the right people
              together, near you.
            </p>

            <div className="mt-9">
              <Link
                href="/login"
                className="block w-full rounded-full bg-primary py-4 text-center font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="mt-5 flex items-center justify-center gap-2 font-black uppercase tracking-wider text-ink"
              >
                Sign up <span aria-hidden>→</span>
              </Link>
            </div>

            <p className="mt-10 text-center text-[13px] font-semibold text-muted lg:text-left">
              By continuing, you agree to the{" "}
              <Link href="/terms" className="underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
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
