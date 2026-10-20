import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { joinSession, leaveSession } from "./actions";

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; joined?: string; left?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, title, description, location, city, starts_at, duration_minutes, capacity, is_paid, price_cents, currency, women_only, recurring, skill_level, status, average_pace, distance_value, distance_unit, host_id, sports(name, photo_url), profiles!sessions_host_id_fkey(display_name)",
    )
    .eq("id", id)
    .single();
  if (!session) notFound();

  const sport = session.sports as unknown as {
    name: string;
    photo_url: string | null;
  } | null;
  const host = session.profiles as unknown as {
    display_name: string;
  } | null;

  // Roster visibility follows RLS: participants see themselves, the host
  // sees the whole roster, other visitors see counts their own queries allow.
  const { data: roster } = await supabase
    .from("participations")
    .select("user_id, status, profiles(display_name)")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const confirmed = (roster ?? []).filter((p) => p.status === "confirmed");
  const waitlist = (roster ?? []).filter((p) => p.status === "waitlist");
  const mine = (roster ?? []).find((p) => p.user_id === user.id);
  const isHost = session.host_id === user.id;

  // Totals come from the aggregate counts view: the roster above only
  // holds the rows RLS lets this user see (their own row, or the full
  // roster for the host), which is not the session's real occupancy.
  const { data: counts } = await supabase
    .from("session_participation_counts")
    .select("confirmed_count, waitlist_count")
    .eq("session_id", id)
    .maybeSingle();
  const confirmedCount = counts?.confirmed_count ?? confirmed.length;
  const waitlistCount = counts?.waitlist_count ?? waitlist.length;
  const spotsLeft = session.capacity - confirmedCount;

  return (
    <div className="space-y-5">
      <Link href="/discover" className="font-black text-primary">
        ‹ Back
      </Link>

      {sport?.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sport.photo_url}
          alt={sport.name}
          className="h-44 w-full rounded-3xl object-cover"
        />
      ) : (
        <div className="flex h-44 w-full items-center rounded-3xl bg-navy px-5">
          <span className="text-xl font-black text-warm-white">
            {sport?.name}
          </span>
        </div>
      )}

      {sp.error && (
        <p role="alert" className="rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
          {sp.error}
        </p>
      )}
      {sp.joined && (
        <p className="rounded-2xl bg-lime/25 px-4 py-3 font-bold text-ink">
          {sp.joined === "confirmed"
            ? "You're in. See you there!"
            : "You're on the waitlist — we'll confirm you if a spot opens."}
        </p>
      )}
      {sp.left && (
        <p className="rounded-2xl bg-lime/25 px-4 py-3 font-bold text-ink">
          You left this session.
        </p>
      )}

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-ink">{session.title}</h1>
        <p className="font-bold text-muted">
          {new Date(session.starts_at).toLocaleDateString("en-CA", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}{" "}
          ·{" "}
          {new Date(session.starts_at).toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit",
          })}
          {session.duration_minutes ? ` · ${session.duration_minutes} min` : ""}
        </p>
        <p className="font-semibold text-muted">
          {session.location}
          {session.city ? ` · ${session.city}` : ""}
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-xs font-bold">
          <span className="rounded-full bg-soft px-3 py-1 text-ink">
            {sport?.name}
          </span>
          <span className="rounded-full bg-soft px-3 py-1 text-ink">
            {session.is_paid
              ? `$${(session.price_cents / 100).toFixed(2)} ${session.currency}`
              : "Free"}
          </span>
          <span className="rounded-full bg-soft px-3 py-1 capitalize text-ink">
            {session.skill_level} levels
          </span>
          {session.women_only && (
            <span className="rounded-full bg-soft px-3 py-1 text-ink">
              Women only
            </span>
          )}
          {session.recurring && (
            <span className="rounded-full bg-soft px-3 py-1 text-ink">
              Recurring
            </span>
          )}
          {session.average_pace && session.distance_value && (
            <span className="rounded-full bg-soft px-3 py-1 text-ink">
              Pace &amp; distance — {session.average_pace} /
              {session.distance_unit} · {session.distance_value}{" "}
              {session.distance_unit}
            </span>
          )}
          <span
            className={`rounded-full px-3 py-1 ${
              spotsLeft > 0 ? "bg-lime/25 text-ink" : "bg-coral/20 text-coral"
            }`}
          >
            {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full — waitlist open"}
          </span>
        </div>
        {session.description && (
          <p className="pt-2 font-semibold whitespace-pre-wrap text-ink">
            {session.description}
          </p>
        )}
        <p className="text-sm font-semibold text-muted">
          Hosted by {host?.display_name || "a Plaiyo member"}
          {isHost ? " (you)" : ""}
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-primary">
          Who&apos;s coming ({confirmedCount}/{session.capacity})
        </h2>
        {confirmed.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {confirmed.map((p) => {
              const prof = p.profiles as unknown as {
                display_name: string;
              } | null;
              return (
                <li
                  key={p.user_id}
                  className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-bold text-ink"
                >
                  {prof?.display_name || "Member"}
                  {p.user_id === user.id ? " (you)" : ""}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="font-semibold text-muted">
            {confirmedCount > 0
              ? `${confirmedCount} participant${confirmedCount === 1 ? "" : "s"} confirmed so far.`
              : "Be the first to join this session."}
          </p>
        )}
        {waitlistCount > 0 && (
          <p className="text-sm font-semibold text-muted">
            Waitlist: {waitlistCount} person{waitlistCount === 1 ? "" : "s"}
          </p>
        )}
      </section>

      {!isHost &&
        (mine ? (
          <form action={leaveSession}>
            <input type="hidden" name="session_id" value={session.id} />
            <button
              type="submit"
              className="w-full rounded-full border border-border bg-white py-3 font-black text-ink"
            >
              {mine.status === "confirmed" ? "Leave session" : "Leave waitlist"}
            </button>
          </form>
        ) : (
          <form action={joinSession}>
            <input type="hidden" name="session_id" value={session.id} />
            <button
              type="submit"
              className="w-full rounded-full bg-primary py-3 font-black text-white"
            >
              {spotsLeft > 0 ? "Join session" : "Join the waitlist"}
            </button>
          </form>
        ))}
      {isHost && (
        <p className="rounded-2xl bg-soft px-4 py-3 text-center font-bold text-muted">
          You&apos;re hosting this one.
        </p>
      )}
    </div>
  );
}
