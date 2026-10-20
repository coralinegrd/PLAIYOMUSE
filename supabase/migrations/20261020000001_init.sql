-- Plaiyo — initial schema (production foundations)
-- Backend: Supabase (Postgres + Auth + RLS + Realtime)
-- Conventions:
--   * Every table lives in `public` and has RLS enabled.
--   * `auth.uid()` is the current user; profiles.id == auth.users.id.
--   * No service-role key is ever used in client code.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, created by trigger on signup
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  city text not null default '',
  neighbourhood text not null default '',
  bio text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically when a user signs up (email verification is
-- enforced in Supabase Auth settings: "Confirm email" must be ON — see README).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- display_name and city travel in the signup metadata so they are stored
  -- even while the account is still unconfirmed (no session exists yet to
  -- write the profile row with).
  insert into public.profiles (id, display_name, city)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'city', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- sports — reference taxonomy (seeded in the next migration)
-- "Cross Country Skiing" appears in two UI categories in Coraline's taxonomy
-- (Running & Endurance and Winter Sports); it is stored once, under
-- Winter Sports as its primary category.
-- ---------------------------------------------------------------------------
create table public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create index sports_category_idx on public.sports (category);

-- ---------------------------------------------------------------------------
-- user_sports — which sports a user plays, and at what level
-- ---------------------------------------------------------------------------
create table public.user_sports (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete cascade,
  level text not null default 'intermediate'
    check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  created_at timestamptz not null default now(),
  primary key (profile_id, sport_id)
);

create index user_sports_sport_idx on public.user_sports (sport_id);

-- ---------------------------------------------------------------------------
-- follows — social graph (Direct chats start from people you follow)
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id);

-- ---------------------------------------------------------------------------
-- sessions — a sports outing hosted by a user
-- Pricing: price_cents = 0 and is_paid = false for free sessions.
-- Pace/distance exist only for running sports; enforced by a trigger below.
-- ---------------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  sport_id uuid not null references public.sports (id),
  title text not null,
  description text not null default '',
  location text not null default '',
  city text not null default '',
  starts_at timestamptz not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  capacity integer not null default 2 check (capacity >= 2),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'CAD',
  is_paid boolean not null default false,
  women_only boolean not null default false,
  recurring boolean not null default false,
  host_attends boolean not null default true,
  skill_level text not null default 'all'
    check (skill_level in ('all', 'beginner', 'intermediate', 'advanced')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'cancelled', 'completed')),
  average_pace text
    check (average_pace is null or average_pace ~ '^[0-9]{1,2}:[0-5][0-9]$'),
  distance_value numeric(6, 1)
    check (distance_value is null or distance_value >= 0.1),
  distance_unit text
    check (distance_unit is null or distance_unit in ('km', 'mile')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_paid = (price_cents > 0)),
  check (
    (average_pace is null and distance_value is null and distance_unit is null)
    or (average_pace is not null and distance_value is not null and distance_unit is not null)
  )
);

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

create index sessions_starts_at_idx on public.sessions (starts_at);
create index sessions_city_sport_idx on public.sessions (city, sport_id);
create index sessions_host_idx on public.sessions (host_id);

-- Pace/distance are only meaningful for running sports: Running,
-- Trail Running, Track & Field (spec from Coraline, 2026-10-20).
create or replace function public.enforce_running_fields()
returns trigger
language plpgsql
as $$
declare
  sport_name text;
begin
  if new.average_pace is null and new.distance_value is null and new.distance_unit is null then
    return new;
  end if;
  select name into sport_name from public.sports where id = new.sport_id;
  if sport_name not in ('Running', 'Trail Running', 'Track & Field') then
    raise exception 'average_pace/distance are only allowed for Running, Trail Running, Track & Field';
  end if;
  return new;
end;
$$;

create trigger sessions_running_fields
  before insert or update on public.sessions
  for each row execute function public.enforce_running_fields();

-- ---------------------------------------------------------------------------
-- participations — who joins a session (confirmed or waitlist)
-- ---------------------------------------------------------------------------
create table public.participations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'waitlist')),
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index participations_user_idx on public.participations (user_id);
create index participations_session_idx on public.participations (session_id);

