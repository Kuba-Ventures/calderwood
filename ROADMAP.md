# New Fee Schedule Roadmap: license a defensible fee source and sell the $199 assessment

*Owner: Finley · Started: 2026-10-02 · Status: product built, fee-data licensing is the blocker · last verified against the code 2026-10-02*

## What this is

New Fee Schedule (repo and company name: Calderwood) is a self-serve $199 assessment that benchmarks a dental practice's fee schedule against UCR percentiles and shows, per CDT code and per carrier, how much revenue the practice is leaving on the table. The audience is independent practice owners and office managers, often older and less tech-savvy, so readability and plain language are hard requirements (see `CLAUDE.md`). Stack: Next.js 14 App Router, Supabase (Postgres, Auth, RLS), Stripe Checkout, Claude vision for PDF extraction, `@react-pdf/renderer` for the report, Vercel hosting at `www.newfeeschedule.com`.

### Status legend

- [ ] not started · [~] in progress · [x] done
- Tags: **(design)** **(build)** **(growth)** **(compliance)**
- ⚠️ = critical path

## Stage 0: Core product (done)

- [x] **(build)** Onboarding wizard: signup, fee upload (CSV or PM-system PDF), carriers, carrier schedules (`components/onboarding/`, `app/api/onboard`)
- [x] **(build)** PDF "Procedure Summary" extraction via Claude vision, plus per-carrier schedule capture (`lib/parser/pdf-summary.ts`, `lib/parser/pdf-schedule.ts`)
- [x] **(build)** Benchmark cascade: zip5, zip3, metro, state, region, national; one level per code, never blended; skips levels under sample size 30 (`lib/benchmark/resolve.ts`)
- [x] **(build)** Computation with snapshot tests (`lib/computation/compute.ts`)
- [x] **(build)** Single paywall boundary that zeroes locked dollar figures server-side before payment (`lib/report/gate.ts`)
- [x] **(build)** Stripe Checkout and webhook that sets `paid_at` (`app/api/checkout`, `app/api/stripe/webhook`)
- [x] **(build)** Web report, dashboard, and downloadable PDF report (`components/report/`, `components/dashboard/`, `lib/report/generate.ts`)
- [x] **(build)** View-only shared report at `/r/<token>` (`app/r/[token]/page.tsx`, migration `0007`)
- [x] **(build)** Supervised PR factory and post-merge `main` build guard (`.github/workflows/factory.yml`, `.github/workflows/main-build-check.yml`)

## Stage 1: Public surface and ICP readability (done)

- [x] **(design)** Public rebrand from Calderwood to New Fee Schedule; infra names unchanged (Kuba-Ventures/calderwood#17)
- [x] **(design)** Data-forward indigo "Console" landing, split into standalone routes `/how-it-works`, `/features`, `/sample-report`, `/pricing`, `/resources` (Kuba-Ventures/calderwood#18 through #21, #23)
- [x] **(design)** Readability and accessibility pass for older users: mobile nav, AA contrast, larger type, focus states, content visible without JS (Kuba-Ventures/calderwood#28, #29, #31, #32)
- [x] **(design)** How It Works hybrid layout and pricing pay-vs-get-back card (Kuba-Ventures/calderwood#36, #37, #38)
- [x] **(compliance)** Data-source copy kept neutral ("a national UCR benchmark database"), no vendor named (`components/landing/faq.tsx`, `components/report/methodology-section.tsx`)

## Stage 2: Account hardening (done)

- [x] **(build)** Forgot-password and reset-password flow, root `?code=` forwarding, canonical-origin reset links (Kuba-Ventures/calderwood#44, #46, #47; `docs/auth-password-reset.md`)
- [x] **(build)** Confirm-password on signup (Kuba-Ventures/calderwood#54)
- [x] **(build)** Real error messages on fee upload and onboarding, with onboard rollback fixed (Kuba-Ventures/calderwood#55, #57)

## Stage 3: Fee-data coverage (in progress) ⚠️

The report currently depends on which rows are loaded in `ucr_benchmarks`. The code to go from ~19 codes to ~758 is merged; the licensing to use it is not confirmed in the repo.

- [x] **(build)** `zip5` tier and NDAS loader: national percentile times zip5 geo factor at lookup time (Kuba-Ventures/calderwood#49, #50; `scripts/load-ndas-source.ts`, migration `0009`)
- [x] **(build)** CDT descriptions and categories loaded from NDAS headings; every benchmarked code renders a readable label (Kuba-Ventures/calderwood#51, #53; `lib/cdt/descriptions.ts`)
- [x] **(build)** ZIP-to-state and ZIP-to-metro crosswalks from public Census/OMB data, so the zip3 and metro rungs can fire (Kuba-Ventures/calderwood#52; `scripts/build-geo-crosswalk.ts`)
- [x] **(compliance)** RLS on the NDAS tables, applied to production 2026-09-23 (Kuba-Ventures/calderwood#58; migration `0010`)
- [ ] ⚠️ **(compliance)** Execute a fee-data license that permits showing benchmarks to paying customers. PR #49 says NDAS data must stay out of production report lookups until its content license is signed. PROJECT.md (2026-08-19) still lists REFMed (unverified) and FAIR Health (fallback) as the candidates.
- [ ] ⚠️ **(compliance)** Submit the ADA CDT content license application (two fields still blank per PROJECT.md). Needed whatever the fee source is.
- [ ] **(build)** Decide the NDAS placeholders flagged in PR #49: `p75` interpolated as the mean of p70 and p80, fixed `sample_size` of 500, and whether `ZIPVALS_24.available` should filter zips.
- [ ] **(compliance)** Name the data source in public and report copy only once the license is in writing.

## Stage 4: Launch readiness (next)

- [ ] **(build)** Transactional email. Resend appears only in `.env.example`; no code sends email (Supabase Auth emails aside).
- [ ] **(build)** EOB OCR. `app/api/eob-ocr/route.ts` is a stub that stores the image for a human to read; it also lacks rate limiting, which the file says is needed before paid traffic.
- [ ] **(build)** Decide manual vs automated fulfillment for the first paid customers (README still describes a manual, ~2h-per-customer runbook).
- [ ] **(build)** Confirm `NEXT_PUBLIC_SITE_URL` is set in Vercel production and allow-listed in Supabase Redirect URLs (`lib/site-url.ts`, `docs/auth-password-reset.md`).
- [ ] **(design)** Combine `/features` and `/sample-report` under one "Features" heading (Kuba-Ventures/calderwood#39).
- [ ] **(build)** Rewrite the stale `README.md` (it still describes Puppeteer, the finished phase plan, and the old `kubatopia/calderwood` URL).

## Stage 5: Later

- [ ] **(growth)** Product analytics. PostHog is only in `.env.example`; GTM/GA4 is wired via `components/analytics/gtm.tsx`.
- [ ] **(build)** Preventive `next build` check on PRs in `factory.yml` (the `main` guard only catches breakage after merge).
- [ ] **(build)** Move CI off Node 20 (both workflows pin `node-version: "20"`).

## Open questions

- Is any fee-data license signed? PR #58 reports NDAS rows in production (42,688 zip factors) and PR #53 cites 758 codes resolving against live data, while PR #49 says production report lookups must not use NDAS before its license is executed. `lib/benchmark/supabase-source.ts` does not filter by `source_version`, so whatever is loaded is what reports use. Which is the real state?
- Has the REFMed verification email been sent, and is REFMed still a candidate now that NDAS is loaded?
- Has the ADA CDT application been submitted?
- Has anyone paid for a report yet, and who fulfills it?
