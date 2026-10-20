"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Resends the signup confirmation email (shared by the login page's
 * "email not confirmed" state and the post-signup check-email page).
 * Form fields: `email`, `back` (path to return to, may carry a query).
 */
export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const rawBack = String(formData.get("back") ?? "/login");
  const back = rawBack.startsWith("/") ? rawBack : "/login";
  const sep = back.includes("?") ? "&" : "?";

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
    },
  });

  if (error) {
    redirect(
      `${back}${sep}error=${encodeURIComponent(
        "We couldn't resend the confirmation email. Please wait a moment and try again.",
      )}`,
    );
  }
  redirect(
    `${back}${sep}message=${encodeURIComponent(
      "Confirmation email sent. Check your inbox, click the link, then log in.",
    )}`,
  );
}
