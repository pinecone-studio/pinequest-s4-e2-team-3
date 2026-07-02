-- Run once in Supabase -> SQL Editor.
-- Server-side heartbeat for the Dead Man's Switch, so the emergency-contact
-- SMS can fire even while the traveller's app is closed for 48h+.

create table if not exists public.dead_switch_status (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  armed          boolean not null default false,
  contact_name   text,
  contact_phone  text,
  last_heartbeat timestamptz not null default now(),
  alerted_at     timestamptz,
  updated_at     timestamptz not null default now()
);

-- All reads/writes go through the service-role key (verified via the user's
-- bearer token in the API route first), so no RLS policy grants are needed.
alter table public.dead_switch_status enable row level security;

create index if not exists dead_switch_status_armed_idx
  on public.dead_switch_status (armed, last_heartbeat)
  where alerted_at is null;
