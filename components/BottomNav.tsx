"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/discover", label: "Discover", icon: "◎" },
  { href: "/crews", label: "Crews", icon: "👥" },
  { href: "/messages", label: "Messages", icon: "💬" },
  { href: "/profile", label: "Profile", icon: "👤" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span aria-hidden className="text-lg leading-none">
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-lime" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
