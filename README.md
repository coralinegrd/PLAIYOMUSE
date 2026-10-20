# Plaiyo — production app

Plaiyo is a social sports app: find people to play sports with, locally —
join a session near you or host your own (running, padel, tennis, yoga and
70+ other sports). This repository is the **real, multi-user production
codebase**. The Muse artifact (`plaiyo-v1-web`) remains the design and
functional reference only; this is the product that ships on Coraline's own
accounts.

**Working stack decision** (made 2026-10-20):

- **Next.js** (App Router, TypeScript) + **Tailwind CSS v4** — one codebase
  for the mobile-first web app / PWA.
- **Supabase** as the single backend: Auth (email + password, **email
  verification as a hard gate**), Postgres with **Row Level Security**,
  Realtime for chat, Storage later for avatars/photos.
- **Deployment target: Vercel** (app) + **Supabase Cloud** (backend), on
  Coraline's own accounts, with her own domain.

No fabricated data anywhere: every screen reads real rows from the database
and shows an explicit empty state when there is nothing yet.

---

## Architecture overview

```
app/                    Next.js App Router routes (Server Components first)
  page.tsx              Home — greeting, Next game, Happening near you
  discover/             Discover — city from profile (no GPS gate), search,
                        quick filters, real sessions, 3 explicit empty states
  sessions/new/         Create a session — 3-step flow (sport / when & where /
                        final details), running pace+distance validation
  sessions/[id]/        Session detail — roster, join / leave / waitlist
  crews/                Crews — My crews · N / Discover tabs
  messages/             Messages — Direct / Games conversation lists (RLS)
  profile/              Profile — edit profile + my sports, Hosting list
  login/ signup/        Auth screens (Server Actions)
  auth/callback/        Email-confirmation code exchange
  auth/signout/         Sign-out route handler
components/
  BottomNav.tsx         Home · Discover · Crews · Messages · Profile
  SessionCard.tsx       Session card used by Home and Discover
lib/supabase/
  client.ts             Browser client (Client Components)
  server.ts             Server client (Server Components / Actions)
  middleware.ts         Session refresh + protected-route redirect helper
lib/sessionCounts.ts    "Spots left" counts from the aggregate counts view
proxy.ts                Next 16 proxy: runs the session helper on every app request
supabase/
  migrations/           SQL migrations: schema, RLS, sports taxonomy seed
  config.toml           Supabase CLI config (email confirmations ON)
```

Design tokens come from Plaiyo's visual guide v1.0 and live in
`app/globals.css` (`@theme`): Deep navy `#071C33`, Midnight `#0B2340`,
Electric blue `#165DFF` (primary, solid — never a gradient), Bright cobalt
`#244BDB`, lime `#B6F500` as an accent only (~10%), Warm white `#F7F8F5`,
Soft off-white `#F5F6F4`, Ink navy `#081D33`, Cool grey `#7E8996`, borders
`#DCE2E7`, error coral `#E56B6F`. Typeface: Nunito (the guide's documented
fallback for Sofia Pro Soft), bold weights, pill buttons. No dating-app
vocabulary or patterns anywhere: the words are **session** and **crew**.

## Data model

All tables are in `public`, created by
`supabase/migrations/20261020000001_init.sql`; the sports taxonomy is seeded
by `20261020000002_seed_sports.sql`.

| Table | Purpose |
|---|---|
| `profiles` | One row per auth user (`id = auth.users.id`), created automatically by a trigger on signup. Display name, city, neighbourhood, bio, avatar. |
| `sports` | Reference taxonomy: 11 categories, 77 unique sports, `photo_url` per sport (photo licences must be verified before a URL is set in production). |
| `user_sports` | Which sports a user plays + level (beginner / intermediate / advanced). |
| `follows` | Social graph (follower → following). Direct chats start from people you follow. |
| `sessions` | A hosted outing: sport, title, location, city, `starts_at`, duration, capacity, `price_cents` + `currency`, `is_paid`, `women_only`, `recurring`, `host_attends`, `skill_level`, `status`. `average_pace` (MM:SS), `distance_value` (≥ 0.1), `distance_unit` (`km`/`mile`) exist only for Running, Trail Running and Track & Field — enforced by CHECK constraints and a trigger. |
| `participations` | Session roster: `confirmed` or `waitlist`, unique per (session, user). Capacity, waitlist assignment and promotion are enforced by database triggers (clients cannot count the roster under RLS); the `session_participation_counts` view exposes aggregate confirmed/waitlist counts without exposing who participates. |
| `crews` / `crew_members` | Crews (name, sport, city, creator) and their members. |
| `conversations` | `kind = 'direct'` or `'session'` (session conversations require a `session_id`). |
| `conversation_participants` | Who is in a conversation. |
| `messages` | Chat messages; published to Supabase Realtime. |
| `blocks` / `reports` | Safety: user blocks and reports, private to their author. |

`sessions` also enforces `is_paid = (price_cents > 0)`. A host's own
sessions are excluded from "Happening near you" in the Home query (product
rule from Coraline).

## How RLS protects the data

Row Level Security is enabled on **every** table, and the app only ever
uses the public anon key + the user's own JWT — policies do the work:

- **profiles**: publicly readable (social app); you can only update/delete
  your own row. Inserts happen through the signup trigger.
- **sports**: publicly readable; no client writes.
- **user_sports / follows**: readable; you only write rows where you are
  the actor.
- **sessions**: readable by authenticated users; only the host can create,
  update or delete their sessions.
- **participations**: you manage your own; the session's host can read and
  manage the roster of their sessions. Because everyone else's rows stay
  hidden, capacity checks, waitlist promotion and "spots left" counts run
  inside the database (security-definer triggers + the aggregate counts
  view) — never by counting rows on the client.
