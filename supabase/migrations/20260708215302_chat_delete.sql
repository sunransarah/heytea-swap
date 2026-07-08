-- Swipe-to-delete chats (WeChat-style: hides the conversation from the swiper's own list only;
-- the other side/participants are unaffected, and the conversation reappears if a new message
-- arrives after it was hidden). Run in Supabase Dashboard -> SQL Editor -> New query.
-- Purely additive — does not touch listings/messages/group_* behavior.

create table if not exists hidden_conversations (
  user_token text not null,
  conversation_id text not null,
  hidden_at timestamptz not null default now(),
  primary key (user_token, conversation_id)
);

alter table hidden_conversations enable row level security;

drop policy if exists "Owner read hidden_conversations" on hidden_conversations;
create policy "Owner read hidden_conversations" on hidden_conversations for select using (auth.uid()::text = user_token);

drop policy if exists "Owner insert hidden_conversations" on hidden_conversations;
create policy "Owner insert hidden_conversations" on hidden_conversations for insert with check (auth.uid()::text = user_token);

drop policy if exists "Owner update hidden_conversations" on hidden_conversations;
create policy "Owner update hidden_conversations" on hidden_conversations for update using (auth.uid()::text = user_token);

drop policy if exists "Owner delete hidden_conversations" on hidden_conversations;
create policy "Owner delete hidden_conversations" on hidden_conversations for delete using (auth.uid()::text = user_token);

do $$
begin
  alter publication supabase_realtime add table hidden_conversations;
exception when duplicate_object then
  null;
end $$;

create index if not exists idx_hidden_conversations_user on hidden_conversations (user_token);
