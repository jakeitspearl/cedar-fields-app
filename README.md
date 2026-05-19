# Cedar Fields — Field App

Mobile + web app for Cedar Fields Landscaping. Built with Next.js 16 + React 19 + Tailwind 4 + Supabase. Two surfaces:

- `/admin` — Owner dashboard (estimates, jobs, clients, invoices, receipts, QB sync)
- `/worker` — Crew app (punch in/out, log expenses with required client attribution, week history)

## Quickstart — sign in and click around

This gets you from zero to logged-in in about 5 minutes.

### 1. Local dev

```bash
git clone <your repo url>
cd cedar-fields-app
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

Without Supabase configured, the app runs in **demo mode** — mock data, no auth gating. Both `/admin` and `/worker` are open.

### 2. Set up Supabase

1. Create a project at <https://supabase.com/dashboard> (free tier is fine)
2. Copy from **Settings → API** into `.env.local`:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In **Auth → Providers → Email**, *uncheck* "Confirm email" for local development. (Re-enable for production.)
4. Open **SQL Editor**, paste and run in order:
   - `supabase/migrations/00001_init.sql` — schema + RLS
   - `supabase/migrations/00002_signup_and_storage.sql` — signup trigger + storage bucket + demo seed
5. Restart `npm run dev`.

### 3. Sign up and explore

1. Visit <http://localhost:3000> → **Create owner account**
2. Pick any email + 8+ char password
3. You land on `/admin/estimates` populated with seeded clients, estimates, jobs, invoices, and receipts
4. Click **Worker** in the sidebar role-switch to flip into the worker view
5. Open `/worker/log` and log a real receipt with a photo — it appears in `/admin/receipts` after refresh

### 4. Add a worker

Workers don't self-signup (yet). For now, create them manually from the Supabase dashboard:

```sql
-- 1. In Auth → Users, click Add user → set email + password
-- 2. Then:
update profiles
set role = 'worker', company_id = (select id from companies limit 1)
where id = '<that user's auth.users.id>';
```

The worker can now sign in at `/login` and lands on `/worker` (the owner sidebar role-switch is hidden for workers).

## Deploy to Vercel

1. Push this repo to GitHub
2. <https://vercel.com/new> → Import → pick your repo (Next.js auto-detected)
3. Add env vars from `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — used by future cron/webhook routes)
4. Deploy

## Project layout

```
app/
  page.tsx              Landing — redirects authed users to /admin or /worker
  actions.ts            Server actions (sign-out)
  login/  signup/       Auth screens
  admin/
    layout.tsx          Sidebar + mobile tab bar (loads profile)
    receipts/page.tsx     Server: queries Supabase, falls back to mock
    clients/page.tsx      Server: queries Supabase, falls back to mock
    estimates/  jobs/  invoices/    (still mock — wire next)
  worker/
    layout.tsx          Sidebar + mobile tab bar
    page.tsx            Today: punch card
    log/page.tsx        Log expense → uploads to Storage, inserts receipts row
    history/page.tsx    My week (still mock — wire next)
components/
  Sidebar.tsx           Desktop nav + sign-out
  MobileTabBar.tsx      Bottom tabs (<900px)
  Shared.tsx            TopBar, Badge, tab definitions
  screens/              Reusable list + detail screens
lib/
  data.ts               Mock fallback + types
  icons.tsx             SVG icon set
  utils.ts              money(), helpers
  supabase/
    client.ts           Browser client
    server.ts           Server-component client
    middleware.ts       Cookie refresh
    profile.ts          getSessionProfile() helper
supabase/migrations/
  00001_init.sql              Schema + RLS
  00002_signup_and_storage.sql  Auto-bootstrap + storage bucket
proxy.ts                Auth gating: redirects unauthed users from /admin and /worker
```

## What's next

In rough priority:

1. **Wire remaining admin pages** to Supabase queries (estimates, jobs, invoices)
2. **Receipt photo viewer** in admin/receipts (signed URLs from storage)
3. **Worker invite flow** (owner can add workers without using SQL)
4. **QuickBooks sync** (port `romeo-carpenter/lib/quickbooks*.ts`)
5. **Time-entry punch in/out** persists to `time_entries` table
6. **Push notifications** (port `romeo-carpenter/lib/push/`)
7. **Offline queueing** (port `romeo-carpenter/lib/offline/`)
8. **AI receipt OCR + categorization** (Anthropic API)
