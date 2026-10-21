"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Join a session. The DATABASE assigns the status — `confirmed` while
 * there is room, otherwise `waitlist` — via the
 * `participations_assign_status` trigger: Row Level Security hides other
 * participants' rows, so the app cannot count the roster itself. The
 * database also adds confirmed participants to the session conversation
 * (`participations_sync_conversation` trigger).
 *
 * Women-only sessions are checked here first, so the refusal carries a
 * clean message; the `participations_women_only_eligibility` trigger
 * enforces the same rule in the database as the final backstop.
 */
export async function joinSession(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessionId = String(formData.get("session_id") ?? "");

  const { data: session } = await supabase
    .from("sessions")
    .select("id, host_id, status, women_only")
    .eq("id", sessionId)
    .single();
  if (!session || session.status !== "scheduled") {
    redirect(`/sessions/${sessionId}?error=This session is not open.`);
  }
  if (session.host_id === user.id) {
    redirect(`/sessions/${sessionId}?error=You host this session.`);
  }

  // Women-only eligibility (decision 2026-10-21): only gender = 'man'
  // is blocked; 'woman', 'non_binary' and a not-yet-set gender pass
  // here (the onboarding gate guarantees a value in practice, and the
  // DB trigger grandfathers NULL the same way).
  if (session.women_only) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", user.id)
      .maybeSingle();
    if (
      (profile as { gender?: string | null } | null)?.gender === "man"
    ) {
      redirect(
        `/sessions/${sessionId}?error=${encodeURIComponent("This is a women-only session.")}`,
      );
    }
  }

  const { error } = await supabase.from("participations").insert({
    session_id: sessionId,
    user_id: user.id,
  });
  if (error) {
    redirect(
      `/sessions/${sessionId}?error=${encodeURIComponent("Could not join: " + error.message)}`,
    );
  }

  // Read back our own row (always visible under RLS) to learn the status
  // the database assigned.
  const { data: mine } = await supabase
    .from("participations")
    .select("status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();
  const status = mine?.status ?? "confirmed";

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}?joined=${status}`);
}

/**
 * Leave a session. If a confirmed spot frees up, the database promotes
 * the earliest waitlisted participant and adds them to the session
 * conversation (`participations_promote_waitlist` trigger) — the leaving
 * user cannot do this themselves, since RLS hides the waitlist from them.
 */
export async function leaveSession(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessionId = String(formData.get("session_id") ?? "");

  await supabase
    .from("participations")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  revalidatePath(`/sessions/${sessionId}`);
  redirect(`/sessions/${sessionId}?left=1`);
}
