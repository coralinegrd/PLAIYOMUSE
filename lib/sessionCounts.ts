import type { SupabaseClient } from "@supabase/supabase-js";

export type ParticipationCounts = {
  confirmed_count: number;
  waitlist_count: number;
};

/**
 * Reads the `session_participation_counts` view (aggregate counts per
 * session, no identities). This is the ONLY correct source for "spots
 * left": Row Level Security hides other users' participation rows, so
 * counting rows returned by a normal query would undercount for anyone
 * who is not the session's host.
 */
export async function getParticipationCounts(
  supabase: SupabaseClient,
  sessionIds: string[],
): Promise<Map<string, ParticipationCounts>> {
  const result = new Map<string, ParticipationCounts>();
  const ids = [...new Set(sessionIds)].filter(Boolean);
  if (ids.length === 0) return result;

  const { data } = await supabase
    .from("session_participation_counts")
    .select("session_id, confirmed_count, waitlist_count")
    .in("session_id", ids);

  for (const row of (data ?? []) as (ParticipationCounts & {
    session_id: string;
  })[]) {
    result.set(row.session_id, {
      confirmed_count: row.confirmed_count,
      waitlist_count: row.waitlist_count,
    });
  }
  return result;
}
