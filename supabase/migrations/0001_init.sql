-- Calderwood schema: practices, fee schedules, frequency data, benchmark
-- tables, and the static geo + CDT lookups. Apply this once when the
-- Supabase project is created.

-- =============================================================
-- Benchmark + lookup tables
-- =============================================================

create table if not exists ucr_benchmarks (
  id uuid primary key default gen_random_uuid(),
  geo_level text not null check (geo_level in ('zip3','metro','state','region','national')),
  geo_id text not null,
  cdt_code text not null,
  p50 numeric not null,
  p75 numeric not null,
  p90 numeric not null,
  sample_size integer not null,
  source_version text not null,
  unique (geo_level, geo_id, cdt_code, source_version)
);
create index if not exists ucr_benchmarks_geo_code_idx
  on ucr_benchmarks (geo_id, cdt_code);
create index if not exists ucr_benchmarks_code_level_idx
  on ucr_benchmarks (cdt_code, geo_level);

create table if not exists zip_to_metro (
  zip5 text primary key,
  metro_id text not null
);

create table if not exists zip_to_state (
  zip5 text primary key,
  state_code text not null
);

create table if not exists state_to_region (
  state_code text primary key,
  region text not null
);

create table if not exists cdt_codes (
  code text primary key,
  description text not null,
  category text
);

-- =============================================================
-- Practice intake
-- =============================================================

create table if not exists practices (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  zip5 text not null,
  provider_count_bucket text not null
    check (provider_count_bucket in ('1','2-5','6+')),
  contracted_carriers text[] not null,
  recredentialing_dates jsonb,
  created_at timestamptz default now(),
  stripe_payment_id text,
  status text default 'awaiting_uploads'
    check (status in ('awaiting_uploads','parsing','review_queue','report_ready','delivered'))
);
create index if not exists practices_status_idx on practices (status);
create index if not exists practices_email_idx on practices (email);

create table if not exists fee_schedules (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references practices(id) on delete cascade,
  schedule_type text not null check (schedule_type in ('master','carrier')),
  carrier text,
  raw_file_url text,
  parsed_data jsonb,
  parse_confidence text check (parse_confidence in ('high','medium','low','failed')),
  parse_notes text,
  created_at timestamptz default now(),
  check (
    (schedule_type = 'master' and carrier is null)
    or (schedule_type = 'carrier' and carrier is not null)
  )
);
create index if not exists fee_schedules_practice_idx on fee_schedules (practice_id);
-- One master per practice; multiple carrier schedules but one per carrier.
create unique index if not exists fee_schedules_one_master_idx
  on fee_schedules (practice_id) where schedule_type = 'master';
create unique index if not exists fee_schedules_one_per_carrier_idx
  on fee_schedules (practice_id, carrier) where schedule_type = 'carrier';

create table if not exists frequency_data (
  practice_id uuid references practices(id) on delete cascade,
  cdt_code text not null,
  annual_frequency integer not null,
  primary key (practice_id, cdt_code)
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references practices(id) on delete cascade unique,
  computation_output jsonb not null,
  pdf_url text,
  reviewed_by text,
  reviewed_at timestamptz,
  delivered_at timestamptz
);

-- =============================================================
-- Logs (cross-cutting requirement: errors must be diagnosable)
-- =============================================================

create table if not exists pipeline_logs (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid references practices(id) on delete set null,
  phase text not null,
  level text not null check (level in ('info','warn','error')),
  message text not null,
  context jsonb,
  created_at timestamptz default now()
);
create index if not exists pipeline_logs_practice_idx on pipeline_logs (practice_id);
create index if not exists pipeline_logs_created_idx on pipeline_logs (created_at desc);
