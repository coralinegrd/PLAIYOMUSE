"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";
import BrandHeader from "@/components/BrandHeader";
import PasswordField from "@/components/PasswordField";

type Status = "checking" | "ready" | "missing";

/**
 * Set a new password after a reset link. The link goes through
 * /auth/callback, which exchanges the code for a recovery session before
 * redirecting here — so this page only shows the form when a session
 * actually exists. Without one, it explains and points back to
 * /forgot-password.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setStatus(data.session ? "ready" : "missing");
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) setStatus("ready");
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("password_confirm") ?? "");
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // The recovery session has done its job; sign out so the user logs
    // back in cleanly with the new password.
    await supabase.auth.signOut();
    router.replace(
      "/login?message=" +
        encodeURIComponent("Password updated. Log in with your new password."),
    );
  }

  return (
    <AuthShell backHref="/login">
      <div className="mt-2">
        <BrandHeader />
      </div>

      <h1 className="mt-9 text-4xl font-black text-ink">New password</h1>
      <p className="mt-2 font-semibold leading-relaxed text-muted">
        Choose a new password for your Plaiyo account.
      </p>

      {status === "checking" && (
        <p className="mt-8 font-semibold text-muted">
          Checking your reset link…
        </p>
      )}

      {status === "missing" && (
        <div className="mt-8">
          <p role="alert" className="rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
            This page needs a valid reset link, and none was found. Request
            a new one and use the link from the latest email.
          </p>
          <p className="mt-6 text-center font-semibold text-muted">
            <Link href="/forgot-password" className="font-black text-primary">
              Request a new reset link
            </Link>
          </p>
        </div>
      )}

      {status === "ready" && (
        <>
          {error && (
            <p role="alert" className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
              {error}
            </p>
          )}
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <PasswordField
              label="Confirm new password"
              name="password_confirm"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary py-4 font-black text-white shadow-lg shadow-primary/25 disabled:opacity-60"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
