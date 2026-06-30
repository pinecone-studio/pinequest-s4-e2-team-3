-- Row Level Security for the per-user tables. Run AFTER 0001 (which creates
-- chat_messages). Run in the Supabase SQL editor.
--
-- Why this is safe: the app's API routes (/api/trips, /api/chat-history) use the
-- service-role key, which BYPASSES RLS — so the app keeps working unchanged.
-- These policies only block direct anon-key access to other users' rows, which is
-- the hole today (the public anon key can currently read every user's trip_plans).
--
-- Scope: only the user-owned tables are locked here. places / routes / sos_incidents
-- are accessed by the anon client directly (Explore search, SOS realtime), so they
-- need a tested follow-up before locking — not changed in this pass.

-- trip_plans: a user may only see/modify their own rows.
alter table public.trip_plans enable row level security;
drop policy if exists own_trip_plans on public.trip_plans;
create policy own_trip_plans on public.trip_plans
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- chat_messages: same — owner only.
alter table public.chat_messages enable row level security;
drop policy if exists own_chat_messages on public.chat_messages;
create policy own_chat_messages on public.chat_messages
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
