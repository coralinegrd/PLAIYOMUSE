import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resendConfirmation } from "@/lib/resendConfirmation";
import AuthShell from "@/components/AuthShell";
import BrandHeader from "@/components/BrandHeader";
import GoogleButton from "@/components/GoogleButton";
import PasswordField from "@/components/PasswordField";
import TextField from "@/components/TextField";
import { EnvelopeIcon } from "@/components/icons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
    unconfirmed?: string;
    nocred?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const email = String(formData.get("email") ?? "");
    const next = String(formData.get("next") ?? "/");
    const safeNext = next.startsWith("/") ? next : "/";
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: String(formData.get("password") ?? ""),
    });
    if (error) {
      // Map Supabase errors to clear, honest states (Coraline's rule: no
      // account or an unconfirmed email means no dashboard access, and the
      // user must be told exactly which situation they are in).
      const code = (error as { code?: string }).code ?? "";
      if (code === "email_not_confirmed" || /email not confirmed/i.test(error.message)) {
        redirect(
          `/login?unconfirmed=1&email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext)}`,
        );
      }
      if (code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
        redirect(
          `/login?nocred=1&next=${encodeURIComponent(safeNext)}&error=${encodeURIComponent(
            "No account matches that email and password. Create an account first if you're new.",
          )}`,
        );
      }
      redirect(
        `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(safeNext)}`,
      );
    }
    redirect(safeNext);
  }

  return (
    <AuthShell backHref="/">
      <div className="mt-2">
        <BrandHeader />
      </div>

      <h1 className="mt-9 text-4xl font-black text-ink">Welcome back.</h1>
      <p className="mt-2 font-semibold text-muted">Log in to continue.</p>

      {params.error && (
        <div className="mt-6 rounded-2xl bg-coral/15 px-4 py-3">
          <p role="alert" className="font-bold text-coral">
            {params.error}
          </p>
          {params.nocred && (
            <Link href="/signup" className="mt-1 inline-block font-black text-ink underline">
              Create an account
            </Link>
          )}
        </div>
      )}
      {params.unconfirmed && (
        <div className="mt-6 rounded-2xl bg-coral/15 px-4 py-3">
          <p role="alert" className="font-bold text-coral">
            Your email isn&rsquo;t confirmed yet. Use the link in the
            confirmation email, then log in.
          </p>
          <form action={resendConfirmation} className="mt-2">
            <input type="hidden" name="email" value={params.email ?? ""} />
            <input type="hidden" name="back" value="/login" />
            <button type="submit" className="font-black text-ink underline">
              Resend the confirmation email
            </button>
          </form>
        </div>
      )}
      {params.message && (
        <p className="mt-6 rounded-2xl bg-lime/25 px-4 py-3 font-bold text-ink">
          {params.message}
        </p>
      )}

      <div className="mt-8">
        <GoogleButton />
      </div>

      <div className="mt-7 flex items-center gap-4" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
          Or with your email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={login} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={params.next ?? "/"} />
        <TextField
          label="Email address"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="alex@email.com"
          icon={<EnvelopeIcon />}
        />
        <div>
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            required
          />
          <div className="mt-2.5 text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-muted transition hover:text-ink"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-4 font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25"
        >
          Log in <span aria-hidden>→</span>
        </button>
      </form>

      <p className="mt-9 text-center font-semibold text-muted">
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className="font-black text-primary">
          Create one
        </Link>
      </p>
      <p className="mt-3 text-center text-sm font-semibold text-muted">
        Need help? <span className="underline">Contact support</span>
      </p>
    </AuthShell>
  );
}
