-- Plaiyo — gender on profiles + women-only session enforcement
-- Decision (Coraline, 2026-10-21): onboarding collects gender
-- ('man' / 'woman' / 'non_binary') for exactly one product rule: men
-- must not be able to join women-only sessions ('woman' and
-- 'non_binary' may join). Gender is never displayed publicly — it is
-- read only by its owner (onboarding, profile edit), the join flow,
-- and the trigger below. Date of birth remains uncollected.
--
-- No backfill: existing profiles keep gender = NULL. A NULL gender
-- never blocks a join at the database level (legacy rows are
-- grandfathered here); the app gate treats NULL as an incomplete
-- onboarding and routes the user through the name step, which now
-- includes the gender choice, so in practice every active account
-- ends up with a value.
--
-- handle_new_user is deliberately untouched: no auth metadata source
-- for gender exists.

-- ---------------------------------------------------------------------------
-- profiles.gender
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column gender text
  check (gender is null or gender in ('man', 'woman', 'non_binary'));

-- ---------------------------------------------------------------------------
-- Women-only eligibility, enforced in the database
--
-- A BEFORE INSERT trigger on participations, sibling to
-- participations_assign_status (the capacity trigger): when the
-- target session is women_only, the joining user is not the session's
-- host, and the joiner's profile gender is 'man', the insert is
-- refused with an exception. Host attendance rows are exempt — the
-- host created the session.
--
-- security definer, like the capacity trigger, so the lookups see the
-- real session/profile rows regardless of the caller's RLS view. The
-- exception aborts the insert before any row exists, so no status is
-- ever assigned to a refused join; the waitlist promotion path only
-- UPDATEs existing rows and is unaffected.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_women_only_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_host uuid;
  session_women_only boolean;
  joiner_gender text;
begin
  select host_id, women_only into session_host, session_women_only
  from public.sessions
  where id = new.session_id;

  -- Not a women-only session (or no such session — the capacity
  -- trigger reports that case): nothing to enforce.
  if session_women_only is distinct from true then
    return new;
  end if;

  -- The host's own attendance row always passes.
  if new.user_id = session_host then
    return new;
  end if;

  select gender into joiner_gender
  from public.profiles
  where id = new.user_id;

  if joiner_gender = 'man' then
    raise exception 'This is a women-only session.';
  end if;
  return new;
end;
$$;

create trigger participations_women_only_eligibility
  before insert on public.participations
  for each row execute function public.enforce_women_only_eligibility();
