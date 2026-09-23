-- 0009 created these three tables without RLS, leaving them readable and
-- writable by anyone holding the anon key. Close that.
--
-- zip_geo_factors is a reference table like ucr_benchmarks / zip_to_state, so
-- it gets the same ref_read_authenticated policy those tables carry. The
-- report path reads it with the service role (lib/report/generate.ts), which
-- bypasses RLS either way; the policy keeps the reference tables consistent.
--
-- The staging_ndas_* tables are raw audit mirrors the app never reads. They
-- get RLS with no policy at all: deny-all to anon and authenticated, while the
-- loader script (scripts/load-ndas-source.ts, service role) still writes them.

alter table zip_geo_factors enable row level security;

drop policy if exists ref_read_authenticated on zip_geo_factors;
create policy ref_read_authenticated on zip_geo_factors
  for select to authenticated using (true);

alter table staging_ndas_nmas enable row level security;
alter table staging_ndas_zipvals enable row level security;
