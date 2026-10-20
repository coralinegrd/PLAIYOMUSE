import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./icons";

/**
 * Visual shell shared by the logged-out auth screens (login, signup,
 * forgot/reset password), following Coraline's reference: soft off-white
 * background, a big Electric Blue curve sweeping the top-right corner, a
 * small lime sliver on the right edge, and a back arrow in a white circle
 * at the top-left. Content stays in the layout's centered column
 * (max-w-md ≈ the reference's ~440px desktop column).
 */
export default function AuthShell({
  backHref,
  children,
}: {
  backHref: string;
  children: ReactNode;
}) {
  return (
    <div>
      {/* Corner decorations, fixed to the viewport so they frame the
          screen at every width (mobile and desktop alike). */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-36 -top-36 h-80 w-80 rounded-full bg-primary" />
        <div className="absolute right-0 top-[36%] h-28 w-2.5 rounded-l-full bg-lime" />
      </div>

      <div className="relative">
        <Link
          href={backHref}
          aria-label="Back"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-white text-ink shadow-md shadow-navy/5"
        >
          <ArrowLeftIcon />
        </Link>
        {children}
      </div>
    </div>
  );
}
