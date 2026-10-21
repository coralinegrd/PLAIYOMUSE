import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ActivityIcon,
  BanIcon,
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  FlagIcon,
  GearIcon,
  GiftIcon,
  InfoIcon,
  LogoutIcon,
  PencilIcon,
  PinIcon,
  RocketIcon,
  ShieldIcon,
  StarIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
} from "@/components/icons";

/**
 * Profile hub, following Coraline's reference layout (2026-10-20): a light
 * header (avatar + name + city + sport pills), a Reliability card fed by
 * real data, then grouped menu sections. Rows backed by real pages link to
 * them (My activities, My crews, Modify my account); the sections whose
 * features do not exist on the web yet (Notifications, Ambassador, Admin,
 * Boosts, Perks…) are rendered exactly as in the mockup but INERT — plain
 * rows, no links, no fake destinations — per Coraline's explicit choice.
 */

// Soft pastel icon chips, per reference: mint green, periwinkle blue,
// lavender, pink.
const TINT = {
  mint: "bg-[#e2f6ec] text-[#1e9e62]",
  blue: "bg-[#e3ebff] text-[#244bdb]",
  lavender: "bg-[#ede8fc] text-[#7c5cd6]",
  pink: "bg-[#fbdfe1] text-[#d64550]",
} as const;

function Section({
  title,
  titleClassName = "text-muted",
  description,
  children,
}: {
  title: string;
  titleClassName?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h2
        className={`text-xs font-black tracking-widest uppercase ${titleClassName}`}
      >
        {title}
      </h2>
      {description && (
        <p className="-mt-1 text-sm font-semibold text-muted">{description}</p>
      )}
      {children}
    </section>
  );
}

