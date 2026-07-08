-- Group swap chains (3-person ring matching, shown live on the Browse tab) — run in
-- Supabase Dashboard -> SQL Editor -> New query.
-- This is purely additive: it does not touch listings/messages behavior for existing 1:1 matching/chat.
-- Range is taken from the viewer's existing Browse-tab distance filter, not stored per listing.

-- 1. A discovered ring of 3 listings that can trade in a cycle
create table if not exists match_groups (
  id uuid default gen_random_uuid() primary key,
  member_listing_ids uuid[] not null,
  member_tokens text[] not null,
  trade_items text[] not null,
  canonical_key text not null unique,
  status text default 'active',
  created_at timestamptz default now()
);

alter table match_groups enable row level security;

drop policy if exists "Public read match_groups" on match_groups;
create policy "Public read match_groups" on match_groups for select using (true);

drop policy if exists "Member insert match_groups" on match_groups;
create policy "Member insert match_groups" on match_groups for insert
  with check (auth.uid()::text = any(member_tokens));

-- 2. Who's in the group chat for a given match_group, plus per-user read state
create table if not exists group_conversation_participants (
  conversation_id uuid not null references match_groups(id) on delete cascade,
  user_token text not null,
  listing_id uuid not null,
  nickname text not null,
  last_read_at timestamptz default now(),
  joined_at timestamptz default now(),
  primary key (conversation_id, user_token)
);

alter table group_conversation_participants enable row level security;

drop policy if exists "Public read group_conversation_participants" on group_conversation_participants;
create policy "Public read group_conversation_participants" on group_conversation_participants for select using (true);

drop policy if exists "Member insert group_conversation_participants" on group_conversation_participants;
create policy "Member insert group_conversation_participants" on group_conversation_participants for insert
  with check (
    exists (
      select 1 from match_groups mg
      where mg.id = conversation_id
        and auth.uid()::text = any(mg.member_tokens)
    )
  );

drop policy if exists "Owner update group_conversation_participants" on group_conversation_participants;
create policy "Owner update group_conversation_participants" on group_conversation_participants for update
  using (auth.uid()::text = user_token);

-- 3. Group chat messages
create table if not exists group_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references match_groups(id) on delete cascade,
  sender_token text not null,
  text text not null,
  created_at timestamptz default now()
);

alter table group_messages enable row level security;

drop policy if exists "Public read group_messages" on group_messages;
create policy "Public read group_messages" on group_messages for select using (true);

drop policy if exists "Participant insert group_messages" on group_messages;
create policy "Participant insert group_messages" on group_messages for insert
  with check (
    auth.uid()::text = sender_token
    and exists (
      select 1 from group_conversation_participants gcp
      where gcp.conversation_id = group_messages.conversation_id
        and gcp.user_token = sender_token
    )
  );

-- 4. Realtime
do $$
begin
  alter publication supabase_realtime add table match_groups;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table group_conversation_participants;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table group_messages;
exception when duplicate_object then
  null;
end $$;

-- 5. Indexes
create index if not exists idx_gcp_user_token on group_conversation_participants (user_token);
create index if not exists idx_group_messages_conversation on group_messages (conversation_id);
