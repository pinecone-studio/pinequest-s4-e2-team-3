-- SOS incident log. Run once in Supabase → SQL Editor.
-- The app inserts with the anon key and reads/updates with the service-role key.

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
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create index if not exists sos_incidents_created_at_idx
  on public.sos_incidents (created_at desc);

-- RLS: the browser (anon) may only INSERT new incidents. Reads and resolves go
-- through the service-role key, which bypasses RLS, so no other policy is needed.
alter table public.sos_incidents enable row level security;

drop policy if exists "anon can log incidents" on public.sos_incidents;
create policy "anon can log incidents"
  on public.sos_incidents
  for insert
  to anon
  with check (true);
