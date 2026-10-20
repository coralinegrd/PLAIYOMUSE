import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service — Plaiyo" };

/**
 * Draft terms, published so the landing page's Terms link resolves.
 * Short and factual; a full legal review is still to come before any
 * large public launch.
 */
export default function TermsPage() {
  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm font-black text-primary">
        ← Back
      </Link>
      <h1 className="text-3xl font-black text-ink">Terms of Service</h1>
      <p className="rounded-2xl bg-lime/25 px-4 py-3 text-sm font-bold text-ink">
        Draft — last updated October 20, 2026. Plaiyo is in early access;
        these terms will be updated before the full public launch.
      </p>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">The service</h2>
        <p>
          Plaiyo helps you find people to play sports with near you: you can
          discover local sessions, join them, and host your own.
        </p>
      </section>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">Your account</h2>
        <p>
          You need an account with a confirmed email address to use Plaiyo.
          You are responsible for the activity on your account and for
          keeping your password to yourself.
        </p>
      </section>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">Sessions</h2>
        <p>
          Hosts set the details of their sessions (sport, time, place,
          capacity) and are responsible for running them. Joining a session
          is free unless the host sets a price; during this early-access
          pilot, any payment for a paid session is arranged outside the app
          unless the app says otherwise.
        </p>
      </section>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">Conduct</h2>
        <p>
          Be respectful, show up when you commit or cancel in time, and do
          not harass other users. We may suspend or remove accounts that
          misuse the service or put other users at risk.
        </p>
      </section>

      <section className="space-y-2 font-semibold leading-relaxed text-ink/80">
        <h2 className="text-lg font-black text-ink">Availability</h2>
        <p>
          During early access the service is provided &ldquo;as is&rdquo;,
          may change, and may occasionally be unavailable. Play at your own
          risk and use common sense when meeting for a session.
        </p>
      </section>
    </div>
  );
}
