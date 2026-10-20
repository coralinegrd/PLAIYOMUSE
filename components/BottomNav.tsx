"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CompassIcon,
  HomeIcon,
  MessageIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

const ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/discover", label: "Discover", Icon: CompassIcon },
  { href: "/crews", label: "Crews", Icon: UsersIcon },
  { href: "/messages", label: "Messages", Icon: MessageIcon },
  { href: "/profile", label: "Profile", Icon: UserIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
    >
      <ul className="pointer-events-auto mx-auto flex max-w-md items-stretch justify-between rounded-[1.75rem] border border-border/60 bg-white px-2 py-1.5 shadow-[0_10px_36px_rgba(7,28,51,0.14)]">
        {ITEMS.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-lime" : "bg-transparent"
                  }`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
