# Heytea Swap

A Vite + React app for coordinating Heytea World Cup magnet swaps across North America. Users can post the magnets they have and want, browse nearby listings, filter by available country magnets, and message other swappers.

## Tech Stack

- React 18
- Vite
- Supabase database and realtime
- Google Maps JavaScript API with Places autocomplete

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

For a new deployment, start with a clean Supabase database. Create a fresh Supabase project, then run the full SQL in `supabase-schema.sql` once:

```text
Supabase Dashboard -> SQL Editor -> New query
```

The schema creates and updates the `listings` and `messages` tables, enables row-level security policies, and adds realtime/index setup.

For an existing database, migrate once by running the latest `supabase-schema.sql` one time. The schema includes `if not exists` guards for tables, columns, policies, realtime setup, and indexes, so it is safe for the current migration path. Do not reset production data unless you intentionally want to remove all listings and messages.

Recommended flow:

1. New project: clean Supabase database -> run `supabase-schema.sql` once.
2. Existing project: back up data -> run the latest `supabase-schema.sql` once as a migration.
3. After schema changes: refresh the app and test posting, browsing, and chat.

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

Address and city autocomplete use the Places library. The map falls back to a non-Google map view if Google Maps is unavailable or misconfigured.

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
- If saving fails, check that `supabase-schema.sql` has been run against the current Supabase project.
