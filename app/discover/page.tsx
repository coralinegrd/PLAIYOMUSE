import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getParticipationCounts } from "@/lib/sessionCounts";
import SessionCard, { type SessionListItem } from "@/components/SessionCard";
import {
  ALL_CITIES,
  CITY_COOKIE,
  cleanCityName,
  normalizeCityKey,
} from "@/lib/city";
import { torontoTodayRange, torontoWeekRange } from "@/lib/time";

/**
 * Discover — redesigned per Coraline's Discover UX brief (2026-10-20) and
 * the Phase 2 proposal:
 * - No GPS, ever: browsing works off a manually selected city.
 * - City resolution order: URL `city` param > `plaiyo_city` cookie >
 *   profile city > All cities. Selecting a city goes through
 *   /discover/set-city, which persists the cookie.
 * - City matching is accent/case-insensitive in code (cities are free text
 *   on both sides, so a SQL equality silently hid valid sessions).
 * - Quick filters are GET links (All sports / Today / This week /
 *   All cities); the Filters icon opens a compact panel limited to what
 *   the schema supports (sport, level, free, women only). No Distance
 *   filter: the schema has no coordinates, so it cannot be honest.
 * - The user's own sessions are excluded, consistent with the Home
 *   "Happening near you" rule.
 * - Results are real sessions only; the three empty states (city empty,
 *   filters empty, error) stay explicit and distinct, and the filters
 *   state shows other upcoming sessions in the same scope as
 *   alternatives.
 */

const SESSION_SELECT =
  "id, title, starts_at, location, city, capacity, is_paid, price_cents, currency, skill_level, average_pace, distance_value, distance_unit, sports(name, photo_url), profiles!sessions_host_id_fkey(display_name)";

const LEVELS = ["beginner", "intermediate", "advanced"];

/**
 * Makes a user search term safe to interpolate into a PostgREST .or()
 * filter string: backslash-escapes LIKE wildcards and strips the
 * characters that structure the filter syntax (commas, parentheses,
 * quotes), so a search can never break or reshape the query.
 */
