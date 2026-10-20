import Link from "next/link";

export type SessionListItem = {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  city: string;
  capacity: number;
  is_paid: boolean;
  price_cents: number;
  currency: string;
  skill_level: string;
  average_pace: string | null;
  distance_value: number | null;
  distance_unit: string | null;
  sports: { name: string; photo_url: string | null } | null;
  profiles: { display_name: string } | null;
  // Aggregate from the session_participation_counts view — RLS hides the
  // individual participation rows from non-hosts, so they cannot be
  // counted client-side (see lib/sessionCounts.ts).
  confirmed_count?: number | null;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }) +
    " · " +
    d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
}

export default function SessionCard({ session }: { session: SessionListItem }) {
  const joined = session.confirmed_count ?? 0;
  const spotsLeft = session.capacity - joined;
  const price = session.is_paid
    ? `$${(session.price_cents / 100).toFixed(2)}`
    : "Free";

  return (
    <Link href={`/sessions/${session.id}`} className="block">
    <article className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
      {session.sports?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.sports.photo_url}
          alt={session.sports?.name ?? ""}
          className="h-36 w-full object-cover"
        />
      ) : (
        <div className="flex h-36 w-full items-center bg-navy px-5">
          <span className="text-lg font-black text-warm-white">
            {session.sports?.name ?? "Session"}
          </span>
        </div>
      )}
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-black text-ink">{session.title}</h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              spotsLeft > 0
                ? "bg-lime/25 text-ink"
                : "bg-coral/20 text-coral"
            }`}
          >
            {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
          </span>
        </div>
        <p className="text-sm font-semibold text-muted">
          {formatWhen(session.starts_at)}
        </p>
        <p className="text-sm text-muted">
          {session.location}
          {session.city ? ` · ${session.city}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs font-bold text-ink">
          <span>{session.sports?.name}</span>
          <span>{price}</span>
          <span className="capitalize">{session.skill_level} levels</span>
          {session.average_pace && session.distance_value && (
            <span>
              {session.average_pace} /{session.distance_unit} ·{" "}
              {session.distance_value} {session.distance_unit}
            </span>
          )}
          {session.profiles?.display_name && (
            <span className="text-muted">
              Hosted by {session.profiles.display_name}
            </span>
          )}
        </div>
      </div>
    </article>
    </Link>
  );
}