function MenuCard({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-[#eef1f4] overflow-hidden rounded-3xl border border-border bg-white">
      {children}
    </div>
  );
}

function MenuRow({
  icon,
  tint,
  title,
  titleClassName = "text-ink",
  subtitle,
  href,
  chevronClassName = "text-muted/50",
}: {
  icon: ReactNode;
  tint: string;
  title: string;
  titleClassName?: string;
  subtitle?: string;
  href?: string;
  chevronClassName?: string;
}) {
  const body = (
    <>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tint}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-black ${titleClassName}`}>
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-sm font-semibold text-muted">
            {subtitle}
          </span>
        )}
      </span>
      <ChevronRightIcon className={`h-5 w-5 shrink-0 ${chevronClassName}`} />
    </>
  );
  const className = "flex items-center gap-3.5 px-4 py-3.5";
  // Inert rows keep the exact mockup visuals but are plain rows: no link,
  // no destination, nothing to tap through to.
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={`${className} cursor-default`}>{body}</div>
  );
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  // Request-time render (Supabase session read below) — see app/layout.tsx.
  await connection();

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, city, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: mySports } = await supabase
    .from("user_sports")
    .select("sports(name)")
    .eq("profile_id", user.id);

  const sportNames = (mySports ?? [])
    .map(
      (s) => (s.sports as unknown as { name: string } | null)?.name,
    )
    .filter((name): name is string => Boolean(name));

  // Reliability: REAL completed sessions — confirmed participations on
  // sessions that have already started (and were not cancelled). Only
  // 'confirmed' counts: a waitlisted spot the user never got is not a
  // session they completed.
  const { data: pastParticipations } = await supabase
    .from("participations")
    .select("id, sessions!inner(starts_at, status)")
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .lt("sessions.starts_at", new Date().toISOString())
    .neq("sessions.status", "cancelled");
  const completedCount = pastParticipations?.length ?? 0;

  // Email verified: the auth record says so for email signups that
  // clicked the confirmation link; OAuth providers (e.g. Google) verify
  // the address themselves, so their accounts count as verified too.
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [
    user.app_metadata?.provider as string,
  ];
  const emailVerified =
    Boolean(user.email_confirmed_at) ||
    providers.some((p) => p && p !== "email");

  return (
    <div className="space-y-7">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <h1 className="text-4xl font-black text-ink">Profile</h1>
          <Link
            href="/profile/edit"
            aria-label="Settings"
            className="mt-1.5 text-ink"
          >
            <GearIcon className="h-6 w-6" />
          </Link>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="h-[72px] w-[72px] rounded-full object-cover"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary text-3xl font-black text-white">
                {(profile?.display_name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <Link
              href="/profile/edit"
              aria-label="Edit profile"
              className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white ring-2 ring-soft"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="min-w-0">
            <p className="truncate text-2xl font-black text-ink">
              {profile?.display_name || "Your profile"}
            </p>
            {profile?.city && (
              <p className="mt-0.5 flex items-center gap-1 font-semibold text-muted">
                <PinIcon className="h-4 w-4" />
                {profile.city}
              </p>
            )}
          </div>
        </div>

        {sportNames.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {sportNames.map((name) => (
              <li
                key={name}
                className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-bold text-ink"
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {params.saved && (
        <p className="rounded-full bg-lime/25 px-4 py-2 text-center text-sm font-bold text-ink">
          Profile saved.
        </p>
      )}

      {/* Reliability */}
      <section className="space-y-2.5">
        <h2 className="flex items-center gap-1.5 text-xl font-black text-ink">
          Reliability
          <InfoIcon className="h-4 w-4 text-muted" />
        </h2>
        <div className="relative rounded-3xl border border-border bg-white p-4">
          <span className="absolute top-4 right-4 rounded-full bg-[#eef1f4] px-2.5 py-1 text-[10px] font-black tracking-wide text-muted">
            NEW MEMBER
          </span>
          <div className="flex items-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-soft text-primary">
              <StarIcon className="h-5 w-5" />
            </span>
            <p className="pr-16 font-semibold text-ink">
              {completedCount >= 3
                ? `You've completed ${completedCount} sessions.`
                : "Complete 3 sessions to unlock your reliability score."}
            </p>
          </div>
          {emailVerified ? (
            <p className="mt-3.5 flex items-center gap-1.5 font-bold text-[#1e9e62]">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#22b573] text-white">
                <CheckIcon className="h-3 w-3" />
              </span>
              Email verified
            </p>
          ) : (
            <p className="mt-3.5 flex items-center gap-1.5 font-bold text-muted">
              <InfoIcon className="h-[18px] w-[18px]" />
              Email not verified
            </p>
          )}
          <div className="mt-3.5 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4" />
              Attended = +1
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4" />
              Late cancel = −0.5
            </span>
            <span className="flex items-center gap-1.5">
              <BanIcon className="h-4 w-4" />
              No-show = −2
            </span>
          </div>
        </div>
      </section>

      <Section title="MY ACTIVITY">
        <MenuCard>
          <MenuRow
            href="/profile/activities"
            tint={TINT.mint}
            icon={<ActivityIcon />}
            title="My activities"
            subtitle="Games you're joining or hosting"
          />
          <MenuRow
            href="/crews"
            tint={TINT.blue}
            icon={<UsersIcon />}
            title="My crews"
            subtitle="Your regular groups"
          />
        </MenuCard>
      </Section>

      <Section title="ACCOUNT">
        <MenuCard>
          <MenuRow
            href="/profile/edit"
            tint={TINT.lavender}
            icon={<UserIcon />}
            title="Modify my account"
            subtitle="Profile info, sports, location"
          />
          <MenuRow
            tint={TINT.mint}
            icon={<BellIcon />}
            title="Notifications"
            subtitle="Push, email and in-app"
          />
        </MenuCard>
      </Section>

      <Section title="PREFERENCES">
        <MenuCard>
          <MenuRow
            tint={TINT.mint}
            icon={<ShieldIcon />}
            title="Sports & Game Alerts"
            subtitle="Sports, level, distance and more"
          />
        </MenuCard>
      </Section>

      <Section title="COMMUNITY">
        <MenuCard>
          <MenuRow
            tint={TINT.blue}
            icon={<UsersIcon />}
            title="My Crew"
            subtitle="People you've connected with"
          />
          <MenuRow
            tint={TINT.mint}
            icon={<UserPlusIcon />}
            title="Invite Friends"
            subtitle="Grow the community"
          />
        </MenuCard>
        {/* Ambassador card — rendered exactly as in the mockup, inert:
            the ambassador programme does not exist on the web yet. */}
        <div className="mt-3 flex cursor-default items-center gap-3.5 rounded-3xl bg-[#e4f7ec] px-4 py-4">
          <ActivityIcon className="h-7 w-7 shrink-0 text-[#1e9e62]" />
          <span className="min-w-0 flex-1">
            <span className="block font-black text-ink">Ambassador</span>
            <span className="block truncate text-sm font-semibold text-[#1e9e62]">
              You are now an Ambassador
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#c8f1d6] px-3 py-1.5 text-xs font-black text-[#0e7a4f]">
            Active
            <CheckIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </Section>

      <Section title="SAFETY">
        <MenuCard>
          <MenuRow
            tint={TINT.blue}
            icon={<BanIcon />}
            title="Blocked Users"
            subtitle="People you've blocked"
          />
          <MenuRow
            tint={TINT.blue}
            icon={<FlagIcon />}
            title="My Reports"
            subtitle="Reports you've submitted"
          />
        </MenuCard>
      </Section>

      <Section title="SUPPORT">
        <MenuCard>
          <MenuRow
            tint={TINT.mint}
            icon={<InfoIcon />}
            title="Help Center"
            subtitle="Guides and contact support"
          />
        </MenuCard>
      </Section>

      <Section title="ADMIN" titleClassName="text-coral">
        <div className="overflow-hidden rounded-3xl bg-[#fdeeee]">
          <MenuRow
            tint={TINT.pink}
            icon={<ShieldIcon />}
            title="Admin Dashboard"
            titleClassName="text-[#a92e38]"
            chevronClassName="text-[#d64550]"
          />
        </div>
      </Section>

      <Section
        title="PROMOTION"
        description="Promote your sessions so they appear higher in discovery for nearby players"
      >
        <MenuCard>
          <MenuRow
            tint={TINT.mint}
            icon={<RocketIcon />}
            title="My Boosts"
          />
        </MenuCard>
      </Section>

      <section className="space-y-2.5">
        <h2 className="text-xl font-black text-ink">Perks</h2>
        <p className="-mt-1 text-sm font-semibold text-muted">
          Discounts and special offers from partner brands
        </p>
        <MenuCard>
          <MenuRow
            tint={TINT.mint}
            icon={<GiftIcon />}
            title="Partner Perks"
          />
        </MenuCard>
      </section>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-black text-white shadow-lg shadow-primary/25"
        >
          <LogoutIcon className="h-5 w-5" />
          Log Out
        </button>
      </form>
    </div>
  );
}