-- Capacity + waitlist are enforced IN THE DATABASE, not in app code:
-- RLS (below) only lets a user read their own participations (and lets the
-- host read the roster), so a client-side count would be wrong — a visitor
-- cannot see other people's rows. These security-definer triggers see the
-- full roster and keep the invariant for every writer.
--
-- 1) On insert, the status is assigned by the database: `confirmed` while
--    the session has room, otherwise `waitlist`. The session row is locked
--    FOR UPDATE so two simultaneous joins cannot both take the last spot.
create or replace function public.assign_participation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  confirmed_count integer;
begin
  select capacity into cap
  from public.sessions
  where id = new.session_id
  for update;
  if cap is null then
    raise exception 'session % not found', new.session_id;
  end if;
  select count(*) into confirmed_count
  from public.participations
  where session_id = new.session_id and status = 'confirmed';
  new.status := case when confirmed_count < cap then 'confirmed' else 'waitlist' end;
  return new;
end;
$$;

create trigger participations_assign_status
  before insert on public.participations
  for each row execute function public.assign_participation_status();

-- 2) When a confirmed participant leaves, the earliest waitlisted user is
--    promoted automatically — no matter who initiated the delete (the
--    leaving participant cannot see other users' rows under RLS, so the
--    app cannot do this itself).
create or replace function public.promote_waitlist_after_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
begin
  if old.status <> 'confirmed' then
    return old;
  end if;
  select id into next_id
  from public.participations
  where session_id = old.session_id and status = 'waitlist'
  order by created_at asc
  limit 1
  for update;
  if next_id is not null then
    update public.participations
    set status = 'confirmed'
    where id = next_id;
  end if;
  return old;
end;
$$;

create trigger participations_promote_waitlist
  after delete on public.participations
  for each row execute function public.promote_waitlist_after_leave();

-- Aggregate counts for session cards, WITHOUT exposing who participates:
-- RLS still hides individual rows from non-hosts, but anyone signed in can
-- see how full a session is. The view runs with its owner's rights (the
-- migration role), so it counts every row; it only exposes numbers.
create view public.session_participation_counts as
select
  p.session_id,
  (count(*) filter (where p.status = 'confirmed'))::int as confirmed_count,
  (count(*) filter (where p.status = 'waitlist'))::int as waitlist_count
from public.participations p
group by p.session_id;

grant select on public.session_participation_counts to authenticated;

-- ---------------------------------------------------------------------------
-- crews + crew_members
-- ---------------------------------------------------------------------------
create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sport_id uuid references public.sports (id),
  city text not null default '',
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger crews_set_updated_at
  before update on public.crews
  for each row execute function public.set_updated_at();

create index crews_city_idx on public.crews (city);
create index crews_sport_idx on public.crews (sport_id);

create table public.crew_members (
  crew_id uuid not null references public.crews (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

create index crew_members_user_idx on public.crew_members (user_id);

-- ---------------------------------------------------------------------------
-- conversations + participants + messages — real chat (Direct and session)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'session')),
  session_id uuid references public.sessions (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'session') = (session_id is not null))
);

create index conversations_session_idx on public.conversations (session_id);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_idx
  on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

-- Is the current user a participant of a conversation? Used by RLS below.
create or replace function public.is_conversation_participant(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv and user_id = auth.uid()
  );
$$;

