-- Backend consolidation — standardise on Supabase (Postgres + Auth + Storage).
-- Run in the Supabase SQL editor. This is the tracked, reproducible record of the
-- schema changes (so the schema lives in the repo, not only the dashboard).
-- For a full snapshot of pre-existing tables, run `supabase db pull` later.

-- 1. trip_plans: store the FULL plan (not just title/summary) so a user's
--    itinerary + progress survives a new device / cleared browser.
alter table public.trip_plans
  add column if not exists stops      jsonb not null default '[]'::jsonb,
  add column if not exists places     jsonb not null default '[]'::jsonb,
  add column if not exists done_stops jsonb not null default '[]'::jsonb;

create index if not exists trip_plans_user_idx
  on public.trip_plans (user_id, created_at desc);

-- 2. Chat history (AI guide) — flat, keyed by the auth user. One row per message,
--    full message object as jsonb (role, content, place cards, plan…).
create table if not exists public.chat_messages (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  message    jsonb       not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_idx
  on public.chat_messages (user_id, created_at);

-- 3. Drop the dead Prisma-era tables (no code reads them; replaced by the flat
--    chat_messages above and by auth.users for identity).
drop table if exists public.guide_messages cascade;
drop table if exists public.guide_sessions cascade;
drop table if exists public.saved_places   cascade;
drop table if exists public.profiles       cascade;
