-- One row per AI service health check, written every 10 minutes by
-- /api/cron/ai-health (lib/ai-health/job.ts) with the service role. The job
-- reads recent rows per service to decide whether to email a down or recovered
-- alert, and alert_sent records which email (if any) that check sent.
--
-- Additive only. RLS on with no policy: deny-all to anon and authenticated;
-- the service role bypasses RLS.

create table if not exists ai_service_checks (
  id bigint generated always as identity primary key,
  service text not null,
  checked_at timestamptz not null default now(),
  status text not null check (status in ('working', 'down', 'unknown')),
  failure_kind text,
  failure_detail text,
  latency_ms integer,
  alert_sent text check (alert_sent in ('down', 'recovered'))
);

create index if not exists ai_service_checks_service_checked_at_idx
  on ai_service_checks (service, checked_at desc);

alter table ai_service_checks enable row level security;
