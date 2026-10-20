import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }
    const next = String(formData.get("next") ?? "/");
    redirect(next.startsWith("/") ? next : "/");
  }

  return (
    <div className="space-y-6 pt-10">
      <div className="rounded-3xl bg-navy p-6 text-warm-white">
        <p className="text-3xl font-black">Welcome back</p>
        <p className="mt-2 font-semibold text-warm-white/80">
          Log in to find your next session.
        </p>
      </div>

      {params.error && (
        <p role="alert" className="rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
          {params.error}
        </p>
      )}
      {params.message && (
        <p className="rounded-2xl bg-lime/25 px-4 py-3 font-bold text-ink">
          {params.message}
        </p>
      )}

      <form action={login} className="space-y-3">
        <input type="hidden" name="next" value={params.next ?? "/"} />
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
            autoComplete="current-password"
            className="mt-1 w-full rounded-2xl border border-border bg-white px-3 py-3 font-semibold outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary py-3 font-black text-white"
        >
          Log in
        </button>
      </form>

      <p className="text-center font-semibold text-muted">
        New to Plaiyo?{" "}
        <Link href="/signup" className="font-black text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}
