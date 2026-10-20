import Link from "next/link";
import { resendConfirmation } from "@/lib/resendConfirmation";
import AuthShell from "@/components/AuthShell";
import BrandHeader from "@/components/BrandHeader";

/**
 * Post-signup pending-confirmation state. With "Confirm email" ON, signUp
 * returns no session: the account exists but grants no access until the
 * user clicks the link in the confirmation email. This page says exactly
 * that — no dashboard, no ambiguity — and offers a resend.
 */
export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";

  return (
    <AuthShell backHref="/signup">
      <div className="mt-2">
        <BrandHeader />
      </div>

      <h1 className="mt-9 text-4xl font-black text-ink">Confirm your email</h1>
      <p className="mt-2 font-semibold leading-relaxed text-muted">
        Your account was created
        {email ? (
          <>
            {" "}
            for <span className="font-black text-ink">{email}</span>
          </>
        ) : (
          ""
        )}
        . We sent you a confirmation email — click the link in it to confirm
        your address, then log in.
      </p>

      <p className="mt-5 rounded-2xl bg-lime/25 px-4 py-3 font-bold text-ink">
        You can&rsquo;t access your dashboard until your email is confirmed.
      </p>

      {params.error && (
        <p role="alert" className="mt-6 rounded-2xl bg-coral/15 px-4 py-3 font-bold text-coral">
          {params.error}
        </p>
      )}
      {params.message && (
        <p className="mt-6 rounded-2xl bg-lime/25 px-4 py-3 font-bold text-ink">
          {params.message}
        </p>
      )}

      <Link
        href="/login"
        className="mt-8 block w-full rounded-full bg-primary py-4 text-center font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25"
      >
        Go to log in
      </Link>

      {email && (
        <form action={resendConfirmation} className="mt-6 text-center">
          <input type="hidden" name="email" value={email} />
          <input
            type="hidden"
            name="back"
            value={`/signup/check-email?email=${encodeURIComponent(email)}`}
          />
          <p className="font-semibold text-muted">
            Didn&rsquo;t get it?{" "}
            <button type="submit" className="font-black text-primary">
              Resend the confirmation email
            </button>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
