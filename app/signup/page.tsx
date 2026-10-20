import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
        // the Supabase Auth settings (see README). Until the user clicks the
        // link in the email, they have no session.
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
    <div className="space-y-6 pt-10">
      <div className="rounded-3xl bg-navy p-6 text-warm-white">
        <p className="text-3xl font-black">Join Plaiyo</p>
        <p className="mt-2 font-semibold text-warm-white/80">
          Create your account, confirm your email, and find people to play
          with.
        </p>
      </div>

      {params.error && (
        <p role="alert" className="rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
          {params.error}
        </p>
      )}

      <form action={signup} className="space-y-3">
        <label className="block">
          <span className="text-sm font-bold text-muted">Display name</span>
          <input
            name="display_name"
            required
            autoComplete="name"
            className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 font-semibold outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-muted">City</span>
          <input
            name="city"
            placeholder="Montréal"
            autoComplete="address-level2"
            className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 font-semibold outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 font-semibold outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold text-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 font-semibold outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-3 font-black text-white"
        >
          Create my account
        </button>
      </form>

      <p className="text-center font-semibold text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-black text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}
