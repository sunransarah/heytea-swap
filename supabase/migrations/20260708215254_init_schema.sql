-- Run this in Supabase Dashboard -> SQL Editor -> New query

-- 1. Create listings table
create table if not exists listings (
  id uuid default gen_random_uuid() primary key,
  owner_token text not null,
  nickname text not null,
  address text not null,
  have text[] not null,
  want text[] not null,
  country text default 'ca',
  city text,
  swap_areas text[] default '{}',
  expires_at timestamptz not null,
  lat float default 0,
  lng float default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- Keep older listings tables compatible with the current app.
alter table listings add column if not exists city text;
alter table listings add column if not exists country text default 'ca';
alter table listings add column if not exists swap_areas text[] default '{}';
alter table listings add column if not exists expires_at timestamptz;

update listings
set expires_at = created_at + interval '3 days'
where expires_at is null;

alter table listings alter column expires_at set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'listings'
      and column_name = 'have'
      and data_type = 'text'
  ) then
    alter table listings
      alter column have type text[]
      using case
        when have is null or have = '' then '{}'
        else array[have]
      end;
  end if;
end $$;

-- 2. Enable Row Level Security
alter table listings enable row level security;

-- 3. Anyone can read listings.
-- The app queries/displays active listings only; allowing reads here also lets realtime
-- deliver updates when a listing is marked inactive.
drop policy if exists "Public read active" on listings;
create policy "Public read active"
  on listings for select
  using (true);

-- 4. Only the signed-in owner can insert a listing under their own id.
drop policy if exists "Public insert" on listings;
drop policy if exists "Owner insert" on listings;
create policy "Owner insert"
  on listings for insert
  with check (auth.uid()::text = owner_token);

-- 5. Only the signed-in owner can update/delete their own listings.
drop policy if exists "Owner update" on listings;
create policy "Owner update"
  on listings for update
  using (auth.uid()::text = owner_token);

drop policy if exists "Owner delete" on listings;
create policy "Owner delete"
  on listings for delete
  using (auth.uid()::text = owner_token);

-- 6. Enable realtime for live listing updates
do $$
begin
  alter publication supabase_realtime add table listings;
exception when duplicate_object then
  null;
end $$;

-- 7. Make sure the messages table exists
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id text not null,
  sender_token text not null,
  receiver_token text not null,
  text text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table messages enable row level security;

drop policy if exists "Public read messages" on messages;
create policy "Public read messages" on messages for select using (true);

drop policy if exists "Public insert messages" on messages;
drop policy if exists "Sender insert messages" on messages;
create policy "Sender insert messages" on messages for insert with check (auth.uid()::text = sender_token);

drop policy if exists "Public update messages" on messages;
drop policy if exists "Receiver update messages" on messages;
create policy "Receiver update messages" on messages for update using (auth.uid()::text = receiver_token);

do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then
  null;
end $$;

-- 8. Indexes
create index if not exists idx_listings_owner_token on listings (owner_token);
create index if not exists idx_messages_conversation on messages (conversation_id);

-- 9. Profiles: durable per-account display name (auto-generated, user-editable),
-- independent of any single listing so it survives across devices/browsers.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Owner read profile" on profiles;
create policy "Owner read profile" on profiles for select using (auth.uid() = id);

drop policy if exists "Owner insert profile" on profiles;
create policy "Owner insert profile" on profiles for insert with check (auth.uid() = id);

drop policy if exists "Owner update profile" on profiles;
create policy "Owner update profile" on profiles for update using (auth.uid() = id);

-- 10. Actually delete listings once they expire, instead of just hiding them client-side.
-- Requires the pg_cron extension (enable it here, or via Supabase Dashboard -> Database -> Extensions
-- if this CREATE EXTENSION statement errors due to permissions on your plan).
create extension if not exists pg_cron;

-- Re-running this is safe: cron.schedule() updates the existing job when the name already exists.
select cron.schedule(
  'delete-expired-listings',
  '0 0 * * *', -- once a day, at midnight UTC
  $$delete from listings where expires_at < now()$$
);
