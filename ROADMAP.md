# New Fee Schedule Roadmap: sell the $199 assessment on licensed NDAS fee data

*Owner: Finley · Started: 2026-10-02 · Status: product built, NDAS license signed, ADA CDT application sent 2026-10-02 and waiting on ADA's template agreement; apex host canonical and Search Console validation pending · last verified against the code and live site 2026-10-07*

## What this is

New Fee Schedule (repo and company name: Calderwood) is a self-serve $199 assessment that benchmarks a dental practice's fee schedule against UCR percentiles and shows, per CDT code and per carrier, how much revenue the practice is leaving on the table. The audience is independent practice owners and office managers, often older and less tech-savvy, so readability and plain language are hard requirements (see `CLAUDE.md`). Stack: Next.js 14 App Router, Supabase (Postgres, Auth, RLS), Stripe Checkout, Claude vision for PDF extraction, `@react-pdf/renderer` for the report, Vercel hosting at `newfeeschedule.com` (apex canonical; `www` redirects to it).

### Status legend

- [ ] not started · [~] in progress · [x] done
- Tags: **(design)** **(build)** **(growth)** **(compliance)**
- ⚠️ = critical path
- Dates are US Eastern. Done items carry the PR merge date (or the commit date when there was no PR); `started` and `added` dates come from git history, Vercel, GitHub issues, or PROJECT.md. `date unknown` means no record supports a date.

## Timeline