function escapeSearchTerm(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/[(),"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type SearchParams = {
  q?: string;
  when?: string;
  sport?: string;
  city?: string;
  level?: string;
  free?: string;
  women?: string;
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const when =
    params.when === "today" || params.when === "week" ? params.when : "all";
  const sportId = params.sport ?? "";
  const level = LEVELS.includes(params.level ?? "") ? (params.level as string) : "";
  const freeOnly = params.free === "1";
  const womenOnly = params.women === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("city").eq("id", user.id).single()
    : { data: null };
  const profileCity = cleanCityName(profile?.city ?? "");

  // --- City resolution: URL > cookie > profile > All cities. ---
  const cookieStore = await cookies();
  const cookieCity = cookieStore.get(CITY_COOKIE)?.value;
  let selectedCity: string | null;
  let cityWasChosen: boolean;
  if (params.city !== undefined) {
    selectedCity =
      params.city === ALL_CITIES || params.city === ""
        ? null
        : cleanCityName(params.city);
    cityWasChosen = true;
  } else if (cookieCity !== undefined) {
    selectedCity =
      cookieCity === ALL_CITIES ? null : cleanCityName(cookieCity);
    cityWasChosen = true;
  } else if (profileCity) {
    selectedCity = profileCity;
    cityWasChosen = true;
  } else {
    selectedCity = null;
    cityWasChosen = false;
  }
  const selectedCityKey = selectedCity ? normalizeCityKey(selectedCity) : null;

  // --- Sports (filter panel + search matching). ---
  const { data: sports } = await supabase
    .from("sports")
    .select("id, name")
    .order("name");
  const sportList = sports ?? [];

  // --- Cities really present in upcoming sessions (selector options). ---
  const now = new Date();
  const { data: cityRows } = await supabase
    .from("sessions")
    .select("city")
    .eq("status", "scheduled")
    .gte("starts_at", now.toISOString())
    .limit(300);
  const cityByKey = new Map<string, string>();
  for (const row of cityRows ?? []) {
    const cleaned = cleanCityName(row.city ?? "");
    if (!cleaned) continue;
    const key = normalizeCityKey(cleaned);
    if (!cityByKey.has(key)) cityByKey.set(key, cleaned);
  }
  if (selectedCity && selectedCityKey && !cityByKey.has(selectedCityKey)) {
    cityByKey.set(selectedCityKey, selectedCity);
  }
  const profileKey = profileCity ? normalizeCityKey(profileCity) : null;
  const cityOptions = [...cityByKey.entries()]
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => {
      if (a.key === profileKey) return -1;
      if (b.key === profileKey) return 1;
      return a.name.localeCompare(b.name);
    });

  // --- URL helpers. ---
  const buildQuery = (
    overrides: Record<string, string | undefined>,
  ): string => {
    const merged: Record<string, string | undefined> = {
      q: q || undefined,
      when: when !== "all" ? when : undefined,
      sport: sportId || undefined,
      level: level || undefined,
      free: freeOnly ? "1" : undefined,
      women: womenOnly ? "1" : undefined,
      city: params.city,
      ...overrides,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `?${s}` : "";
  };
  const setCityHref = (cityValue: string): string => {
    const sp = new URLSearchParams();
    sp.set("city", cityValue);
    if (q) sp.set("q", q);
    if (when !== "all") sp.set("when", when);
    if (sportId) sp.set("sport", sportId);
    if (level) sp.set("level", level);
    if (freeOnly) sp.set("free", "1");
    if (womenOnly) sp.set("women", "1");
    return `/discover/set-city?${sp.toString()}`;
  };
  const clearFiltersHref = `/discover${buildQuery({
    q: undefined,
    when: undefined,
    sport: undefined,
    level: undefined,
    free: undefined,
    women: undefined,
  })}`;

  // --- Sessions query. ---
  const buildBaseQuery = () => {
    let base = supabase
      .from("sessions")
      .select(SESSION_SELECT)
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
      .order("starts_at", { ascending: true })
      .limit(100);
    // Discover is for other people's sessions (Home rule).
    if (user) base = base.neq("host_id", user.id);
    return base;
  };

  let query = buildBaseQuery();
  if (sportId) query = query.eq("sport_id", sportId);
  if (freeOnly) query = query.eq("is_paid", false);
  if (womenOnly) query = query.eq("women_only", true);
  // Sessions open to "all" levels welcome a beginner/intermediate/advanced
  // searcher too, so a level filter matches the level itself plus "all".
  if (level) query = query.in("skill_level", [level, "all"]);
  if (when === "today") {
    query = query.lt("starts_at", torontoTodayRange(now).end.toISOString());
  } else if (when === "week") {
    query = query.lt("starts_at", torontoWeekRange(now).end.toISOString());
  }
  let forceEmpty = false;
  if (q) {
    const normalizedQ = normalizeCityKey(q);
    const matchedSportIds = sportList
      .filter((s) => normalizeCityKey(s.name).includes(normalizedQ))
      .map((s) => s.id);
    const esc = escapeSearchTerm(q);
    const conditions: string[] = [];
    if (esc) {
      conditions.push(
        `title.ilike.%${esc}%`,
        `location.ilike.%${esc}%`,
        `city.ilike.%${esc}%`,
      );
    }
    if (matchedSportIds.length > 0) {
      conditions.push(`sport_id.in.(${matchedSportIds.join(",")})`);
    }
    if (conditions.length > 0) {
      query = query.or(conditions.join(","));
    } else {
      forceEmpty = true;
    }
  }

  let sessions: SessionListItem[] = [];
  let loadError = false;
  if (forceEmpty) {
    sessions = [];
  } else {
    const { data, error } = await query;
    loadError = Boolean(error);
    sessions = (data ?? []) as unknown as SessionListItem[];
  }

  // City scoping happens in code (accent/case-insensitive), not in SQL.
  if (selectedCityKey) {
    sessions = sessions.filter(
      (s) => normalizeCityKey(s.city ?? "") === selectedCityKey,
    );
  }
  sessions = sessions.slice(0, 50);

  const counts = await getParticipationCounts(
    supabase,
    sessions.map((s) => s.id),
  );
  const sessionsWithCounts = sessions.map((s) => ({
    ...s,
    confirmed_count: counts.get(s.id)?.confirmed_count ?? 0,
  }));

  const hasFilters = Boolean(
    q || sportId || level || freeOnly || womenOnly || when !== "all",
  );
  const panelHasFilters = Boolean(sportId || level || freeOnly || womenOnly);

  // Alternatives for the "no match for your filters" state: other upcoming
  // sessions in the same city scope, ignoring the active filters.
  let alternatives: (SessionListItem & { confirmed_count: number })[] = [];
  if (!loadError && sessionsWithCounts.length === 0 && hasFilters) {
    const { data: altData } = await buildBaseQuery();
    let alt = (altData ?? []) as unknown as SessionListItem[];
    if (selectedCityKey) {
      alt = alt.filter(
        (s) => normalizeCityKey(s.city ?? "") === selectedCityKey,
      );
    }
    alt = alt.slice(0, 3);
    const altCounts = await getParticipationCounts(
      supabase,
      alt.map((s) => s.id),
    );
    alternatives = alt.map((s) => ({
      ...s,
      confirmed_count: altCounts.get(s.id)?.confirmed_count ?? 0,
    }));
  }

  const chipCls = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
      active
        ? "bg-primary text-white"
        : "border border-border bg-white text-ink"
    }`;

  const cityLinkCls = (active: boolean) =>
    `block rounded-2xl px-3 py-2 font-bold ${
      active ? "bg-primary/10 text-ink" : "text-ink hover:bg-soft"
    }`;

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-ink">Discover</h1>
          <details className="relative mt-1">
            <summary className="cursor-pointer list-none font-bold text-muted [&::-webkit-details-marker]:hidden">
              📍 {selectedCity ?? "All cities"} ▾
            </summary>
            <div className="absolute left-0 z-20 mt-2 w-60 rounded-3xl border border-border bg-white p-2 shadow-lg">
              <p className="px-3 py-1.5 text-xs font-black uppercase tracking-wider text-muted">
                Choose your city
              </p>
              {cityOptions.map((c) => (
                <Link
                  key={c.key}
                  href={setCityHref(c.name)}
                  className={cityLinkCls(c.key === selectedCityKey)}
                >
                  {c.name}
                  {c.key === selectedCityKey ? " ✓" : ""}
                </Link>
              ))}
              <Link
                href={setCityHref(ALL_CITIES)}
                className={cityLinkCls(selectedCity === null)}
              >
                All cities{selectedCity === null ? " ✓" : ""}
              </Link>
            </div>
          </details>
        </div>

        <details className="relative">
          <summary
            aria-label="Filters"
            className="relative flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-border bg-white text-ink [&::-webkit-details-marker]:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
            </svg>
            {panelHasFilters && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-lime ring-2 ring-white" />
            )}
          </summary>
          <form
            method="get"
            action="/discover"
            className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-3xl border border-border bg-white p-4 shadow-lg"
          >
            {q && <input type="hidden" name="q" value={q} />}
            {when !== "all" && (
              <input type="hidden" name="when" value={when} />
            )}
            {params.city !== undefined && (
              <input type="hidden" name="city" value={params.city} />
            )}
            <label className="block text-sm font-bold text-muted">
              Sport
              <select
                name="sport"
                defaultValue={sportId}
                className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-2.5 font-semibold text-ink outline-none focus:border-primary"
              >
                <option value="">All sports</option>
                {sportList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold text-muted">
              Level
              <select
                name="level"
                defaultValue={level}
                className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-2.5 font-semibold text-ink outline-none focus:border-primary"
              >
                <option value="">Any level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
            <div className="space-y-2 font-semibold text-ink">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="free"
                  value="1"
                  defaultChecked={freeOnly}
                />{" "}
                Free only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="women"
                  value="1"
                  defaultChecked={womenOnly}
                />{" "}
                Women only
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-full bg-primary py-2.5 text-sm font-black text-white"
              >
                Apply filters
              </button>
              <Link
                href={clearFiltersHref}
                className="rounded-full border border-border px-4 py-2.5 text-sm font-black text-ink"
              >
                Clear
              </Link>
            </div>
          </form>
        </details>
      </header>

      <form method="get" action="/discover" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search sports, activities, locations..."
          className="w-full rounded-full border border-border bg-white px-4 py-3 font-semibold outline-none placeholder:text-muted focus:border-primary"
        />
        {when !== "all" && <input type="hidden" name="when" value={when} />}
        {sportId && <input type="hidden" name="sport" value={sportId} />}
        {level && <input type="hidden" name="level" value={level} />}
        {freeOnly && <input type="hidden" name="free" value="1" />}
        {womenOnly && <input type="hidden" name="women" value="1" />}
        {params.city !== undefined && (
          <input type="hidden" name="city" value={params.city} />
        )}
      </form>

      <nav
        aria-label="Quick filters"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        <Link
          href={`/discover${buildQuery({ when: undefined, sport: undefined })}`}
          className={chipCls(when === "all" && !sportId)}
        >
          All sports
        </Link>
        <Link
          href={`/discover${buildQuery({ when: "today" })}`}
          className={chipCls(when === "today")}
        >
          Today
        </Link>
        <Link
          href={`/discover${buildQuery({ when: "week" })}`}
          className={chipCls(when === "week")}
        >
          This week
        </Link>
        <Link
          href={setCityHref(ALL_CITIES)}
          className={chipCls(selectedCity === null)}
        >
          All cities
        </Link>
      </nav>

      {!cityWasChosen && (
        <details className="rounded-3xl border border-border bg-white px-4 py-3">
          <summary className="cursor-pointer list-none font-bold text-ink [&::-webkit-details-marker]:hidden">
            📍 Set your city to see sessions near you{" "}
            <span className="text-primary">Choose ▾</span>
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {cityOptions.length > 0 ? (
              cityOptions.map((c) => (
                <Link
                  key={c.key}
                  href={setCityHref(c.name)}
                  className="rounded-full border border-border bg-white px-3.5 py-2 text-sm font-bold text-ink"
                >
                  {c.name}
                </Link>
              ))
            ) : (
              <p className="text-sm font-semibold text-muted">
                No sessions are scheduled yet, so no city is available to
                pick. You can also set your city in your profile.
              </p>
            )}
          </div>
        </details>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-black text-ink">
          Activities in {selectedCity ?? "all cities"}
        </h2>

        {loadError ? (
          <div className="rounded-3xl border border-border bg-white p-5">
            <p className="font-bold text-ink">
              Activities are temporarily unavailable.
            </p>
            <p className="mt-1 text-sm font-semibold text-muted">
              Check your connection and try again. This is not the same as
              there being no activities.
            </p>
            <Link
              href={`/discover${buildQuery({})}`}
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
          <>
            <div className="rounded-3xl border border-border bg-white p-5">
              <p className="font-bold text-ink">No games match your filters.</p>
              <Link
                href={clearFiltersHref}
                className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-black text-white"
              >
                Clear filters
              </Link>
            </div>
            {alternatives.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-base font-black text-ink">
                  Other sessions coming up
                  {selectedCity ? ` in ${selectedCity}` : ""}
                </h3>
                {alternatives.map((s) => (
                  <SessionCard key={s.id} session={s} />
                ))}
              </div>
            )}
          </>
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
              {selectedCity && (
                <Link
                  href={setCityHref(ALL_CITIES)}
                  className="rounded-full border border-border px-4 py-2 text-sm font-black text-ink"
                >
                  Explore another city
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
