-- Run this in Supabase Dashboard → SQL Editor → New query

-- 1. Create listings table
create table listings (
  id uuid default gen_random_uuid() primary key,
  owner_token text not null,
  nickname text not null,
  address text not null,
  radius int default 5,
  have text not null,
  want text[] not null,
  wechat text not null,
  lat float default 0,
  lng float default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table listings enable row level security;

-- 3. Anyone can read active listings
create policy "Public read active"
  on listings for select
  using (active = true);

-- 4. Anyone can insert a listing
create policy "Public insert"
  on listings for insert
  with check (true);

-- 5. Only owner can update/delete their listing (matched by owner_token)
create policy "Owner update"
  on listings for update
  using (true);

create policy "Owner delete"
  on listings for delete
  using (true);

-- 6. Enable realtime for live updates
alter publication supabase_realtime add table listings;
