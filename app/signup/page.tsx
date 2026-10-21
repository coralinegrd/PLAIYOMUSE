import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthShell from "@/components/AuthShell";
import BrandHeader from "@/components/BrandHeader";
import GoogleButton from "@/components/GoogleButton";
import PasswordField from "@/components/PasswordField";
import TextField from "@/components/TextField";
import { EnvelopeIcon } from "@/components/icons";

/**
 * Neutral message for "this email is already in the system", used for
 * both paths that can reveal it (see the action below). It tells the
 * user exactly how to get unstuck without asserting that an account
 * was created — and without confirming one exists either: a
 * just-signed-up-but-unconfirmed address fits the same sentence.
 */
const ACCOUNT_EXISTS_MESSAGE =
  "That email already has an account. Log in, or confirm your email first if you just signed up.";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  async function signup(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    // The form collects ONLY account credentials now. Display name and
    // city used to travel in the auth metadata (the signup trigger
    // copies them into the profile row); they are onboarding steps 1
    // and 2 instead, so email users enter the same funnel as Google
    // users and the trigger stores ''/'' until the steps fill them in.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email verification is a hard gate: "Confirm email" must be ON in
        // the Supabase Auth settings (see README). Until the user clicks
        // the link in the email, they have no session.
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
      },
    });
    if (error) {
      // Map existence-type errors to the same neutral handling as the
      // obfuscated case below; keep validation messages (invalid email,
      // weak password) specific, as the login page keeps its unmapped
      // messages specific too — signup must not leak MORE than login.
      const code = (error as { code?: string }).code ?? "";
      if (code === "user_already_exists" || /already.*regist/i.test(error.message)) {
        redirect(`/login?message=${encodeURIComponent(ACCOUNT_EXISTS_MESSAGE)}`);
      }
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    if (data.session) {
      // A session exists immediately — only possible when email
      // confirmation is disabled in the project (not our production
      // setting). The account is signed in with an empty profile; the
      // layout gate routes it into onboarding on the next render.
      redirect("/");
    }

    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      // Supabase's deliberate obfuscation: signing up with an email that
      // already belongs to a CONFIRMED account returns a user object
      // with an empty identities array and no error. Sending that user
      // to check-email (the old behaviour) dead-ended them — no account
      // was created and the email they needed was the login page, not a
      // confirmation link. Route them there with the neutral message.
      redirect(`/login?message=${encodeURIComponent(ACCOUNT_EXISTS_MESSAGE)}`);
    }

    // No session: email confirmation is pending. The account exists but
    // grants NO access — the user lands on the explicit check-email state
    // and must click the link in the confirmation email before they can
    // log in.
    redirect(`/signup/check-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell backHref="/">
      <div className="mt-2">
        <BrandHeader />
      </div>

      <h1 className="mt-9 text-4xl font-black text-ink">Join Plaiyo</h1>
      <p className="mt-2 font-semibold leading-relaxed text-muted">
        Create your account, confirm your email, and find people to play
        with.
      </p>

      {params.error && (
        <p role="alert" className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
          {params.error}
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

      <form action={signup} className="mt-6 space-y-4">
        <TextField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="alex@email.com"
          icon={<EnvelopeIcon />}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-4 font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25"
        >
          Create my account
        </button>
      </form>

      <p className="mt-9 text-center font-semibold text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-black text-primary">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