- **crews / crew_members**: readable by authenticated users; creators
  manage their crews; you join/leave as yourself.
- **conversations / messages**: only participants can read a conversation
  or its messages (`is_conversation_participant()` helper); the creator
  can also read a conversation they just created, so its id can be
  returned while participants are attached. You can only send messages
  as yourself, as a participant. Realtime respects the same policies —
  a user only receives message rows they could select.
- **blocks / reports**: strictly private — only their author can read them.

Email verification is a **hard gate**: enable "Confirm email" in the
Supabase dashboard (Authentication → Providers → Email) and in
`supabase/config.toml` (`enable_confirmations = true`). Unconfirmed users
get no session, and the proxy redirects any unauthenticated request for an
app route to `/login`.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in YOUR Supabase URL + anon key
npm run dev                  # http://localhost:3000
```

You need a Supabase project first (next section) and the migrations applied,
otherwise the queries return errors and Discover shows its "temporarily
unavailable" state — by design, never fake data.

## Deployment — on Coraline's own accounts

1. **Create the Supabase project**
   - supabase.com → New project (name: Plaiyo, region closest to users,
     e.g. Canada / US East). Set a strong database password and store it in
     a password manager — do not paste it into code, chat or tickets.
   - Authentication → Providers → Email: **enable "Confirm email"**.
   - Authentication → URL configuration: set Site URL to your production
     domain and add `https://YOUR-DOMAIN/auth/callback` to redirect URLs
     (add `http://localhost:3000/auth/callback` for local dev).

2. **Run the migrations**
   - With the Supabase CLI:
     ```bash
     npm i -g supabase        # or use npx supabase
     supabase link --project-ref YOUR-PROJECT-REF
     supabase db push
     ```
     This applies `20261020000001_init.sql` (schema + RLS + realtime) and
     `20261020000002_seed_sports.sql` (77 sports).
   - Alternative without the CLI: paste each migration file, in order,
     into the Supabase dashboard SQL editor and run them.
   - Verify in the dashboard: Table Editor shows the tables, and
     Database → Publications shows `messages` in `supabase_realtime`.

3. **Create the Vercel project**
   - vercel.com → Add New → Project → import this repository (push it to
     your GitHub first), framework preset: Next.js, root directory: repo
     root.
   - Environment Variables (Production + Preview):
     - `NEXT_PUBLIC_SUPABASE_URL` = your project URL
       (Supabase dashboard → Project Settings → API)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key (same page)
     - `NEXT_PUBLIC_SITE_URL` = `https://YOUR-DOMAIN` (used for the email
       confirmation redirect)
   - Deploy. Then set the same production URL as the Supabase Site URL
     (step 1) if you used a temporary `*.vercel.app` domain first.

4. **Connect your domain**
   - Vercel project → Settings → Domains → add your domain and follow the
     DNS instructions at your registrar.
   - Update: Supabase Site URL + redirect URLs, and
     `NEXT_PUBLIC_SITE_URL` on Vercel, then redeploy.

5. **Smoke test with two accounts**
   - Sign up with email A, confirm via the email link, complete the
     profile (city!), create a session.
   - Sign up with email B in a private window, confirm, open Discover:
     A's session must appear; join it; check the roster on the session
     page; confirm A's own session does **not** appear in A's
     "Happening near you".

## What is built vs what remains

**Built in these foundations**

- Full schema + RLS + Realtime publication for messages; sports taxonomy
  seeded (77 sports, 11 categories).
- Auth: signup with email verification gate, login, logout, email
  callback; profiles auto-created on signup; proxy-based session refresh +
  protected routes.
- Home (Next game, Happening near you excluding own sessions), Discover
  (profile-city based, search, minimal quick filters, real data, explicit
  empty/error states), session detail with join/leave/waitlist + automatic
  waitlist promotion (capacity and promotion enforced by database
  triggers, occupancy shown via a privacy-preserving aggregate view),
  3-step Create-a-session flow with running pace
  (MM:SS) and distance (≥ 0.1, km/mile only) validation on client, server
  and database, Crews lists (My crews / Discover), Messages conversation
  lists (Direct / Games), Profile editing incl. my sports and Hosting.

**Remains to build**

- **Full chat UI**: thread view, sending messages, realtime subscription
  in the browser (the tables, policies and realtime publication are ready;
  `app/messages` currently lists conversations only).
- **Direct conversation creation** from a profile / follows ("Start a new
  chat"), follow/unfollow UI.
- **Stripe Connect payments** for paid sessions (data model already
  carries `price_cents`, `currency`, `is_paid`; the 5% Plaiyo commission
  is displayed in the creation flow, and during the pilot payment happens
  off-platform — no money moves in the app yet).
- **Push notifications** and reminder emails.
- **Avatars and sport photos in Supabase Storage** (photo licences must be
  individually verified before use, as done for the prototype assets).
- Crew creation UI, crew admin roles, session editing/cancellation UI,
  recurring-session generation, moderation tooling for reports.

## Security rules for this project

- **Never open a private key file in an IDE** (service-account JSON,
  `.env`, certificates). An editor integration can attach the selected
  file's content automatically — this already burned a Firebase key once.
  Handle keys only through dashboards (Supabase, Vercel) and password
  managers.
- The **service role key bypasses RLS entirely**: server-only, never in
  client code, never `NEXT_PUBLIC_`. The current app code does not use it.
- `.env.local` is git-ignored; `.env.example` contains placeholder names
  only. Real values live in the Vercel dashboard and your password manager.
- Rotate any key that was ever pasted into a chat, an editor selection, or
  a ticket — treat it as compromised.