-- Keep session conversations in sync with the roster: whenever a
-- participation is (or becomes) confirmed and the session already has a
-- conversation, the user is in it. Runs as security definer because the
-- acting user may not read other participants' rows under RLS (e.g. the
-- waitlist promotion above happens inside the leaving user's request).
-- Note: the create-session action also adds the host to the conversation
-- explicitly, so a host who does not attend the session still follows its
-- chat; the duplicate insert this can cause is absorbed by ON CONFLICT.
create or replace function public.sync_session_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conv_id uuid;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;
  select id into conv_id
  from public.conversations
  where kind = 'session' and session_id = new.session_id
  limit 1;
  if conv_id is not null then
    insert into public.conversation_participants (conversation_id, user_id)
    values (conv_id, new.user_id)
    on conflict (conversation_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger participations_sync_conversation
  after insert or update of status on public.participations
  for each row execute function public.sync_session_conversation_member();

-- ---------------------------------------------------------------------------
-- blocks + reports — safety. Private to their author.
-- ---------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index reports_reporter_idx on public.reports (reporter_id);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- ===========================================================================
alter table public.profiles enable row level security;
alter table public.sports enable row level security;
alter table public.user_sports enable row level security;
alter table public.follows enable row level security;
alter table public.sessions enable row level security;
alter table public.participations enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- profiles: public read (social app), write only your own row
create policy "profiles are publicly readable"
  on public.profiles for select using (true);
create policy "users update their own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users delete their own profile"
  on public.profiles for delete using (auth.uid() = id);
-- (inserts happen through the signup trigger; no client insert policy)

-- sports: reference data, readable by everyone, no client writes
create policy "sports are publicly readable"
  on public.sports for select using (true);

-- user_sports: readable by all (shown on profiles), write only your own
create policy "user sports are publicly readable"
  on public.user_sports for select using (true);
create policy "users manage their own sports"
  on public.user_sports for insert with check (auth.uid() = profile_id);
create policy "users update their own sports"
  on public.user_sports for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "users delete their own sports"
  on public.user_sports for delete using (auth.uid() = profile_id);

-- follows: graph is public read; you only follow/unfollow as yourself
create policy "follows are publicly readable"
  on public.follows for select using (true);
create policy "users follow as themselves"
  on public.follows for insert with check (auth.uid() = follower_id);
create policy "users unfollow as themselves"
  on public.follows for delete using (auth.uid() = follower_id);

-- sessions: readable by authenticated users; only the host writes
create policy "sessions readable by authenticated users"
  on public.sessions for select to authenticated using (true);
create policy "hosts create their own sessions"
  on public.sessions for insert to authenticated with check (auth.uid() = host_id);
create policy "hosts update their own sessions"
  on public.sessions for update to authenticated
  using (auth.uid() = host_id) with check (auth.uid() = host_id);
create policy "hosts delete their own sessions"
  on public.sessions for delete to authenticated using (auth.uid() = host_id);

-- participations: the participant manages theirs; the session host can see
-- and manage the roster of their own sessions
create policy "participants and hosts can read participations"
  on public.participations for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );
create policy "users join sessions as themselves"
  on public.participations for insert to authenticated
  with check (auth.uid() = user_id);
create policy "participants and hosts can update participations"
  on public.participations for update to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );
create policy "participants and hosts can delete participations"
  on public.participations for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.sessions s
      where s.id = session_id and s.host_id = auth.uid()
    )
  );

-- crews: readable by authenticated users; creator manages the crew,
-- membership changes go through crew_members below
create policy "crews readable by authenticated users"
  on public.crews for select to authenticated using (true);
create policy "users create crews as themselves"
  on public.crews for insert to authenticated with check (auth.uid() = created_by);
create policy "crew creators update their crews"
  on public.crews for update to authenticated
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "crew creators delete their crews"
  on public.crews for delete to authenticated using (auth.uid() = created_by);

create policy "crew members are readable by authenticated users"
  on public.crew_members for select to authenticated using (true);
create policy "users join crews as themselves"
  on public.crew_members for insert to authenticated with check (auth.uid() = user_id);
create policy "users leave crews as themselves"
  on public.crew_members for delete to authenticated using (auth.uid() = user_id);

-- conversations: only participants can see a conversation
create policy "participants can read their conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));
-- The creator must be able to read the row they just inserted (PostgREST
-- INSERT ... RETURNING applies the SELECT policy) — otherwise creating a
-- conversation could never return its id to attach the participants.
create policy "creators can read their own conversations"
  on public.conversations for select to authenticated
  using (auth.uid() = created_by);
create policy "authenticated users can create conversations"
  on public.conversations for insert to authenticated
  with check (auth.uid() = created_by);

create policy "participants can read conversation participants"
  on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy "users add themselves or are added by a participant"
  on public.conversation_participants for insert to authenticated
  with check (
    auth.uid() = user_id
    or public.is_conversation_participant(conversation_id)
  );
create policy "users can remove themselves from conversations"
  on public.conversation_participants for delete to authenticated
  using (auth.uid() = user_id);

-- messages: strictly participants only, send only as yourself
create policy "participants can read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));
create policy "participants can send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_conversation_participant(conversation_id)
  );

-- blocks + reports: private to their author
create policy "users read their own blocks"
  on public.blocks for select to authenticated using (auth.uid() = blocker_id);
create policy "users create their own blocks"
  on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);
create policy "users remove their own blocks"
  on public.blocks for delete to authenticated using (auth.uid() = blocker_id);

create policy "users read their own reports"
  on public.reports for select to authenticated using (auth.uid() = reporter_id);
create policy "users create reports as themselves"
  on public.reports for insert to authenticated with check (auth.uid() = reporter_id);

-- ---------------------------------------------------------------------------
-- Realtime: stream new messages to conversation participants.
-- (RLS still applies to Realtime: a user only receives rows they can select.)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
