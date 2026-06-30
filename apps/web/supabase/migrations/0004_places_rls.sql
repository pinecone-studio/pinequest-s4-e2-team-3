-- RLS for the public places catalog. Run in the Supabase SQL editor.
--
-- places stays publicly READABLE (Explore search + match_places RAG read it via
-- the anon key). Writes are now denied to the anon key — admin add/edit/delete
-- goes through the service-role client (customPlaces upsertPlace/deletePlace),
-- which BYPASSES RLS. This closes the hole where anyone holding the public anon
-- key could INSERT/DELETE places directly via the REST API.

alter table public.places enable row level security;

-- Anyone (anon or authenticated) may read the catalog.
drop policy if exists places_public_read on public.places;
create policy places_public_read on public.places
  for select
  to anon, authenticated
  using (true);

-- No insert/update/delete policy for anon/authenticated => those are denied.
-- Only the service-role client (admin API) can write, since it bypasses RLS.
