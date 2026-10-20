import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy — Plaiyo" };

/**
 * Draft privacy policy, published so the landing page's Privacy Policy
 * link resolves. It describes only the data the app actually collects
 * today (accounts, profiles, sessions, messages) and will be replaced by
 * a reviewed policy before any large public launch.
 */
export default function PrivacyPage() {
  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm font-black text-primary">
        ← Back
      </Link>
      <h1 className="text-3xl font-black text-ink">Privacy Policy</h1>
      <p className="rounded-2xl bg-lime/25 px-4 py-3 text-sm font-bold text-ink">
        Draft — last updated October 20, 2026. Plaiyo is in early access;
        this policy will be updated before the full public launch.
      </p>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">What we collect</h2>
        <p>
          Your email address and password (for your account), your display
          name and city (for your profile), the sports and levels you pick,
          the sessions you create or join, and the messages you send in
          session and direct conversations.
        </p>
      </section>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">Why we collect it</h2>
        <p>
          To run your account, show you sessions near you, let hosts and
          participants coordinate, and keep the community safe. Your email
          is used for sign-in, email confirmation and password reset; we do
          not send marketing email without your consent.
        </p>
      </section>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">Where it lives</h2>
        <p>
          Account and app data are stored with our database and
          authentication provider (Supabase), and the app itself is hosted
          on Vercel. Other signed-in users can see your display name, city,
          sports and the sessions you host or join — that is how Plaiyo
          works.
        </p>
      </section>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">Your choices</h2>
        <p>
          You can edit your profile and city at any time in the app. To
          request access to, correction of, or deletion of your personal
          data, reach out through the contact options shown in the app and
          we will handle your request.
        </p>
      </section>
    </div>
  );
}
