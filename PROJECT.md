# Calderwood (public brand: New Fee Schedule)
*A $199 dental fee-schedule assessment that shows practices where they're underpaid.*

*Last updated: 2026-10-07 11:35 ET by kuba-vault*

---

## TL;DR  [rewrite]

Calderwood is the company and repo name; **New Fee Schedule** has been the public brand since 2026-07-28 (PR #17). The product is a self-serve web app that benchmarks a dental practice's fee schedule against UCR (usual, customary, reasonable) percentiles and shows recoverable revenue per CDT code and per carrier. A practice onboards, uploads fees and volumes (CSV or PDF), pays $199 via Stripe, and gets a gated web report plus a PDF.

The **NDAS fee-data license is signed** and the **ADA CDT application is with ADA** (both 2026-10-02); the next licensing step is ADA's template agreement. The report headline was fixed on 2026-10-02 (about 7x inflated before PRs #65, #67); already-sent PDFs still show the old numbers. On 2026-10-06 founding practices got free reports through Stripe promo codes (PR #73), reports built from averaged PM fees now show a "Check upload" warning instead of a dollar teaser (PR #74), and the PDF got the real logo and readable footers (PRs #75, #76). On 2026-10-07 the canonical host became the apex `https://newfeeschedule.com`, with canonical tags, `robots.txt`, and `sitemap.xml` live (PRs #77, #78) and Search Console validation running. Remaining launch gaps: no product analytics, no outbound transactional email, a stub EOB OCR endpoint, the PDF parser still reading "Average $", and a decision on telling existing customers about the corrected totals.

---

## What it is  [rewrite when value prop evolves]

**The problem:** Dental practices set fees blind and quietly leave money on the table. They don't know which procedure codes are priced below what carriers in their area actually reimburse.
**The solution:** Upload your fees and volumes; get a benchmarked report showing per-code and per-carrier underpayment and total recoverable revenue.
**The user:** Independent and small-group dental practices (office managers and owner-dentists), often older and less comfortable with software. `CLAUDE.md` makes this a design constraint, not a persona note.
**The value:** A $199 assessment that shows, code by code and carrier by carrier, how far the practice's fees sit below the local 75th percentile, in annual dollars.
**The name:** public-facing copy says "New Fee Schedule"; the repo, Vercel project, and internal tooling stay "Calderwood".

---

## Status  [rewrite]

- **Phase:** launch prep (fee data licensed; CDT license applied for, awaiting ADA)
- **Engagement manager:** self-directed
- **Lead:** Finley
- **Cadence:** self-directed
- **Next milestone:** receive and sign ADA's template CDT license agreement (TBD date). Check the Search Console validation result around 2026-10-21.
- **Flags:** on-track

---

## Where we are right now  [rewrite]

**Search Console fix (2026-10-07, PR #77).** Google flagged "Page with redirect" and "Duplicate without user-selected canonical" (the duplicates were `www.newfeeschedule.com/terms` and `/privacy`). The site had no canonical tags, no `robots.txt`, and no sitemap. `app/layout.tsx` now sets `metadataBase` to `https://newfeeschedule.com` and `alternates.canonical: "./"`, so every page names its own apex URL. `app/robots.ts` allows `/` and blocks `/api/`, `/dashboard`, `/reports`, `/account`, `/intake`, and `/r/`. `app/sitemap.ts` lists the 8 public pages. Sitemap submitted in Search Console on 2026-10-07 (it showed "Couldn't fetch" at first, which is normal right after submit; Googlebot gets 200 `application/xml`). "Validate fix" started the same day for the duplicate-canonical issue. "Page with redirect" was not validated on purpose: http and `www` 308 to the apex by design. "Crawled, currently not indexed" (3 pages) is left to Google. Expect results in 1 to 2 weeks.

**Apex is now the canonical host (2026-10-07, PR #78).** `www` and `http` 308 to `https://newfeeschedule.com`; the old NXDOMAIN notes are obsolete. `NEXT_PUBLIC_SITE_URL` moved from `www` to the apex in Vercel Production and Preview and is inlined in the live forgot-password bundle. Supabase "Calderwood Tech" (ref `rompbyxhgiwcvjpfhijv`) Site URL is now the apex; the redirect allow-list holds the apex and `www` `/reset-password` and `/**` entries plus `http://localhost:3000/reset-password`. A reset email for finley@qsbsrollover.com carried `redirect_to=https://newfeeschedule.com/reset-password` and landed on "Choose a new password" (password not changed). One watch item: the first automated submit cleared the form without sending a request; the second (Enter key) worked. Probably automation timing, not confirmed.

**Founding-practice field sales (2026-10-06).** Checkout now accepts Stripe promotion codes and skips the card form when the total is $0; the webhook unlocks on `paid` or `no_payment_required` (PR #73). The code itself lives in the Stripe dashboard. Everyone without a code still pays $199.

**Averaged-fee uploads (2026-10-06, PR #74).** A test practice showed $1,545,000 recoverable on $1,284,000 of production because the parser read Open Dental's "Average $" column, which blends office and PPO fees. `lib/computation/fee-sanity.ts` now flags a report when the volume-weighted fee is under 0.7x the local median or recoverable exceeds 60% of production (5+ benchmarked codes). Flagged reports show a "Check upload" warning in place of the dollar teaser, checked at read time. The fee step now asks for full office fees. The parser fix (quantities from the Procedure Summary, fees from the office fee schedule) is still open.

**PDF polish (2026-10-06, PRs #75, #76).** The footer no longer overlaps the page number. The header uses the real logo, inlined as a data URI, and line height and table padding went up; the sample report grew from 7 to 9 pages.

**Licensing (2026-10-02).** NDAS fee-data license signed. ADA CDT application sent to CDT-SNODENT@ada.org as Calderwood Tech LLC; ADA's template agreement is next. Whether REFMed is still needed is open.

**Verified this run (2026-10-07 11:35 ET).** `/`, `/robots.txt` (text/plain), and `/sitemap.xml` (application/xml) return 200 on the apex. `www` and `http` 308 to the apex. `/terms` emits `<link rel="canonical" href="https://newfeeschedule.com/terms">`. `main-build-check` is green on `8fdb8cd`. Tests: 12 vitest files, 101 passing per PR #74.

**Next concrete steps.** Around 2026-10-21, check the Search Console validation outcome and confirm the sitemap shows "Success". Fix the PDF parser to stop reading "Average $". Decide whether to tell existing customers their PDF totals were overstated. Watch for ADA's template agreement.

---

## What's built  [rewrite]

**Frontend / UI**
- Public marketing surface: `/` plus five standalone routes (`/how-it-works`, `/features`, `/sample-report`, `/pricing`, `/resources`), composed from `components/landing/*` through `LandingShell` (`shell.tsx`). Sticky `<LandingNav>` with active-route highlighting and a real mobile menu.
- Design: data-forward indigo "Console" layout. Brand tokens in `app/globals.css` (`--brand: #4f46e5`, `--brand-deep`) sit alongside the app's ink/canvas theme. Fonts via `next/font`.
- Motion primitives in `components/motion/` with no animation dependency. Content renders without JS; `prefers-reduced-motion` is honored.
- Accessibility and readability to the `CLAUDE.md` bar: AA-contrast body ink, 16px-plus body copy, visible focus, large tap targets.
- Auth pages: `/login`, `/signup` (now with confirm-password, PR #54), `/forgot-password`, `/reset-password`.
- Authenticated app under `app/(app)/`: dashboard, intake, reports, account (with a "Remove data" reset for testing).
- Onboarding (`components/onboarding/`): unified upload box, staged PDF extraction progress, post-extraction review, real error messages via `lib/api-message.ts` (PRs #55, #57). The fee step asks for full office fees, not production averages (PR #74).
- Fee-input warning (`components/report/fee-input-warning.tsx`): reports, dashboard, and shared reports show a "Check upload" alert with a link to `/intake` when `assessFeeSanity` flags the fees (PR #74).
- PDF report: real logo in the header, looser line height and table padding, footer that no longer overlaps the page number (PRs #75, #76).
- SEO: per-page canonical URLs on the apex via `metadataBase` in `app/layout.tsx`; `app/robots.ts` and `app/sitemap.ts` (8 public pages) (PR #77).
- Report UI (`components/report/`): per-code fee-vs-UCR table with a readable label for every benchmarked code, ordinal percentile (same `percentileRank` on web and PDF), carrier scorecard and heatmap, category opportunity, provider variance, methodology with a coverage percentage.
- Report totals: headline = fee-schedule gap; separate carrier figure with an even volume split across carriers per code (`summarizeTotals` in `lib/computation/compute.ts`, PR #65). PDF Top 10 and appendix columns reconcile with the headline (`lib/report/pdf-columns.ts`, PR #67).
- Marketing mocks are tagged "Sample practice" and use `test-fixtures/sample-practice/` figures (PR #69).
- Public contact: sales@newfeeschedule.com only (PR #64).
- View-only shared report at `/r/<token>`, no login required.

**Backend / data**
- API routes under `app/api/`: `onboard`, `intake`, `upload-url`, `parse-pdf`, `carrier-schedule`, `eob-ocr`, `generate`, `report`, `share`, `checkout`, `stripe/webhook`, `account`, `reset-data`, `inbound`, plus `admin/` (seed-finley, verify-rls).
- Inbound mail (`app/api/inbound/route.ts`, `lib/inbound/`): Resend `email.received` webhook with Svix signature check; forwards sales@ mail to `INBOUND_FORWARD_TO` with attachments, `reply_to` set to the sender, and an idempotency key (PR #68).
- `eob-ocr` is a stub: it stores the uploaded image for a human to read and returns `queued: true`. No OCR, no rate limiting yet (`app/api/eob-ocr/route.ts`).
- Parsing (`lib/parser/`): CSV and PDF dispatch; Claude vision extracts code, fee, annual volume, and per-provider fees (`pdf-summary.ts`); per-carrier schedules (`pdf-schedule.ts`).
- Benchmark resolution (`lib/benchmark/resolve.ts`): cascades zip5, zip3, metro, state, region, national; skips levels with sample_size below 30; never blends levels.
- Benchmark source (`lib/benchmark/supabase-source.ts`): zip5 computes national percentile times `zip_geo_factors.geo_factor` at lookup time. Other levels pick the row with the highest `source_version`, then the largest sample. It does not filter by `source_version`.
- NDAS loader (`scripts/load-ndas-source.ts`, `npm run load:ndas`): loads `NMAS.csv`, `ZIPVALS_24.csv`, and optional `headings.csv` into staging tables, `ucr_benchmarks`, `zip_geo_factors`, and `cdt_codes`.
- CDT labels (`lib/cdt/descriptions.ts`): curated short label first, then sentence-cased NDAS nomenclature, then the bare code.
- Computation (`lib/computation/compute.ts`) with snapshot tests.
- Paywall (`lib/report/gate.ts`): the single gating boundary; locked dollar figures (including the carrier figure) are zeroed server-side before payment. It also recomputes totals from stored code rows on read (PR #65) and adds an `inputCheck` with no dollar figures; flagged reports get no dollar teaser (PR #74).
- Fee sanity check (`lib/computation/fee-sanity.ts`): flags fees under 0.7x the local median or recoverable above 60% of production, with 4 unit tests (PR #74).
- Checkout (`app/api/checkout/route.ts`): Stripe promotion codes allowed, card collection only if required; the webhook unlocks on `paid` or `no_payment_required` (PR #73).

**Infrastructure**
- Supabase Postgres, project "Calderwood Tech"; 10 migrations (`supabase/migrations/0001` to `0010`). `0009` adds the zip5 tier and NDAS tables; `0010` enables RLS on them.
- Supabase Auth: Site URL `https://newfeeschedule.com`; redirect allow-list covers apex and `www` (`/reset-password` and `/**`) plus localhost (updated 2026-10-07).
- Stripe Checkout (hosted) plus webhook setting `paid_at` on `checkout.session.completed`.
- Scripts: `load:zcta`, `load:ucr`, `load:ndas`, `geo:build`, `render:sample-report`, `seed:finley`, `db:migrate`. `/data` is gitignored so vendor extracts can't be committed.
- Supervised PR factory (`.claude/agents/pr-reviewer.md`, `.github/workflows/factory.yml`): runs `npm test` on PRs, auto-merges only low-risk surfaces, escalates money, auth, data, and computation. Uses `anthropics/claude-code-action` pinned to v1.0.239 by SHA.
- Post-merge build guard (`.github/workflows/main-build-check.yml`): `npm ci`, `tsc --noEmit`, `next build` on every push to `main`.
- Repo-local skill: `.claude/skills/brand-guide/`.
- Tests: 12 vitest files (adds `fee-sanity`); 101 passing per PR #74.
- Domain: the apex `https://newfeeschedule.com` is canonical; `www` and `http` 308 to it (checked 2026-10-07). `NEXT_PUBLIC_SITE_URL` is the apex in Vercel Production and Preview. Sitemap submitted to Google Search Console 2026-10-07.
- Plan: `ROADMAP.md` (stages 0 to 5, every item dated, Timeline section, last verified 2026-10-07).

---

## Tech stack  [rewrite, scanned from package.json]

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14.2.35 (App Router), React 18, TypeScript, Tailwind 3.4 | `app/`, `components/` |
| Backend | Next.js API routes (Node) | `app/api/` |
| Database | Supabase Postgres (`@supabase/ssr`, `@supabase/supabase-js`) | `supabase/migrations/` |
| Auth | Supabase Auth, email/password plus recovery flow | `middleware.ts`, `docs/auth-password-reset.md` |
| Hosting | Vercel | project `calderwood`, auto-deploy on `main`, live on `newfeeschedule.com` (apex canonical) |
| AI/LLM | Anthropic Claude (`@anthropic-ai/sdk`), native PDF vision | `lib/parser/pdf-summary.ts` |
| Payments | Stripe Checkout plus webhook (`stripe`, `@stripe/stripe-js`) | `lib/stripe.ts`, `app/api/stripe/webhook` |
| Fee data | NDAS 2026 (NMAS percentiles plus ZIPVALS_24 geo factors), licensed | `scripts/load-ndas-source.ts` |
| Geo data | Census 2020 ZCTA-to-County, OMB CBSA delineation (July 2023) | `scripts/build-geo-crosswalk.ts` |
| PDF report | `@react-pdf/renderer` | `lib/report/` |
| Parsing | `papaparse` (CSV), `xlsx`, Claude PDF vision | `lib/parser/` |
| Validation | `zod` 4 | |
| Analytics | Google Tag Manager / GA4, gated on `NEXT_PUBLIC_GTM_ID` | `components/analytics/gtm.tsx` |
| Email | Resend inbound forwarding for sales@ (no outbound transactional email yet); Supabase Auth emails | `app/api/inbound/route.ts` |
| Tests | Vitest | `npm test` |

---

## Integrations & MCPs  [rewrite, auto-generated from MCP config files]

| Integration | Purpose | Cost | Status |
|---|---|---|---|
| Stripe | $199 checkout plus webhook unlocks the gated report; promotion codes allow $0 founding checkouts | usage-based (Stripe fees) | live |
| Supabase | Postgres, auth, RLS | unknown | live |
| Anthropic Claude | PDF extraction of fees, volumes, carrier schedules | usage-based | live |
| NDAS | Licensed fee-percentile data (758 priced codes) | unknown | licensed 2026-10-02 |
| Google Tag Manager / GA4 | Analytics, gated on `NEXT_PUBLIC_GTM_ID` | free | live |
| Vercel | Hosting, auto-deploy | unknown | live |
| Resend | Inbound forwarding of sales@newfeeschedule.com (`/api/inbound`) | unknown | live (tested 2026-10-02) |
| Google Search Console | Indexing for newfeeschedule.com; sitemap submitted 2026-10-07 | free | live (validation pending) |
| PostHog | Product analytics | unknown | planned (env vars only, no code) |

*Source: no MCP config files found in repo; integrations inferred from `.env.example`, `package.json`, `app/api/`, `lib/`, `scripts/`, and owner-reported dashboard work (Search Console).*

---

## Decisions log  [append-only, never rewrite or delete]

The "why" behind key choices. Newest first.

- **2026-10-07: The apex `https://newfeeschedule.com` is the canonical host.** Every page declares its apex URL as canonical; `www` and `http` 308 to it. `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL moved to the apex; `www` stays in the redirect allow-list for older links. Supersedes the 2026-08-12 entry's `www`-only premise, which assumed the apex was NXDOMAIN (PRs #77, #78).
- **2026-10-07: Validate only the duplicate-canonical issue in Search Console.** "Page with redirect" is the intended http/`www` to apex 308, so validating it would only reconfirm a redirect we want. "Crawled, currently not indexed" (3 pages) is Google's call and left alone.
- **2026-10-06: Guard against averaged fees at read time instead of only fixing the parser.** Open Dental's Procedure Summary "Average $" blends office and PPO fees and produced impossible totals. A read-time sanity check covers stored reports without recomputing and hides the dollar teaser on flagged reports. The parser fix is a follow-up (PR #74).
- **2026-10-06: Founding practices get the full report free through Stripe promotion codes.** For field sales in Newport. The code lives in Stripe and can be deactivated anytime; everyone else still pays $199 (PR #73).
- **2026-10-06: Inline the PDF logo as a data URI.** Avoids depending on `public/` being present inside Vercel serverless functions at render time (PR #76).
- **2026-10-02: Date every ROADMAP.md item in ET from sourced records.** Done items carry the PR merge date (or commit date when there was no PR), open items the date they entered the plan. GitHub reports UTC, so evening ET merges (for example #38, #54, #55) show the ET date. Undated items get `date unknown`, never a guess.
- **2026-10-02: Wrote the owner's initiative and previews preferences into `CLAUDE.md`.** Agents do routine, reversible steps themselves, verify before reporting, and stop before money, messages as the owner, secrets, DNS, and data deletion. The repo merge policy still wins where they conflict (PR #71).
- **2026-10-02: Publish only numbers we can back up.** Removed "up to 35%", "up to $120K per provider", and "$73,840 average recovery" (marketing audit Option A, approved by Finley). Mock visuals are labeled "Sample practice" and drawn from the fixture; `CLAUDE.md` now carries the rule (PR #69).
- **2026-10-02: sales@newfeeschedule.com is the only public contact, forwarded by a Resend inbound webhook.** Replaced support@ everywhere public (PR #64). Forwarding runs in-app (`/api/inbound`) to finley@qsbsrollover.com and calderwoodra1113@gmail.com instead of a hosted mailbox (PR #68).
- **2026-10-02: Do not regenerate existing customer PDFs after the totals fix.** Finley chose to leave already-delivered PDFs as they are. Web reports correct themselves on read through `gate.ts`; old PDFs still show the inflated headline. Whether to notify those customers is open.
- **2026-10-02: Headline = fee-schedule gap; carrier figure reported separately with an even volume split.** The old headline summed carrier gaps times full volume across every carrier (about 7x on the fixture). Intake has no payer mix, so an even split per code is the most neutral allocation, matching the provider-variance calc (PRs #65, #67).
- **2026-10-02: Submitted the ADA CDT Content License application.** Sent to CDT-SNODENT@ada.org as Calderwood Tech LLC (Virginia LLC, organized 2025-09-30), contact J Finley Underwood, Principal Agent, for New Fee Schedule. Exhibits use synthetic sample data and marketing pages, not customer data. Closes the pending-submission state in the 2026-07-13 entry.
- **2026-10-02: NDAS is the licensed fee-data source.** Finley confirmed the NDAS fee-data license is signed, clearing the PR #49 gate on using NDAS data (~758 codes) in production report lookups. This supersedes the 2026-07-13 entries that ruled out the standard NDAS developer license, selected REFMed, and kept FAIR Health as fallback; those entries stay as history. Whether REFMed is still needed is open. Naming NDAS in public and report copy is unblocked, subject to the license's attribution terms. The ADA CDT content license is still required separately.
- **2026-10-02: Pinned `anthropics/claude-code-action` to a commit SHA.** Pinned to v1.0.239 (`97c53473391bff1901034d4b454b5bac7ab7a029`) instead of floating `@v1`, after the tag moved to a broken release on 2026-09-28 and broke Kuba-Ventures/Nemat-Trading reviews. Future bumps go in their own PR (PR #60).
- **2026-09-16: Built the geo crosswalks from public Census and OMB data, not the NDAS `ZipDetail.csv`.** Keeps the geo layer free of any licensing question whatever happens with the fee source (PR #52).
- **2026-09-16: Multiply NDAS national percentiles by a zip5 geo factor at lookup time.** Rejected materializing a ~41,000 zip by ~800 code cross-join. NDAS "individually rated" codes stay out of `ucr_benchmarks` so they surface as no-data, not a made-up number (PRs #49, #50).
- **2026-08-12: Pinned password-reset links to one canonical origin and forwarded recovery codes in middleware.** Building the reset link from `window.location.origin` meant the link pointed at whatever host the user happened to be on, and the bare apex `newfeeschedule.com` returns NXDOMAIN, so those links stranded. `lib/site-url.ts` now resolves a single canonical origin (one URL to allow-list in Supabase) and `middleware.ts` forwards a root `?code=` to `/reset-password` via `lib/auth/recovery-redirect.ts`. Both unit tested, documented in `docs/auth-password-reset.md` (PRs #46, #47).
- **2026-08-11: Shipped a real forgot-password / reset-password flow.** Added `/forgot-password` and `/reset-password` as first-class labeled pages rather than leaving account recovery to a bare magic-link round trip. Rationale: the ICP skews older and less technical, and "check your email for a link" with no visible path back is exactly the kind of invisible affordance `CLAUDE.md` rules out (PR #44).
- **2026-08-11: Vendored the brand-guide skill into the repo.** Moved it to `.claude/skills/brand-guide/` so brand deliverables render from repo state rather than a machine-local skill install (PR #43).
- **2026-08-05 to 2026-08-09: Made `CLAUDE.md` the enforcement surface for style, not a description of it.** Added a personal working-style block (PR #40), a shared standard block (PR #41), and a hard no-em-dash rule covering chat, code, comments, UI copy, commit messages, and anything committed (PR #42). Written as instructions that override default behavior, because guidance phrased as preference gets ignored under time pressure.
- **2026-07-28: Wrote audience and design principles into `CLAUDE.md` as binding requirements for every push.** The ICP is independent practice owners and office managers, often older and less tech-savvy, and the client defers visual decisions to us with one firm bar: emphasize the data and the savings, and make the site work on the first try for a non-technical older user. Codified: lead with dollars, body copy 16px or larger (prefer 17 to 18), line-height 1.5 or more, WCAG AA contrast with no light-gray body text on white, plain language paired with dental terms, one primary action per screen, nothing critical behind hover or icon-only controls, no essential content behind scroll reveals, and an accessibility baseline on every PR (PR #24). Rationale: the bar has to be written down or it drifts one "small" change at a time.
- **2026-07-28: Split the landing page into standalone routes instead of scroll anchors.** `/how-it-works`, `/features`, `/sample-report`, `/pricing`, `/resources` are real pages sharing `LandingShell`, with the active nav link highlighted and a real mobile menu (PRs #21, #23, #28, #29). Rationale: labeled, predictable navigation for the ICP; anchor links on one long page are easy to lose on a phone. Follow-ons: the How It Works hybrid was promoted to the main page and the temporary `/hybrid` route dropped (PRs #36, #38); pricing gained a pay-versus-get-back comparison card and moved its FAQ to `/resources` (PR #37).
- **2026-07-28: Content renders without JS; motion is progressive enhancement.** Reveal animations no longer gate content, the hero renders instantly, and motion was softened and made reduced-motion aware (PRs #30, #31). Direct consequence of the accessibility baseline above.
- **2026-07-28: Redesigned the landing surface as a data-forward indigo "Console" layout.** Supersedes the Mintlify-style rebuild from 2026-07-13; palette shifted from blue to indigo (`--brand: #4f46e5`) and the hero was rebuilt as a split Console layout (PRs #18, #19, #20). Rationale: the money is the product, so the page should lead with numbers rather than decoration. Readability sizing followed in PR #32.
- **2026-07-28: Rebranded public-facing copy from Calderwood to "New Fee Schedule"; left the repo, Vercel project, and internal naming alone.** (PR #17). Rationale: the public name should say what the product does, while renaming infrastructure buys nothing and breaks links. Accepted cost: a permanent internal/external name split.

- **2026-07-13 (evening) — Added a post-merge build guard on `main` (detective, not preventive)** — A clean git 3-way merge of #11 onto #10 produced non-compiling source with no conflict marker and landed on `main` unnoticed, because the factory CI only runs `npm test` on PR branches and nothing builds `main` after merge — the break would only have surfaced as a failed production deploy. Added `.github/workflows/main-build-check.yml` (`npm ci` + `tsc --noEmit` + `next build` on every push to `main`); first run passed. Chosen as a detective check for speed; rejected (for now) the preventive alternative of requiring `next build` on every PR in `factory.yml` — left as a possible follow-up.
- **2026-07-13 (evening) — Unified all data-source copy to the neutral "a national UCR benchmark database"; deferred naming REFMed** — Both the landing page and the report PDF (`methodology-section.tsx`) now use neutral wording and name no vendor. Rationale: REFMed dental CDT coverage and charge-percentile UCR are still unverified, so naming them publicly is not yet defensible; the neutral phrasing is accurate and safe regardless of which source is ultimately licensed. Naming REFMed is deferred until they confirm dental CDT coverage + charge-based UCR percentiles in writing. Supersedes the brief period where REFMed wording was live (PR #8, then neutralized by #10).
- **2026-07-13 (evening) — Rebuilt the landing page as typed reusable components with an additive token palette** — Rebuilt `app/page.tsx` + `components/landing/**` to a Mintlify-style design (PR #11). Kept the new brand/gold/violet palette additive (new CSS vars + Tailwind tokens) rather than replacing the existing ink/canvas/accent theme, so dashboard/report/onboarding render unchanged. Built motion primitives in-repo (`components/motion/`) instead of adding framer-motion, to avoid a dependency and keep the low-risk landing surface dependency-free.
- **2026-07-13 (later) — Selected REFMed TruePrice as the intended UCR data source; FAIR Health drops to fallback** — After a sales call with REFMed, Finley chose REFMed TruePrice over FAIR Health as the primary UCR source. Important caveat: REFMed only confirmed verbally a "national UCR database covering all 50 states," while all their public materials (TruePrice/TrueUCR/TrueFee) describe a medical product keyed to CPT/HCPCS with allowed-amount deciles — not dental CDT codes and not charge-percentile UCR, which is exactly what Calderwood's report model requires. So the selection is provisional: unverified are (1) dental CDT ("D") code coverage and (2) charge-based UCR percentiles vs allowed-amount deciles. A verification email requesting a sample D1110/D2740 lookup is drafted (`REFMed-dental-verification-email-DRAFT.txt`); written confirmation is now the prerequisite input to the compliance review. FAIR Health (FH Charge Dental, prior recommendation) stays as the fallback. Nothing signed. Public copy already updated to cite REFMed (see below); PR is human-review-required.
- **2026-07-13 — FAIR Health is the recommended fee-data source for coverage expansion** — After reviewing the licensing documents, FAIR Health (FH Charge Dental) is the recommended path from ~19 to 140+ CDT codes: CDT-arrayed charge percentiles, ~493 geozips, near-total procedure coverage, and an existing commercial data-licensing business that supports vendors embedding FH Benchmarks. Rejected: standard NDAS "Developers License Agreement 2026" (internal-use only; §§4/7/8 forbid redistribution and ASP/service-bureau use — wrong instrument for reselling embedded data). Fallback: Sikka Software (742 codes, ZIP-level) but only via a bespoke OEM/data license since its standard ONE API license bars redistribution. Not viable: ADA HPI Survey of Dental Fees (discontinued 2023). Inquiry emails to FAIR Health and NDAS/Wasserman drafted; nothing signed.
- **2026-07-13 — Treat a written FAIR Health redistribution license as the prerequisite input to the compliance review, not a parallel track** — The data-sourcing compliance review can't clear without a benchmark source that grants written third-party redistribution rights. Until that license is in hand, benchmarking stays limited to the vetted ~19-code subset.
- **2026-07-13 — Separate ADA CDT commercial license required regardless of data source** — CDT codes/descriptors are ADA-copyrighted, so a CDT Content License is needed independent of which fee-data licensor is chosen. Application completed, attested, and dated 2026-06-25 with product/marketing exhibits (`Calderwood-CDT-application-with-exhibits.pdf`), pending submission to CDT-SNODENT@ada.org once the company-history summary and company URL fields are filled.
- **2026-06-26 — Benchmark only ~19/142 CDT codes for now** — Reporting is limited to a vetted subset of codes; expanding coverage is gated on a compliance review of UCR data sourcing (~week of 2026-06-15). Avoids shipping benchmarks the data sourcing can't yet defend.
- **2026-06-09 — Supervised PR factory with low-risk-only auto-merge** — Auto-merge restricted to landing/legal/markdown; anything touching money, auth, data, schema, or report computation escalates to a human (see `CLAUDE.md`, `.claude/agents/pr-reviewer.md`).
- **2026-05 — Single paywall boundary in `lib/report/gate.ts`** — All gating lives in one place; locked dollar figures are zeroed server-side so they never reach the browser pre-payment, while a non-gated teaser stays visible.
- **2026-05 — Benchmark cascade picks one geo level, never blends** — `resolveBenchmark` cascades zip3 → metro → state → region → national, skipping levels below sample_size 30, and uses exactly one level per code for defensibility.
- **2026-05 — PDF extraction via Claude native vision over OCR rules** — PM "Procedure Summary" PDFs are parsed with Claude vision into code + fee + annual volume rather than brittle per-PM-system parsers.

---

## Open loops  [rewrite, but carry forward unfinished items]

Compliance and data:

- [x] Submit the ADA CDT content license application. Sent to CDT-SNODENT@ada.org 2026-10-02.
- [ ] Review and sign ADA's template CDT license agreement when it arrives. Waiting on: ADA
- [ ] Check the NDAS license attribution terms, then decide whether to name the data source in public copy (`components/landing/faq.tsx`, `deliverable.tsx`) and the report methodology (`components/report/methodology-section.tsx`). Copy is currently accurate and vendor-neutral (PRs #62, #63, #66). Owner: Finley
- [ ] Decide whether REFMed is still needed now that NDAS is licensed, or drop it. The drafted REFMed verification email is moot unless it is. Waiting on: Finley
- [ ] Decide the NDAS placeholders from PR #49: `p75` as the mean of p70 and p80, fixed `sample_size` of 500, and whether `ZIPVALS_24.available` should filter zips. Owner: Finley
- [ ] Decide whether `lib/benchmark/supabase-source.ts` should filter by `source_version` instead of taking the highest one. Owner: Finley
- [ ] Confirm which `source_version` rows are loaded in production `ucr_benchmarks` today. Owner: Finley

Launch readiness:

- [x] Make the public contact address deliverable. sales@newfeeschedule.com forwards via `/api/inbound`, tested 2026-10-02 (PRs #64, #68).
- [ ] Decide whether to notify existing customers that their PDF totals were overstated before PR #65. Owner: Finley
- [ ] Outbound transactional email (receipts, report-ready notices): none in code yet. Owner: Finley
- [ ] EOB OCR: `app/api/eob-ocr/route.ts` is a stub with no rate limiting, which the file says is needed before paid traffic. Owner: Finley
- [ ] Decide manual vs automated fulfillment for the first paid customers (README runbook is manual, ~2h per customer). Owner: Finley
- [x] Confirm the canonical origin is allow-listed in Supabase Redirect URLs. Done 2026-10-07: apex Site URL and allow-list, reset email tested end to end.
- [ ] Check the Search Console "Validate fix" outcome for "Duplicate without user-selected canonical" around 2026-10-21. Owner: Finley
- [ ] Confirm the sitemap status in Search Console flips from "Couldn't fetch" to "Success". Owner: Finley
- [ ] Fix the PDF parser to take quantities from the Procedure Summary and fees from the office fee schedule, not "Average $" (follow-up named in PR #74; tracked in issue #80). Owner: Finley
- [ ] Watch the forgot-password form: on 2026-10-07 the first automated submit cleared without sending a request; the second worked. Not confirmed as a bug. Owner: Finley
- [ ] Issue #39 (Headers, open since 2026-07-28 ET): combine `/features` and `/sample-report` under one "Features" heading. Owner: Finley
- [ ] Rewrite or delete the stale `README.md` (Puppeteer, a finished phase plan, old `kubatopia/calderwood` URL, retired public name; it also lists PostHog as wired). Owner: Finley
- [ ] Manually test an onboarding failure after practice creation and confirm no orphaned practice row remains (unchecked item on PR #57). Owner: Finley

Later:

- [ ] Product analytics: PostHog is only in `.env.example`. Owner: Finley
- [ ] Add a preventive `next build` gate to PRs in `factory.yml` (the `main` guard is detective only). Owner: Finley
- [ ] Move both workflows off `node-version: "20"`. Owner: Finley

Open questions from `ROADMAP.md`: is REFMed still needed, and who fulfills paid reports? The ADA submission question is answered (sent 2026-10-02).

---

## Risks & known issues  [rewrite]

- PDFs delivered to customers before PR #65 show a headline about 7x too high (carrier gaps times full volume, summed across carriers). They were intentionally not regenerated. The web version of the same report now shows the corrected figure, so a customer comparing the two will see different numbers.
- The ADA CDT content license is applied for (2026-10-02) but unsigned. CDT codes and descriptors are ADA-copyrighted, and reports show NDAS nomenclature for up to 758 codes (PR #53).
- The carrier figure assumes patients split evenly across carriers on each code; intake does not capture payer mix.
- Inbound mail depends on config outside the repo: Squarespace MX, Resend receiving, a webhook, and two Vercel env vars. The `RESEND_API_KEY` is full access.
- `supabase-source.ts` does not filter by `source_version`; it takes the highest value by string sort. If the older ~19-code rows and NDAS rows coexist, which source wins depends on how the version strings sort, not on an explicit choice.
- NDAS placeholders shape the dollar figures: `p75` is interpolated, and `sample_size` is a fixed 500, which always clears the floor of 30, so NDAS rows never trigger the low-confidence cascade skip.
- Resolved 2026-10-02: the FAQ and methodology no longer claim "no modeled estimates" (PRs #62, #63), and report methodology matches the ZIP5-first cascade (PR #66).
- No product analytics and no outbound transactional email are live. The README says otherwise.
- The EOB OCR endpoint is pre-auth with no rate limiting.
- The `main` build guard is detective, not preventive.
- Password recovery depends on config outside the repo: `NEXT_PUBLIC_SITE_URL` in Vercel and the Supabase Site URL and allow-list, all set to the apex and verified 2026-10-07. Changing the host again means changing all three.
- The forgot-password form once cleared without sending a request during an automated test (2026-10-07). Unconfirmed; watch for user reports.
- Search Console validation is pending. Until it passes, Google may still index `www` duplicates.
- The PDF parser still reads "Average $" from Procedure Summary PDFs. The fee sanity check catches the worst cases but does not fix the input; reports that fall just inside the thresholds can still understate fees.
- Founding promo codes produce $0 unlocked reports. Anyone holding a code gets a free report until it is deactivated in Stripe.
- The brand split (public "New Fee Schedule" vs internal "Calderwood") is a documentation trap. Expect drift.
- PDF extraction depends on Claude vision quality across PM exports; the review step mitigates but does not eliminate errors.
- `lib/report/gate.ts` must stay the only paywall gate; any regression risks exposing locked figures pre-payment.

---

## Links  [rewrite]

- **Live URL:** `https://newfeeschedule.com` (Vercel project `calderwood`, auto-deploy on `main`). `www` and `http` 308 to the apex.
- **Sitemap / robots:** `https://newfeeschedule.com/sitemap.xml`, `https://newfeeschedule.com/robots.txt`
- **Staging:** (none documented)
- **Repo:** `https://github.com/Kuba-Ventures/calderwood` (the README still points at the old `kubatopia/calderwood`)
- **Client Drive folder:** unknown
- **Slack channel:** unknown
- **Internal docs:** `ROADMAP.md`, `docs/auth-password-reset.md`, `CLAUDE.md` (audience, design principles, merge policy)

---

## Changelog  [append-only, never rewrite or delete]

- **2026-10-07:** Recorded PRs #73 to #78: founding promo codes (#73), averaged-fee warning (#74), PDF footer and logo (#75, #76), canonical tags, robots, sitemap (#77), and the apex as canonical host (#78). Logged the Search Console sitemap submit and validation, the Vercel and Supabase apex config, and the end-to-end reset test.
- **2026-10-02 (evening):** Recorded PR #71 (`CLAUDE.md` initiative and previews block). Re-verified tests (97 passing), the `main` build, and live pages. Corrected drift: the apex domain now redirects to `www`, and `NEXT_PUBLIC_SITE_URL` is set in Vercel. Dated every `ROADMAP.md` item and added its Timeline.
- **2026-10-02 (late):** Recorded PRs #62 to #69: FAQ and methodology copy fixes (#62, #63, #66), sales@ as the only public contact (#64), report totals and percentile fix (#65, #67), live Resend inbound forwarder (#68), unsourced marketing stats removed (#69). ADA CDT application sent; old customer PDFs left as is.
- **2026-10-02:** PROJECT.md refreshed for PRs #49 to #60. NDAS license signed (confirmed by Finley), replacing the REFMed and FAIR Health candidates; recorded the NDAS pipeline (#49 to #53, #58), onboarding fixes (#54, #55, #57), `ROADMAP.md` (#59), and the claude-code-action SHA pin (#60). Corrected drift: Resend and PostHog are env-only, EOB OCR is a stub, the resolver does not filter by `source_version`, 10 migrations and 8 test suites.
- **2026-09-16 to 2026-09-23:** Shipped the NDAS zip5 tier and loader (#49, #50), CDT descriptions and categories (#51), public geo crosswalks (#52), readable labels for every code (#53), signup confirm-password (#54), upload and onboarding error fixes (#55, #57), and RLS on the NDAS tables, applied to production 2026-09-23 (#58).
- **2026-08-19:** PROJECT.md refreshed after five weeks of drift, covering the 24 PRs merged since the last update (#15 through #47). Recorded the public rebrand to "New Fee Schedule", the second landing redesign (indigo "Console" layout) and its split into five standalone routes, the ICP readability and accessibility pass, `CLAUDE.md` becoming the enforcement surface for audience, design, and style rules, the real forgot-password / reset-password flow with canonical-origin pinning, and the repo-local brand-guide skill. Data sourcing unchanged and still the critical path: neutral copy, REFMed unverified, ~19 of 142 CDT codes, nothing signed.
- **2026-08-11 to 2026-08-12:** Shipped account recovery: `/forgot-password` and `/reset-password` pages (#44), root `?code=` forwarding in `middleware.ts` (#46), and reset links pinned to the canonical origin with unit tests and `docs/auth-password-reset.md` (#47). Vendored the brand-guide skill into `.claude/skills/` (#43).
- **2026-08-05 to 2026-08-09:** `CLAUDE.md` gained a personal working-style block (#40), a shared standard block (#41), and a no-em-dash rule covering everything committed (#42).
- **2026-07-28:** Large public-surface day. Rebranded public copy to "New Fee Schedule" (#17); shifted the palette to indigo and rebuilt the landing as a data-forward Console layout (#18, #19, #20); split the nav into standalone pages (#21) with active-link highlighting (#23); wrote audience and design principles into `CLAUDE.md` (#24); ran the ICP readability and accessibility pass, mobile nav, contrast, focus states, plain-language glosses, JS-free content, sizing (#28, #29, #31, #32); removed em dashes from user-facing copy (#22); iterated How It Works to the hybrid and dropped `/hybrid` (#36, #38); added the pricing value-comparison card and moved the FAQ to `/resources` (#37).
- **2026-07-14:** Real provider logos in the carrier proof bar (#16).
- **2026-07-13 (evening):** Rebuilt the marketing landing page as a typed, reusable Mintlify-style component set (PR #11) — additive brand token palette leaving the app theme untouched, dependency-free motion primitives, signature bars, sticky LandingNav; removed orphaned `report-mockup.tsx`. Hit a merge-corruption incident: a clean 3-way merge of #11 onto #10 produced non-compiling source that landed on `main` (factory CI only tests PR branches, never builds); PR #12 repaired `proof-bar.tsx`/`faq.tsx` and unified all data-source copy (site + report PDF) to the neutral "a national UCR benchmark database"; PR #13 added a post-merge build guard (`main-build-check.yml`, first run passed). Site now names no vendor — REFMed remains selected-but-unverified, naming deferred pending written dental-CDT confirmation. Nothing signed.
- **2026-07-13 (later):** Selected REFMed TruePrice as intended UCR source over FAIR Health (now fallback) after a sales call; updated public copy to cite "REFMed's national UCR database" in proof-bar/faq/methodology (removed stale discontinued "ADA Survey of Dental Fees"), PR open and human-review-required. Recorded caveat that REFMed's public materials are a medical CPT/HCPCS allowed-amount product; dental CDT coverage + charge-percentile UCR are unverified. Drafted REFMed verification email (D1110/D2740 sample lookup) as the prerequisite for the compliance review. Nothing signed.
- **2026-07-13:** Recorded UCR data-sourcing/licensing direction — reviewed licensing docs, ruled out off-the-shelf NDAS (no redistribution), recommended FAIR Health, drafted inquiries to FAIR Health + NDAS; ADA CDT license application completed/dated 2026-06-25 pending submission. Corrected terminology (CDT not "CDC"; NDAS/Wasserman not "Henry Schein"). Nothing signed.
- **2026-06-26:** Initial PROJECT.md superdoc created from repo scan (61 commits, through PR #5 report parity).
