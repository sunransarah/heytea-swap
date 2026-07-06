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

Use the Supabase SQL Editor:

```text
Supabase Dashboard -> SQL Editor -> New query
```

To start from a clean app database, run this cleanup script first:

```sql
drop table if exists messages cascade;
drop table if exists listings cascade;
```

Then run the full contents of `supabase-schema.sql` once in the same SQL Editor.

The cleanup script deletes all app listings and chat messages. Use it only when resetting the app database.

Then refresh the app and test posting, browsing, and chat.

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
