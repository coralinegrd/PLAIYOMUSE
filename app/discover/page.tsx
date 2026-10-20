import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getParticipationCounts } from "@/lib/sessionCounts";
import SessionCard, { type SessionListItem } from "@/components/SessionCard";

/**
 * Discover — follows Coraline's Discover UX principles (2026-10-20):
 * no GPS gate (browsing works off the saved city), the city comes from the
 * profile and can be changed there, quick filters stay minimal, results are
 * real sessions only, and the three empty states are explicit.
 */
export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; when?: string; sport?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const when = params.when ?? "all";
  const sportId = params.sport ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("city")
        .eq("id", user.id)
        .single()
    : { data: null };
  const city = profile?.city ?? "";

  const { data: sports } = await supabase
    .from("sports")
    .select("id, name")
    .order("name");

  const now = new Date();
  let query = supabase
    .from("sessions")
    .select(
      "id, title, starts_at, location, city, capacity, is_paid, price_cents, currency, skill_level, average_pace, distance_value, distance_unit, sports(name, photo_url), profiles!sessions_host_id_fkey(display_name)",
    )
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  if (city) query = query.eq("city", city);
  if (sportId) query = query.eq("sport_id", sportId);
  if (q) query = query.or(`title.ilike.%${q}%,location.ilike.%${q}%`);
  if (when === "today") {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    query = query.lte("starts_at", end.toISOString());
  } else if (when === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    query = query.lte("starts_at", end.toISOString());
  }

  const { data, error } = await query;
  const sessions = (data ?? []) as unknown as SessionListItem[];
  // Occupancy from the aggregate counts view (RLS hides the raw rows).
  const counts = await getParticipationCounts(
    supabase,
    sessions.map((s) => s.id),
  );
  const sessionsWithCounts = sessions.map((s) => ({
    ...s,
    confirmed_count: counts.get(s.id)?.confirmed_count ?? 0,
  }));
  const hasFilters = Boolean(q || sportId || when !== "all");

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-ink">Discover</h1>
          <p className="mt-1 font-bold text-muted">
            📍 {city ? `${city}` : "Set your city in your profile"} ▾
          </p>
        </div>
      </header>

      <form method="get" className="space-y-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search sports, activities, locations..."
          className="w-full rounded-full border border-border bg-white px-4 py-3 font-semibold outline-none placeholder:text-muted focus:border-primary"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="submit"
            name="when"
            value="all"
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
              when === "all"
                ? "bg-primary text-white"
                : "border border-border bg-white text-ink"
            }`}
          >
            All sports
          </button>
          <button
            type="submit"
            name="when"
            value="today"
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
              when === "today"
                ? "bg-primary text-white"
                : "border border-border bg-white text-ink"
            }`}
          >
            Today
          </button>
          <button
            type="submit"
            name="when"
            value="week"
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
              when === "week"
                ? "bg-primary text-white"
                : "border border-border bg-white text-ink"
            }`}
          >
            This week
          </button>
          <select
            name="sport"
            defaultValue={sportId}
            aria-label="Filter by sport"
            className="whitespace-nowrap rounded-full border border-border bg-white px-4 py-2 text-sm font-bold text-ink"
          >
            <option value="">Distance · all sports</option>
            {(sports ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="whitespace-nowrap rounded-full bg-navy px-4 py-2 text-sm font-bold text-warm-white"
          >
            Apply
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-ink">
          Activities in {city || "your city"}
        </h2>

        {error ? (
          <div className="rounded-3xl border border-border bg-white p-5">
            <p className="font-bold text-ink">
              Activities are temporarily unavailable.
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">
              Check your connection and try again. This is not the same as
              there being no activities.
            </p>
            <Link
              href="/discover"
              className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-black text-white"
            >
              Retry
            </Link>
          </div>
        ) : sessionsWithCounts.length > 0 ? (
          <div className="space-y-3">
            {sessionsWithCounts.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        ) : hasFilters ? (
          <div className="rounded-3xl border border-border bg-white p-5">
            <p className="font-bold text-ink">No games match your filters.</p>
            <Link
              href="/discover"
              className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-black text-white"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-white p-5">
            <p className="font-bold text-ink">
              No games here yet. Be the one to start!
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/sessions/new"
                className="rounded-full bg-primary px-4 py-2 text-sm font-black text-white"
              >
                Create an activity
              </Link>
              <Link
                href="/profile"
                className="rounded-full border border-border px-4 py-2 text-sm font-black text-ink"
              >
                Explore another city
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
