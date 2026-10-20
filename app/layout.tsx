import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <html lang="en">
      <body
        className={`${nunito.variable} overflow-x-clip bg-soft text-ink antialiased`}
        style={{ fontFamily: "var(--font-plaiyo), Nunito, sans-serif" }}
      >
        <main className="mx-auto min-h-dvh w-full max-w-md px-4 pt-6 pb-24">
          {children}
        </main>
        {user && <BottomNav />}
      </body>
    </html>
  );
}
