# Heytea Swap

A Vite + React app for coordinating Heytea World Cup magnet swaps worldwide (mainland China isn't supported yet). Users can post the magnets they have and want, browse nearby listings, filter by available country magnets, message other swappers, and match into 3-person swap rings when a 1-for-1 trade isn't possible.

## Tech Stack

- React 18
- Vite
- Supabase (database, auth, realtime)
- Supabase CLI (schema migrations, edge functions if added later)
- Google Maps JavaScript API with Places autocomplete
- Vercel Analytics

## Local Setup

Install dependencies:

```powershell
npm install
```

Configure the required Vite environment variables for Supabase and Google Maps:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
VITE_GOOGLE_MAPS_KEY=your-google-maps-api-key
```

Start the dev server:

```powershell
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173/
```

## Database Setup

All schema changes live in `supabase/migrations/` as timestamped `.sql` files — this is the single source of truth for the database schema. Pick whichever of these fits your workflow; they all apply the exact same SQL.

### Option A — Supabase CLI (recommended)

The CLI tracks which migrations have already been applied per project, so re-running it is always safe.

```powershell
npx supabase login                                    # one-time, needs a personal access token from supabase.com/dashboard/account/tokens
npx supabase link --project-ref your-project-ref       # points the CLI at a specific Supabase project
npx supabase db push                                   # applies every migration not yet recorded on that project
```

Useful companions:

```powershell
npx supabase db push --dry-run          # preview what would be applied, without applying it
npx supabase migration list --linked    # compare local migrations against what the linked project has recorded
```

To add a new migration, scaffold it so it gets a proper timestamp, then edit it:

```powershell
npx supabase migration new some_change
```

### Option B — Supabase Dashboard SQL Editor (no CLI required)

Open `Supabase Dashboard -> SQL Editor -> New query` and run the contents of each file in `supabase/migrations/` **in filename order** (the timestamp prefix is the order). Every migration is written to be safe to re-run (`create table if not exists`, `drop policy if exists` before `create policy`, etc.), so running one twice is a harmless no-op.

### Option C — Any Postgres client

Grab the project's connection string from `Supabase Dashboard -> Connect`, and run the same files in order with `psql`, TablePlus, DBeaver, or similar.

### Notes

- Migrations are additive by design — they don't drop or rewrite existing data. If you need to reset a project's app data during development, run `delete from group_messages; delete from group_conversation_participants; delete from match_groups; delete from hidden_conversations; delete from messages; delete from listings;` first (leaves `profiles`/auth users intact).
- If you're maintaining a separate dev Supabase project alongside production (recommended so you're not testing against real user data), keep its credentials in a local, gitignored file — this repo's convention is `local.env.dev` — and swap `.env.local`'s `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` to point at whichever project you're running against locally.
- Deploy schema changes (`db push`) before deploying frontend code that depends on them — the app queries new tables/columns defensively, but there's no reason to have the frontend race the schema.

## Google Maps Setup

Enable these APIs in Google Cloud:

- Maps JavaScript API
- Places API

For local development, add these HTTP referrers to the API key:

```text
http://localhost:5173/*
http://127.0.0.1:5173/*
```

If Vite uses another port, add that port too.

Address search uses the Places library and is global (no country restriction) — except mainland China addresses, which the app explicitly rejects with a "not supported yet" message, since Google Maps is unreliable there. The map falls back to a non-Google map view if Google Maps is unavailable or misconfigured.

## Available Scripts

```powershell
npm run dev
```

Runs the local Vite dev server.

```powershell
npm run build
```

Builds the production bundle into `dist`.

```powershell
npm run preview
```

Serves the production build locally for preview.

## Notes

- Taking a listing offline deletes it from Supabase so it disappears from browse results.
- If saving fails, check that all migrations in `supabase/migrations/` have been applied to the current Supabase project (see Database Setup above).
- Group swap rings (3-person chains) and the group chat they create are computed live in the app — there's no background job. A ring is only visible to viewers who are actually part of it.
