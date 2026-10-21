import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeftIcon, ChevronRightIcon } from "@/components/icons";

/**
 * « My activities » — the real lists behind the profile hub row: upcoming
 * sessions the user is joining (confirmed or waitlisted participations,
 * excluding sessions they host themselves) and upcoming sessions they
 * host. Rows link to the session page; empty states are honest and point
 * at Discover / session creation.
 */

type ActivitySession = {
  id: string;
  title: string;
  starts_at: string;
  sports: { name: string } | null;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })
  );
}

function SessionRows({ sessions }: { sessions: ActivitySession[] }) {
  return (
    <div className="divide-y divide-[#eef1f4] overflow-hidden rounded-3xl border border-border bg-white">
      {sessions.map((s) => (
        <Link
          key={s.id}
          href={`/sessions/${s.id}`}
          className="flex items-center gap-3 px-4 py-3.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-black text-ink">
              {s.title}
            </span>
            <span className="block truncate text-sm font-semibold text-muted">
              {formatWhen(s.starts_at)}
              {s.sports?.name ? ` · ${s.sports.name}` : ""}
            </span>
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted/50" />
        </Link>
      ))}
    </div>
  );
}

export default async function MyActivitiesPage() {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();

  const { data: participations } = await supabase
    .from("participations")
    .select(
      "id, sessions!inner(id, title, starts_at, host_id, status, sports(name))",
    )
    .eq("user_id", user.id)
    .gte("sessions.starts_at", nowIso)
    .neq("sessions.status", "cancelled")
    .order("starts_at", { referencedTable: "sessions", ascending: true });

  const joining: ActivitySession[] = (participations ?? [])
    .map((p) => p.sessions as unknown as ActivitySession & { host_id: string })
    .filter((s) => s && s.host_id !== user.id);

  const { data: hosted } = await supabase
    .from("sessions")
    .select("id, title, starts_at, sports(name)")
    .eq("host_id", user.id)
    .gte("starts_at", nowIso)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });

  const hosting = (hosted ?? []) as unknown as ActivitySession[];

  return (
    <div className="space-y-7">
      <div>
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 font-black text-primary"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Profile
        </Link>
        <h1 className="mt-3 text-3xl font-black text-ink">My activities</h1>
      </div>

      <section className="space-y-2.5">
        <h2 className="text-xs font-black tracking-widest text-muted uppercase">
          You&rsquo;re joining
        </h2>
        {joining.length > 0 ? (
          <SessionRows sessions={joining} />
        ) : (
          <p className="rounded-3xl border border-border bg-white px-4 py-4 font-semibold text-muted">
            No upcoming games yet — find one in{" "}
            <Link href="/discover" className="font-black text-primary">
              Discover
            </Link>
            .
          </p>
        )}
      </section>

      <section className="space-y-2.5">
        <h2 className="text-xs font-black tracking-widest text-muted uppercase">
          You&rsquo;re hosting
        </h2>
        {hosting.length > 0 ? (
          <SessionRows sessions={hosting} />
        ) : (
          <p className="rounded-3xl border border-border bg-white px-4 py-4 font-semibold text-muted">
            You&rsquo;re not hosting yet.
          </p>
        )}
      </section>
    </div>
  );
}
