-- Run this in Supabase Dashboard -> SQL Editor -> New query

-- 1. Create listings table
create table if not exists listings (
  id uuid default gen_random_uuid() primary key,
  owner_token text not null,
  nickname text not null,
  address text not null,
  radius int default 5,
  have text[] not null,
  want text[] not null,
  country text default 'ca',
  city text,
  swap_areas text[] default '{}',
  wechat text default '',
  phone text default '',
  whatsapp text default '',
  instagram text default '',
  lat float default 0,
  lng float default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- Keep older listings tables compatible with the current app.
alter table listings add column if not exists city text;
alter table listings add column if not exists country text default 'ca';
alter table listings add column if not exists swap_areas text[] default '{}';
alter table listings add column if not exists phone text default '';
alter table listings add column if not exists whatsapp text default '';
alter table listings add column if not exists instagram text default '';

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

-- 4. Anyone can insert a listing
drop policy if exists "Public insert" on listings;
create policy "Public insert"
  on listings for insert
  with check (true);

-- 5. Anyone can update/delete listings.
-- The app still checks owner_token in update/delete queries.
drop policy if exists "Owner update" on listings;
create policy "Owner update"
  on listings for update
  using (true);

drop policy if exists "Owner delete" on listings;
create policy "Owner delete"
  on listings for delete
  using (true);

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
create policy "Public insert messages" on messages for insert with check (true);

drop policy if exists "Public update messages" on messages;
create policy "Public update messages" on messages for update using (true);

do $$
begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then
  null;
end $$;

-- 8. Indexes
create index if not exists idx_listings_owner_token on listings (owner_token);
create index if not exists idx_messages_conversation on messages (conversation_id);
