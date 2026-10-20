import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuthShell from "@/components/AuthShell";
import BrandHeader from "@/components/BrandHeader";
import PasswordField from "@/components/PasswordField";
import TextField from "@/components/TextField";
import { EnvelopeIcon, PinIcon, UserIcon } from "@/components/icons";

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
    const displayName = String(formData.get("display_name") ?? "");
    const city = String(formData.get("city") ?? "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // display_name + city travel in the auth metadata: the signup
        // trigger copies them into the profile row, which is what makes
        // them survive email confirmation (no session exists before the
        // user clicks the confirmation link).
        data: { display_name: displayName, city },
        // Email verification is a hard gate: "Confirm email" must be ON in
        // the Supabase Auth settings (see README). Until the user clicks
        // the link in the email, they have no session.
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
      },
    });
    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    // If a session exists immediately (only when email confirmation is
    // disabled in the project — not our production setting), refresh the
    // city as well; with confirmation on, the trigger already stored it.
    if (data.user && city) {
      await supabase
        .from("profiles")
        .update({ city })
        .eq("id", data.user.id);
    }
    redirect(
      "/login?message=" +
        encodeURIComponent(
          "Account created. Check your email and confirm your address to finish signing up.",
        ),
    );
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

      <form action={signup} className="mt-8 space-y-4">
        <TextField
          label="Display name"
          name="display_name"
          required
          autoComplete="name"
          icon={<UserIcon />}
        />
        <TextField
          label="City"
          name="city"
          autoComplete="address-level2"
          placeholder="Montréal"
          icon={<PinIcon />}
        />
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
          className="w-full rounded-full bg-primary py-4 font-black text-white shadow-lg shadow-primary/25"
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
