import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";
import {
  PATHNAME_HEADER,
  isGateExemptPath,
  isProfileComplete,
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Profile-completion gate. Email signups provide a display name and a
  // city up front, so they pass instantly; Google sign-ins arrive with an
  // empty profile and must complete it before reaching any app route.
  // Every page renders inside this layout, so gating here covers the
  // whole app (route handlers — /auth/*, /discover/set-city — don't
  // render a layout and are the sanctioned escape hatches: the callback
  // must be reachable to finish signing in, and set-city just bounces
  // to /discover, which is gated like everything else).
  //
  // Loop safety: /complete-profile and the public/auth pages are exempt
  // (isGateExemptPath), so the redirect target itself never redirects
  // for incompleteness; and if the pathname header is missing (a render
  // context the proxy didn't stamp — it stamps every page request), the
  // gate stays open rather than risk trapping the user in a loop it
  // can't verify an exit from.
  let profileComplete = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, city")
      .eq("id", user.id)
      .maybeSingle();
    profileComplete = isProfileComplete(profile);

    if (!profileComplete) {
      const pathname = (await headers()).get(PATHNAME_HEADER);
      if (pathname && !isGateExemptPath(pathname)) {
        redirect("/complete-profile");
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
        {/* No nav until the profile is complete: until then every app
            route bounces to /complete-profile anyway, and the gate
            screen belongs to the (nav-less) auth family. */}
        {user && profileComplete && <BottomNav />}
      </body>
    </html>
  );
}
