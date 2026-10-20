"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";
import BrandHeader from "@/components/BrandHeader";
import TextField from "@/components/TextField";
import { EnvelopeIcon } from "@/components/icons";

/**
 * Request a password-reset email. The email link lands on /auth/callback
 * with next=/reset-password: the callback exchanges the one-time code for
 * a (recovery) session, then sends the user to the reset form.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const supabase = createClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${site}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell backHref="/login">
      <div className="mt-2">
        <BrandHeader />
      </div>

      <h1 className="mt-9 text-4xl font-black text-ink">Reset password</h1>
      <p className="mt-2 font-semibold leading-relaxed text-muted">
        Enter the email address of your account and we&rsquo;ll send you a
        link to set a new password.
      </p>

      {sent ? (
        <div className="mt-8">
          <p className="rounded-2xl bg-lime/25 px-4 py-3 font-bold text-ink">
            Check your email. If an account exists for that address, a
            password reset link is on its way.
          </p>
          <p className="mt-6 text-center font-semibold text-muted">
            <Link href="/login" className="font-black text-primary">
              Back to log in
            </Link>
          </p>
        </div>
      ) : (
        <>
          {error && (
            <p role="alert" className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
              {error}
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <TextField
              label="Email address"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="alex@email.com"
              icon={<EnvelopeIcon />}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary py-4 font-black text-white shadow-lg shadow-primary/25 disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
