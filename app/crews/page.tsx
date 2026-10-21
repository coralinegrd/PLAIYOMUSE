import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CrewRow = {
  id: string;
  name: string;
  city: string;
  sports: { name: string } | null;
  crew_members: { count: number }[] | null;
};

export default async function CrewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const params = await searchParams;
  const tab = params.tab === "discover" ? "discover" : "mine";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = user
    ? await supabase
        .from("crew_members")
        .select("crew_id")
        .eq("user_id", user.id)
    : { data: [] };
  const myCrewIds = (memberships ?? []).map((m) => m.crew_id);

  const { data: crews } = await supabase
    .from("crews")
    .select("id, name, city, sports(name), crew_members(count)")
    .order("name");
  const all = (crews ?? []) as unknown as CrewRow[];
  const mine = all.filter((c) => myCrewIds.includes(c.id));
  const others = all.filter((c) => !myCrewIds.includes(c.id));
  const shown = tab === "mine" ? mine : others;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black text-ink">Crews</h1>

      <div
        role="tablist"
        aria-label="Crews"
        className="flex rounded-full border border-border bg-white p-1"
      >
        <Link
          href="/crews?tab=mine"
          role="tab"
          aria-selected={tab === "mine"}
          className={`flex-1 rounded-full py-2 text-center text-sm font-black ${
            tab === "mine" ? "bg-navy text-warm-white" : "text-muted"
          }`}
        >
          My crews · {mine.length}
        </Link>
        <Link
          href="/crews?tab=discover"
          role="tab"
          aria-selected={tab === "discover"}
          className={`flex-1 rounded-full py-2 text-center text-sm font-black ${
            tab === "discover" ? "bg-navy text-warm-white" : "text-muted"
          }`}
        >
          Discover
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-primary">
          {tab === "mine" ? "Your crews" : "Crews to discover"}
        </h2>
        {shown.length > 0 ? (
          <ul className="space-y-3">
            {shown.map((crew) => (
              <li
                key={crew.id}
                className="flex items-center gap-3 rounded-3xl border border-border bg-white p-4"
              >
                <span className="rounded-2xl bg-soft p-3 text-primary">👥</span>
                <span>
                  <span className="block font-black text-ink">{crew.name}</span>
                  <span className="block text-sm font-semibold text-muted">
                    {crew.sports?.name ?? "All sports"} ·{" "}
                    {crew.crew_members?.[0]?.count ?? 0} members
                    {crew.city ? ` · ${crew.city}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-border bg-white p-4 font-semibold text-muted">
            {tab === "mine"
              ? "No crews yet. Join one from Discover, or start your own."
              : "No other crews to discover yet."}
          </p>
        )}
      </section>
    </div>
  );
}
