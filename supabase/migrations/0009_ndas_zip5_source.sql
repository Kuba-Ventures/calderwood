-- NDAS 2026 fee-percentile source. NDAS ships national percentiles per CDT
-- code (NMAS) plus a per-zip5 geographic adjustment factor (ZIPVALS), not
-- pre-computed regional percentiles. We store national rows in the existing
-- ucr_benchmarks table and the per-zip factor separately, then multiply at
-- lookup time (see lib/benchmark/supabase-source.ts). This avoids
-- materializing a ~41,000 zip x ~800 code cross-join.

alter table ucr_benchmarks drop constraint if exists ucr_benchmarks_geo_level_check;
alter table ucr_benchmarks add constraint ucr_benchmarks_geo_level_check
  check (geo_level in ('zip5','zip3','metro','state','region','national'));

create table if not exists zip_geo_factors (
  zip5 text primary key,
  geo_factor numeric not null,
  source_version text not null
);

-- Raw, unmodified mirrors of the NDAS source tables. Kept for audit /
-- re-derivation; the app never reads these directly.
create table if not exists staging_ndas_nmas (
  code text primary key,
  int_val text,
  seq_order integer,
  p40 numeric,
  p50 numeric,
  p60 numeric,
  p70 numeric,
  p80 numeric,
  p90 numeric,
  p95 numeric,
  description text,
  notes text,
  source_version text not null
);

create table if not exists staging_ndas_zipvals (
  zip5 text primary key,
  state text,
  city text,
  geo_factor numeric not null,
  available boolean,
  source_version text not null
);
