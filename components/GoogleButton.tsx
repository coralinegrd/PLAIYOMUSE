"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "./icons";

/**
 * « Continue with Google » — starts the real Supabase OAuth flow.
 * If the Google provider is not enabled yet in the Supabase project,
 * Supabase returns an error and we surface it honestly in the app's
 * standard error style; we never fake a sign-in.
 */
export default function GoogleButton() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${site}/auth/callback` },
    });
    if (error) {
      setError(
        `Google sign-in could not be started (${error.message}). Please log in with your email and password below.`,
      );
      setBusy(false);
    }
    // On success, supabase-js navigates the browser to Google itself.
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white py-3.5 font-extrabold text-ink shadow-sm transition hover:border-primary/50 disabled:opacity-60"
      >
        <GoogleIcon />
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral"
        >
          {error}
        </p>
      )}
    </div>
  );
}
