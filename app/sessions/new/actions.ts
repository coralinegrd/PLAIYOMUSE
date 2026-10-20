"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanCityName } from "@/lib/city";

const RUNNING_SPORTS = ["Running", "Trail Running", "Track & Field"];
const PACE_RE = /^[0-9]{1,2}:[0-5][0-9]$/;

export async function createSession(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sportId = String(formData.get("sport_id") ?? "");
  const { data: sport } = await supabase
    .from("sports")
    .select("name")
    .eq("id", sportId)
    .single();
  if (!sport) redirect("/sessions/new?error=Please choose a sport.");

  const isRunning = RUNNING_SPORTS.includes(sport.name);
  const pace = String(formData.get("average_pace") ?? "").trim();
  const distanceRaw = String(formData.get("distance_value") ?? "").trim();
  const distance = distanceRaw ? Number(distanceRaw) : null;
  const unit = String(formData.get("distance_unit") ?? "km");

  if (isRunning) {
    if (!PACE_RE.test(pace)) {
      redirect(
        "/sessions/new?error=" +
          encodeURIComponent("Average pace must use the MM:SS format (e.g. 05:30)."),
      );
    }
    if (distance === null || Number.isNaN(distance) || distance < 0.1) {
      redirect(
        "/sessions/new?error=" +
          encodeURIComponent("Distance must be a number of at least 0.1."),
      );
    }
    if (unit !== "km" && unit !== "mile") {
      redirect("/sessions/new?error=" + encodeURIComponent("Distance unit must be km or mile."));
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("city")
    .eq("id", user.id)
    .single();

  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const startsAt = new Date(`${date}T${time}`);
  if (!date || !time || Number.isNaN(startsAt.getTime())) {
    redirect("/sessions/new?error=" + encodeURIComponent("Please pick a valid date and time."));
  }

  // Store the city cleaned (trimmed, single spaces) so Discover's
  // accent/case-insensitive matching starts from tidy values on both
  // sides. Falls back to the profile city only when the field is absent.
  const rawCity = formData.get("city");
  const sessionCity = cleanCityName(
    rawCity === null ? (profile?.city ?? "") : String(rawCity),
  );

  const priceDollars = Number(formData.get("price") ?? 0);
  const priceCents = Number.isNaN(priceDollars)
    ? 0
    : Math.round(priceDollars * 100);
  const hostAttends = formData.get("host_attends") === "on";

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      host_id: user.id,
      sport_id: sportId,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      location: String(formData.get("location") ?? ""),
      city: sessionCity,
      starts_at: startsAt.toISOString(),
      duration_minutes: Number(formData.get("duration") ?? 60) || null,
      capacity: Math.max(2, Number(formData.get("capacity") ?? 2) || 2),
      price_cents: priceCents,
      is_paid: priceCents > 0,
      women_only: formData.get("women_only") === "on",
      recurring: formData.get("recurring") === "on",
      host_attends: hostAttends,
      skill_level: String(formData.get("skill_level") ?? "all"),
      average_pace: isRunning ? pace : null,
      distance_value: isRunning ? distance : null,
      distance_unit: isRunning ? unit : null,
    })
    .select("id")
    .single();

  if (error || !session) {
    redirect(
      "/sessions/new?error=" +
        encodeURIComponent(error?.message ?? "Could not create the session."),
    );
  }

  // The session gets its own conversation from day one; the host is a
  // participant, and joiners are added when they confirm (see session page).
  const { data: conversation } = await supabase
    .from("conversations")
    .insert({ kind: "session", session_id: session.id, created_by: user.id })
    .select("id")
    .single();
  if (conversation) {
    await supabase.from("conversation_participants").insert({
      conversation_id: conversation.id,
      user_id: user.id,
    });
  }

  if (hostAttends) {
    await supabase.from("participations").insert({
      session_id: session.id,
      user_id: user.id,
      status: "confirmed",
    });
  }

  redirect("/");
}
