-- Per-provider fees for the provider-variance section. PM production reports
-- list each provider's average fee per code; we store that map on the master
-- fee schedule: { "<code>": { "<provider>": <fee> } }.

alter table fee_schedules
  add column if not exists provider_fees jsonb;
