# Supabase setup

Run the migration once when the project is created:

```bash
supabase db push   # or paste 0001_init.sql into the SQL editor
```

## Seed order

1. **Static lookups** (do these first — `resolveBenchmark` depends on them)
   - `state_to_region` — load from `lib/seed/state-to-region.ts`. Trivial insert.
   - `zip_to_state`, `zip_to_metro` — run `npm run load:zcta -- --zips <census-zcta.csv> --metros <hud-zip-cbsa.csv>`. Census ZCTA-to-state and HUD ZIP-to-CBSA crosswalks are the recommended sources. Both are free downloads.
   - `cdt_codes` — load from `lib/seed/cdt-codes.ts` (top 50 codes hardcoded).

2. **Benchmarks** (`ucr_benchmarks` — the real work)
   - Acquire the licensed ADA UCR dataset.
   - Normalize to CSV columns: `geo_level, geo_id, cdt_code, p50, p75, p90, sample_size, source_version`.
   - `npm run load:ucr -- --file ./data/ada-ucr-<year>.csv --dry-run` to validate.
   - Drop `--dry-run` to load. The script rejects any file with validation errors.

## Env vars required for live loads

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

The service role key bypasses RLS — keep it server-side only.
