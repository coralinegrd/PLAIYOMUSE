import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import {
  PATHNAME_HEADER,
  firstIncompleteStep,
  isGateExemptPath,
  loadOnboardingBasics,
  onboardingStepPath,
} from "@/lib/profileGate";

// Plaiyo typeface: Sofia Pro Soft in the brand guide; Nunito is the
// documented rounded fallback and is what we load here.
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-plaiyo",
});

// Every Plaiyo route is personalized (it renders the signed-in user's own
// sessions, crews and conversations), so routes are allowed to block on
// per-request data instead of producing a static shell. See the Next.js
// route-segment docs for `instant` with Cache Components enabled.
export const instant = false;

export const metadata: Metadata = {
  title: "Plaiyo — Find people to play sports with",
  description:
    "Plaiyo helps you find sports partners nearby and join or host local sessions: running, padel, tennis, yoga and more.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Everything below depends on the incoming request (the Supabase
  // session cookie), so stop prerendering here and render at request
  // time. Without this, Cache Components runs a prerender pass over the
  // layout first: the Supabase client's session load calls Date.now()
  // internally before any request-time API is touched, the prerender
  // throws ("unstable value `Date.now()` while prerendering"), and the
  // route falls back to a slow render while the browser sits on the
  // empty shell — the white screen on /complete-profile. `connection()`
  // is the documented fix for exactly this (see the connection() API
  // reference: "prerendering stops here"). `instant = false` above only
  // opts out of static-shell *validation*; it does not stop the pass.
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Onboarding gate. "Complete" is derived from the stored data (see
  // lib/profileGate.ts): a display name, a gender, a city and at least
  // one sport.
  // Google sign-ins arrive with an empty profile, and email signups no
  // longer collect anything up front, so both funnels land here and are
  // sent to their FIRST incomplete onboarding step; the step is
  // recomputed from the data on every render, which is what makes
  // resume-after-interruption exact. Every page renders inside this
  // layout, so gating here covers the whole app (route handlers —
  // /auth/*, /discover/set-city — don't render a layout and are the
  // sanctioned escape hatches: the callback must be reachable to finish
  // signing in, and set-city just bounces to /discover, which is gated
  // like everything else).
  //
  // Loop safety: /onboarding, the /complete-profile stub and the
  // public/auth pages are exempt (isGateExemptPath), so the redirect
  // target itself never redirects for incompleteness; and if the
  // pathname header is missing (a render context the proxy didn't
  // stamp — it stamps every page request), the gate stays open rather
  // than risk trapping the user in a loop it can't verify an exit from.
  let profileComplete = false;
  if (user) {
    const basics = await loadOnboardingBasics(supabase, user.id);
    const step = firstIncompleteStep(basics);
    profileComplete = step === null;

    if (step !== null) {
      const pathname = (await headers()).get(PATHNAME_HEADER);
      if (pathname && !isGateExemptPath(pathname)) {
        redirect(onboardingStepPath(step));
      }
    }
  }

  return (
    <html lang="en">
      <body
        className={`${nunito.variable} overflow-x-clip bg-soft text-ink antialiased`}
        style={{ fontFamily: "var(--font-plaiyo), Nunito, sans-serif" }}
      >
        <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-6 pb-24">
          {children}
        </main>
        {/* No nav until onboarding is complete: until then every app
            route bounces to the current onboarding step anyway, and the
            funnel screens belong to the (nav-less) auth family. */}
        {user && profileComplete && <BottomNav />}
      </body>
    </html>
  );
}
