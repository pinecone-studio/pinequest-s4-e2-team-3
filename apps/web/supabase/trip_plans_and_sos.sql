-- Run once in Supabase → SQL Editor.
-- Adds the columns the app now expects (fixes GET /api/trips 500 and the SOS
-- check-in feature).

-- 0) chat_messages: per-user AI guide chat history (fixes /api/chat-history 500).
-- All reads/writes go through the service-role key, so no RLS policy is needed.
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  message    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_idx
  on public.chat_messages (user_id, created_at);

-- 1) trip_plans: store the full plan, not just title/summary.
alter table public.trip_plans
  add column if not exists stops      jsonb not null default '[]'::jsonb,
  add column if not exists places     jsonb not null default '[]'::jsonb,
  add column if not exists done_stops jsonb not null default '[]'::jsonb;

-- 2) sos_incidents: incident log + admin "check-in" flag.
create table if not exists public.sos_incidents (
  id             uuid primary key default gen_random_uuid(),
  type           text not null,
  title          text not null,
  service        text not null,
  service_number text not null,
  lat            double precision,
  lng            double precision,
  place_name     text,
  coords         text,
  language       text,
  battery_level  integer,
  is_online      boolean,
  status         text not null default 'active' check (status in ('active', 'resolved')),
  check_in_requested boolean default false,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

alter table public.sos_incidents
  add column if not exists check_in_requested boolean default false;

alter table public.sos_incidents enable row level security;

drop policy if exists "anon can log incidents" on public.sos_incidents;
create policy "anon can log incidents"
  on public.sos_incidents for insert to anon with check (true);

-- The traveller's SOS sheet subscribes to its own incident row for live check-in.
drop policy if exists "anon can read incidents" on public.sos_incidents;
create policy "anon can read incidents"
  on public.sos_incidents for select to anon using (true);

-- Realtime so the check-in overlay updates instantly.
alter publication supabase_realtime add table public.sos_incidents;

-- last_seen heartbeat — lets the admin spot a long network blackout (offline 3h+).
alter table public.sos_incidents
  add column if not exists last_seen timestamptz default now();

-- operator_msgs — what the 103 operator said, transcribed (mn) + translated (en),
-- so the traveller sees the operator's replies in their own language.
alter table public.sos_incidents
  add column if not exists operator_msgs jsonb not null default '[]'::jsonb;