- **2026-05-11** · First commit: a landing page for the idea (`b1c4c5f`), followed the same day by the signed-in app shell (`570b1b0`).
- **2026-05-12** · Core engine built in one day: schema and loaders, the benchmark cascade, the computation engine, and a React-PDF report (`bebe348` to `74811d7`). Supabase project "Calderwood Tech" created.
- **2026-06-08** · Gated report, fused onboarding, Stripe Checkout, and Claude-vision PDF extraction land; the product can take a payment (#1).
- **2026-06-09** · Supervised PR factory starts: only low-risk surfaces auto-merge (#2).
- **2026-06-25** · ADA CDT content license application completed and dated, not yet sent.
- **2026-06-26** · Decided to benchmark only ~19 of 142 CDT codes until fee-data sourcing clears a compliance review; PROJECT.md created.
- **2026-07-13** · Fee-data search: the standard NDAS developer license ruled out, FAIR Health recommended, then REFMed picked provisionally; public copy kept vendor-neutral (#8, #10, #12).
- **2026-07-13** · A clean merge broke `main` with no conflict marker; hotfixed and a post-merge build guard added (#12, #13).
- **2026-07-28** · Public rebrand to New Fee Schedule, data-forward "Console" redesign split into standalone pages, design principles made binding in `CLAUDE.md`, readability pass for older users (#17 to #38).
- **2026-08-12** · Self-serve password reset works end to end (#44, #46, #47).
- **2026-09-16** · NDAS pipeline built: zip5 tier, loader, CDT labels, public Census crosswalks; code coverage can go from ~19 to ~758 (#49 to #53).
- **2026-09-23** · RLS on the NDAS tables applied to production (#58).
- **2026-10-02** · NDAS fee-data license signed, replacing the REFMed and FAIR Health candidates and clearing the PR #49 gate.
- **2026-10-02** · ADA CDT application sent to CDT-SNODENT@ada.org.
- **2026-10-02** · Report headline fixed: it was about 7x inflated; now the fee-schedule gap plus a separate carrier figure. Already-sent PDFs left as is (#65, #67).
- **2026-10-02** · sales@newfeeschedule.com live through a Resend inbound forwarder, and unsourced marketing numbers removed (#64, #68, #69).
- **2026-10-06** · Founding practices can get a free report through Stripe promo codes, for field sales in Newport (#73).
- **2026-10-06** · Reports built from averaged PM fees now show a "Check upload" warning instead of a dollar teaser (#74); PDF gets the real logo and a readable footer (#75, #76).
- **2026-10-07** · Apex `newfeeschedule.com` becomes the canonical host: canonical tags, robots.txt and sitemap live, Vercel and Supabase moved to the apex, sitemap submitted and Search Console validation started (#77, #78).

## Stage 0: Core product (done, 2026-05-12 to 2026-07-13)

- [x] **2026-06-08** · **(build)** Onboarding wizard: signup, fee upload (CSV or PM-system PDF), carriers, carrier schedules (`components/onboarding/`, `app/api/onboard`) (Kuba-Ventures/calderwood#1)
- [x] **2026-06-08** · **(build)** PDF "Procedure Summary" extraction via Claude vision, plus per-carrier schedule capture (`lib/parser/pdf-summary.ts`, `lib/parser/pdf-schedule.ts`; commits `98b415e`, `0ef8479`, no PR)
- [x] **2026-05-12** · **(build)** Benchmark cascade: zip5, zip3, metro, state, region, national; one level per code, never blended; skips levels under sample size 30 (`lib/benchmark/resolve.ts`; commit `2031f9d`, zip5 rung added in Kuba-Ventures/calderwood#49)
- [x] **2026-05-12** · **(build)** Computation with snapshot tests (`lib/computation/compute.ts`; commit `ff584bd`, no PR)
- [x] **2026-06-08** · **(build)** Single paywall boundary that zeroes locked dollar figures server-side before payment (`lib/report/gate.ts`) (Kuba-Ventures/calderwood#1)
- [x] **2026-06-08** · **(build)** Stripe Checkout and webhook that sets `paid_at` (`app/api/checkout`, `app/api/stripe/webhook`) (Kuba-Ventures/calderwood#1)
- [x] **2026-06-08** · **(build)** Web report, dashboard, and downloadable PDF report (`components/report/`, `components/dashboard/`, `lib/report/generate.ts`) (Kuba-Ventures/calderwood#1)
- [x] **2026-06-08** · **(build)** View-only shared report at `/r/<token>` (`app/r/[token]/page.tsx`, migration `0007`; commit `be5d414`, no PR)
- [x] **2026-07-13** · **(build)** Supervised PR factory and post-merge `main` build guard (`.github/workflows/factory.yml`, `.github/workflows/main-build-check.yml`) (Kuba-Ventures/calderwood#2 on 2026-06-09, Kuba-Ventures/calderwood#13)

## Stage 1: Public surface and ICP readability (done, 2026-07-13 to 2026-07-28)

- [x] **2026-07-28** · **(design)** Public rebrand from Calderwood to New Fee Schedule; infra names unchanged (Kuba-Ventures/calderwood#17)
- [x] **2026-07-28** · **(design)** Data-forward indigo "Console" landing, split into standalone routes `/how-it-works`, `/features`, `/sample-report`, `/pricing`, `/resources` (Kuba-Ventures/calderwood#18 through #21, #23)
- [x] **2026-07-28** · **(design)** Readability and accessibility pass for older users: mobile nav, AA contrast, larger type, focus states, content visible without JS (Kuba-Ventures/calderwood#28, #29, #31, #32)
- [x] **2026-07-28** · **(design)** How It Works hybrid layout and pricing pay-vs-get-back card (Kuba-Ventures/calderwood#36, #37, #38)
- [x] **2026-07-13** · **(compliance)** Data-source copy kept neutral ("a national UCR benchmark database"), no vendor named (`components/landing/faq.tsx`, `components/report/methodology-section.tsx`) (Kuba-Ventures/calderwood#10, #12)

## Stage 2: Account hardening (done, 2026-08-12 to 2026-09-17)

- [x] **2026-08-12** · **(build)** Forgot-password and reset-password flow, root `?code=` forwarding, canonical-origin reset links (Kuba-Ventures/calderwood#44, #46, #47; `docs/auth-password-reset.md`)
- [x] **2026-09-16** · **(build)** Confirm-password on signup (Kuba-Ventures/calderwood#54)
- [x] **2026-09-17** · **(build)** Real error messages on fee upload and onboarding, with onboard rollback fixed (Kuba-Ventures/calderwood#55, #57)

## Stage 3: Fee-data coverage (in progress, 2026-09-16 to present) ⚠️

The report currently depends on which rows are loaded in `ucr_benchmarks`. The code to go from ~19 codes to ~758 is merged, and the NDAS license to use it is signed (confirmed by Finley 2026-10-02).

- [x] **2026-09-16** · **(build)** `zip5` tier and NDAS loader: national percentile times zip5 geo factor at lookup time (Kuba-Ventures/calderwood#49, #50; `scripts/load-ndas-source.ts`, migration `0009`)
- [x] **2026-09-16** · **(build)** CDT descriptions and categories loaded from NDAS headings; every benchmarked code renders a readable label (Kuba-Ventures/calderwood#51, #53; `lib/cdt/descriptions.ts`)
- [x] **2026-09-16** · **(build)** ZIP-to-state and ZIP-to-metro crosswalks from public Census/OMB data, so the zip3 and metro rungs can fire (Kuba-Ventures/calderwood#52; `scripts/build-geo-crosswalk.ts`)
- [x] **2026-09-23** · **(compliance)** RLS on the NDAS tables, applied to production 2026-09-23 (Kuba-Ventures/calderwood#58; migration `0010`)
- [x] **2026-10-02** · **(compliance)** NDAS fee-data license signed, clearing the PR #49 gate on using NDAS in production report lookups (confirmed by Finley 2026-10-02; no PR, recorded in PROJECT.md by Kuba-Ventures/calderwood#61).
- [x] **2026-10-02** · **(compliance)** Submit the ADA CDT content license application (sent to CDT-SNODENT@ada.org; no PR, recorded in PROJECT.md by Kuba-Ventures/calderwood#70). Needed whatever the fee source is.
- [ ] **added 2026-10-02** · **(compliance)** Review and sign ADA's template CDT license agreement when it arrives. Waiting on ADA.
- [ ] **added 2026-10-02** · **(build)** Decide the NDAS placeholders flagged in PR #49: `p75` interpolated as the mean of p70 and p80, fixed `sample_size` of 500, and whether `ZIPVALS_24.available` should filter zips.
- [ ] **added 2026-10-02** · **(compliance)** Name the data source in public and report copy, now unblocked by the signed NDAS license (check the license terms for attribution wording).
- [ ] **added 2026-10-02** · **(build)** Decide whether `lib/benchmark/supabase-source.ts` should filter by `source_version` instead of taking the highest one, and confirm which `source_version` rows are loaded in production `ucr_benchmarks`.

## Stage 4: Launch readiness (in progress, 2026-06-26 to present)

- [x] **2026-10-06** · **(build)** Founding promo codes: Stripe promotion codes at checkout, $0 sessions unlock the report (Kuba-Ventures/calderwood#73).
- [x] **2026-10-06** · **(build)** Flag fee uploads that look like averages and ask for office fees; flagged reports show a "Check upload" warning (Kuba-Ventures/calderwood#74).
- [x] **2026-10-06** · **(design)** PDF footer no longer overlaps the page number; real logo and looser spacing (Kuba-Ventures/calderwood#75, #76).
- [x] **2026-10-07** · **(growth)** Fix Search Console indexing alerts: per-page apex canonical, `robots.txt`, `sitemap.xml` with the 8 public pages (Kuba-Ventures/calderwood#77).
- [ ] **added 2026-10-07** · **(growth)** Check the Search Console "Validate fix" outcome for "Duplicate without user-selected canonical" around 2026-10-21.
- [ ] **added 2026-10-07** · **(growth)** Confirm the sitemap status flips from "Couldn't fetch" to "Success" in Search Console.
- [ ] **added 2026-10-06** · **(build)** Fix the PDF parser to take quantities from the Procedure Summary and fees from the office fee schedule, not "Average $" (follow-up named in Kuba-Ventures/calderwood#74; tracked in [#80](https://github.com/Kuba-Ventures/calderwood/issues/80)).
- [x] **2026-10-02** · **(compliance)** Copy corrections: FAQ and methodology wording, methodology matches the cascade, unsourced marketing numbers removed and mock visuals labeled "Sample practice" (Kuba-Ventures/calderwood#62, #63, #66, #69).
- [x] **2026-10-02** · **(build)** Report totals fixed: headline is the fee-schedule gap, carrier figure reported separately, PDF columns reconcile (Kuba-Ventures/calderwood#65, #67).
- [x] **2026-10-02** · **(build)** Make the public contact address deliverable: sales@newfeeschedule.com only, forwarded by a Resend inbound webhook (Kuba-Ventures/calderwood#64, #68).
- [ ] **added 2026-10-02** · **(build)** Decide whether to notify existing customers that their PDF totals were overstated before Kuba-Ventures/calderwood#65.
- [ ] **added 2026-06-26** · **(build)** Transactional email. Resend now forwards inbound sales@ mail (Kuba-Ventures/calderwood#68), but no code sends receipts or report-ready notices (Supabase Auth emails aside).
- [ ] **added 2026-10-02** · **(build)** EOB OCR. `app/api/eob-ocr/route.ts` is a stub that stores the image for a human to read; it also lacks rate limiting, which the file says is needed before paid traffic.
- [ ] **added 2026-06-26** · **(build)** Decide manual vs automated fulfillment for the first paid customers (README still describes a manual, ~2h-per-customer runbook).
- [x] **2026-10-07** · **(build)** Confirm `NEXT_PUBLIC_SITE_URL` is set in Vercel production and allow-listed in Supabase Redirect URLs (`lib/site-url.ts`, `docs/auth-password-reset.md`). Both moved to the apex `https://newfeeschedule.com` on 2026-10-07; reset email tested end to end (Kuba-Ventures/calderwood#78).
- [ ] **added 2026-07-28** · **(design)** Combine `/features` and `/sample-report` under one "Features" heading (Kuba-Ventures/calderwood#39).
- [ ] **added 2026-10-02** · **(build)** Manually test an onboarding failure after practice creation and confirm no orphaned practice row remains (unchecked item on Kuba-Ventures/calderwood#57).
- [ ] **added 2026-08-18** · **(build)** Rewrite the stale `README.md` (it still describes Puppeteer, the finished phase plan, and the old `kubatopia/calderwood` URL).

## Stage 5: Later (2026-07-13 to present)

- [ ] **added 2026-10-02** · **(growth)** Product analytics. PostHog is only in `.env.example`; GTM/GA4 is wired via `components/analytics/gtm.tsx`.
- [ ] **added 2026-07-13** · **(build)** Preventive `next build` check on PRs in `factory.yml` (the `main` guard only catches breakage after merge).
- [ ] **added 2026-08-18** · **(build)** Move CI off Node 20 (both workflows pin `node-version: "20"`).

## Open questions

- Is REFMed still needed now that NDAS is licensed, or can it be dropped?
- Has the ADA CDT application been submitted? **Answered:** yes, sent to CDT-SNODENT@ada.org on 2026-10-02. Next is ADA's template license agreement.
- Has anyone paid for a report yet, and who fulfills it?
