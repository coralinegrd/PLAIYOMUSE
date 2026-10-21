import type { ReactNode } from "react";
import AuthShell from "./AuthShell";
import BrandHeader from "./BrandHeader";

/**
 * Chrome shared by the three onboarding steps (name → city → sports):
 * the auth family's shell and brand header, the step heading with its
 * supporting copy, and a discreet progress indicator (« Step X of 3 »
 * plus three dots, filled up to the current step). Presentational only
 * — each step page owns its guard, its data and its form.
 *
 * The back arrow is AuthShell's; each step points it at the previous
 * step (or "/" for the first), and because every step's values are
 * saved server-side and prefilled on render, going back never loses
 * progress.
 */
export default function OnboardingShell({
  backHref,
  step,
  heading,
  subcopy,
  children,
}: {
  backHref: string;
  step: 1 | 2 | 3;
  heading: string;
  subcopy?: string;
  children: ReactNode;
}) {
  return (
    <AuthShell backHref={backHref}>
      <div className="mt-2">
        <BrandHeader />
      </div>

      <div className="mt-9 flex items-center gap-3">
        <p className="text-xs font-extrabold uppercase tracking-widest text-muted">
          Step {step} of 3
        </p>
        <div className="flex items-center gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`h-2 w-2 rounded-full ${
                n <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      <h1 className="mt-3 text-4xl font-black text-ink">{heading}</h1>
      {subcopy && (
        <p className="mt-2 font-semibold leading-relaxed text-muted">
          {subcopy}
        </p>
      )}

      {children}

      {/* Escape hatch for a wrong-account sign-in: /auth/signout is a
          POST route handler, reachable regardless of the gate. */}
      <form action="/auth/signout" method="post" className="mt-9 text-center">
        <p className="font-semibold text-muted">
          Not you?{" "}
          <button type="submit" className="font-black text-primary">
            Log out
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
