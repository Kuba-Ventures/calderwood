# Calderwood (Fee IQ)
*A $199 dental fee-schedule assessment that shows practices where they're underpaid.*

*Last updated: 2026-07-13 21:15 ET by kuba-vault*

---

## TL;DR  [rewrite]

Calderwood is a self-serve web product that benchmarks a dental practice's fee schedule against UCR (usual, customary, reasonable) data and surfaces recoverable revenue per code and per carrier. A practice onboards, uploads fees/volumes (CSV or PDF from their practice-management system), pays $199 via Stripe, and gets a gated report — on the web and as a downloadable PDF. The product is post-MVP: onboarding, computation, paywall, report rendering, and view-only sharing all work. This session rebuilt the marketing landing page as a typed, reusable Mintlify-style component set (PR #11) — the app/dashboard/report theme was untouched. That merge exposed a CI blind spot: a clean git 3-way merge silently produced non-compiling source that landed on `main` (the factory only runs tests on PR branches, never builds); PR #12 repaired it and PR #13 added a post-merge build guard on `main`. In the same repair pass, all data-source copy on the site and in the report PDF was unified to the neutral "a national UCR benchmark database" — the site no longer names any vendor. REFMed TruePrice remains the selected-but-unverified intended source; naming it publicly is deferred until REFMed confirms in writing that it covers dental CDT codes with charge-based UCR percentiles. The main open constraint is unchanged: a compliance gate limits benchmarking to ~19 of 142 CDT codes. Nothing is signed with anyone.

---

## What it is  [rewrite when value prop evolves]

**The problem:** Dental practices set fees blind and quietly leave money on the table — they don't know which procedure codes are priced below what carriers in their area actually reimburse.
**The solution:** Upload your fees and volumes; get a benchmarked report showing per-code and per-carrier underpayment and total recoverable revenue.
**The user:** Independent and small-group dental practices (office managers / owner-dentists).
**The value:** A $199 assessment that typically points to multiples of that in recoverable annual revenue.

---

## Status  [rewrite]

- **Phase:** post-MVP iteration
- **Engagement manager:** self-directed
- **Lead:** Finley
- **Cadence:** self-directed
- **Next milestone:** send the drafted REFMed dental-CDT verification email (gates both naming REFMed publicly and the compliance review that gates coverage expansion); FAIR Health remains the fallback
- **Flags:** shipping

---

## Where we are right now  [rewrite]

This session was mostly frontend + CI. The marketing landing page got a full rebuild (PR #11, merged) into a "Mintlify-style" design as typed, reusable React/Tailwind components: new hero + floating report card, carrier marquee, "three answers" bento, stat band, methodology ledger, 4-step how-it-works, FAQ accordion, gradient CTA, footer, and a dedicated sticky `<LandingNav>` (the global `<Header>` is now suppressed on `/`). Supporting pieces: an additive Mintlify design-token palette (brand/gold/violet as CSS vars + Tailwind tokens) that leaves the existing ink/canvas/accent theme untouched — so dashboard, report, and onboarding are unaffected; Plus Jakarta Sans (display) + IBM Plex Mono (data) via `next/font` (Inter kept for body); dependency-free motion primitives in `components/motion/` (useInView, useReducedMotion, Reveal, CountUp, rolling-digit Odometer — no framer-motion added); signature bar components (GapBar, PercentileBar, CarrierBar); and shared `components/landing/ui.tsx`. Reduced-motion support, focus outlines, SR-readable final values, and reserved space are baked in. The orphaned `report-mockup.tsx` was removed.

That merge caused a real incident. #11 merged on top of #10 (an earlier PR that had neutralized the data-source copy); git 3-way-merged both branches' edits to the same files with no conflict marker, producing non-compiling source (`proof-bar.tsx` had the new marquee spliced into the old section; `faq.tsx` had a duplicate object key). `main` did not build. Root cause: the factory CI (`.github/workflows/factory.yml`) only runs `npm test` on PR branches — it never builds the app, and nothing built `main` after merge, so the broken merge would only have surfaced as a failed production deploy. PR #12 (merged) repaired both files and, in the same pass, unified all data-source copy to the neutral "a national UCR benchmark database" across both the landing page and the report PDF (`methodology-section.tsx`). PR #13 (merged) added `.github/workflows/main-build-check.yml` — `npm ci` + `tsc --noEmit` + `next build` on every push to `main` — so a build-breaking merge now shows as a red commit immediately. First run passed. Note this is a detective (post-merge) check; a preventive PR-build gate in `factory.yml` is a possible follow-up.

Data-source state: the public site and the report PDF now consistently say the neutral "a national UCR benchmark database" and no longer name REFMed. REFMed TruePrice remains the selected-but-unverified intended source. Naming it publicly is deferred until REFMed confirms in writing that it covers dental CDT codes (the pending D1110/D2740 verification) and whether its values are charge-percentile UCR vs allowed-amount deciles — REFMed's public materials (TruePrice/TrueUCR/TrueFee) describe a medical CPT/HCPCS allowed-amount product. So the site sits in a safe, defensible neutral state with no unverified vendor claim live; this supersedes the earlier state where REFMed wording was briefly live. Separately, an ADA CDT commercial license is still required regardless of source (application completed/dated 2026-06-25, pending submission minus two blank fields). Nothing is signed with anyone. Next concrete step is Finley's: send the drafted REFMed verification email (`~/Desktop/Work/Calderwood/REFMed-dental-verification-email-DRAFT.txt`).

---

## What's built  [rewrite]

**Frontend / UI**
- Landing page (`app/page.tsx` + `components/landing/*`) rebuilt to a Mintlify-style design as typed, reusable components: hero + floating report card, carrier marquee, "three answers" bento, stat band, methodology ledger, 4-step how-it-works, FAQ accordion, gradient CTA, footer, and a sticky `<LandingNav>` (global `<Header>` suppressed on `/`). Additive design-token palette (brand/gold/violet) leaves the app's ink/canvas/accent theme untouched. Plus Jakarta Sans + IBM Plex Mono via `next/font` (Inter kept for body). Dependency-free motion primitives in `components/motion/` (Reveal, CountUp, Odometer, useInView, useReducedMotion — no framer-motion). Signature bars (GapBar/PercentileBar/CarrierBar), shared `ui.tsx` (Pill/Button/SectionHead/Glow). Reduced-motion, focus outlines, SR-readable values, reserved space for CLS. Search-engine indexing enabled, GTM container wired (gated on `NEXT_PUBLIC_GTM_ID`).
- Authenticated app surface under `app/(app)/` — dashboard, intake, reports, account.
- Onboarding flow (`components/onboarding/`) with unified upload box and staged PDF extraction progress, plus a post-extraction review step.
- Report UI (`components/report/`): per-code fee-vs-UCR table (cents shown), ordinal percentile, carrier scorecard/heatmap, category opportunity, methodology; underpayment shown red as a positive recoverable figure. Dense tables tightened for mobile.
- View-only shared report at `app/r/` (`/r/<token>`), no login required.
- Account page (Supabase-backed) with a "Remove data" reset for testing.

**Backend / data**
- API routes under `app/api/`: `onboard`, `intake`, `upload-url`, `parse-pdf`, `carrier-schedule`, `eob-ocr`, `generate`, `report`, `share`, `checkout`, `stripe/webhook`, `account`, `reset-data`, plus `admin/` (seed, verify-rls).
- Parsing (`lib/parser/`): CSV and PDF dispatch; PDF "Procedure Summary" extraction via Claude vision (`pdf-summary.ts`) for code + fee + annual volume; per-carrier fee-schedule capture (`pdf-schedule.ts`) feeds carrier ranking.
- Benchmark resolution (`lib/benchmark/resolve.ts`): cascades zip3 → metro → state → region → national, skipping levels with sample_size < 30; never blends across levels.
- Computation (`lib/computation/compute.ts`) with snapshot tests.
- Paywall (`lib/report/gate.ts`): the single gating boundary — zeros locked numbers (headline $, top-carrier $, per-code annual gap, per-carrier recoverable $) pre-payment; teaser (% codes below UCR, fee-vs-UCR columns, rounded opportunity) stays visible.

**Infrastructure**
- Supabase Postgres; 7 migrations (`supabase/migrations/0001`–`0007`) covering schema, practice name, paywall provenance, PDF input method, unique email, phone, and share token.
- Stripe Checkout (hosted) + webhook sets `paid_at` on `checkout.session.completed`.
- Scripts: `load:zcta`, `load:ucr`, `render:sample-report`, `seed:finley`, `db:migrate`.
- Supervised PR factory (`.claude/agents/pr-reviewer.md` / `.github/workflows/factory.yml`) — runs `npm test` on PR branches; auto-merges only low-risk surfaces (landing, legal, markdown); everything touching money/auth/data/computation escalates to a human.
- Post-merge build guard (`.github/workflows/main-build-check.yml`) — `npm ci` + `tsc --noEmit` + `next build` on every push to `main`, so a build-breaking merge goes red immediately instead of surfacing as a failed deploy.

---

## Tech stack  [rewrite]

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14.2 (App Router), React 18, TypeScript, Tailwind 3.4 | `app/`, `components/` |
| Backend | Next.js API routes (Node) | `app/api/` |
| Database | Supabase Postgres (`@supabase/ssr`, `@supabase/supabase-js`) | `supabase/migrations/` |
| Hosting | Vercel | project `calderwood`, auto-deploy on push to `main` |
| AI/LLM | Anthropic Claude (`@anthropic-ai/sdk`) — native PDF vision for extraction | `lib/parser/pdf-summary.ts` |
| Payments | Stripe Checkout + webhook (`stripe`, `@stripe/stripe-js`) | `lib/stripe.ts`, `app/api/stripe/webhook` |
| PDF report | `@react-pdf/renderer` | `lib/report/` |
| Parsing | `papaparse` (CSV), `xlsx`, Claude PDF vision | `lib/parser/` |
| Validation | `zod` | |
| Email | Resend (configured via env) | |
| Analytics | Google Tag Manager / GA4 (gated on `NEXT_PUBLIC_GTM_ID`), PostHog (optional) | |
| Tests | Vitest | `npm test` |

---

## Integrations & MCPs  [rewrite — auto-generated from MCP config files]

| Integration | Purpose | Cost | Status |
|---|---|---|---|
| Stripe | $199 checkout + webhook unlocks the gated report | usage-based (Stripe fees) | live |
| Supabase | Postgres persistence, auth, RLS | unknown | live |
| Anthropic Claude | PDF extraction of fees, volumes, carrier schedules | usage-based | live |
| Resend | Transactional / delivery email | unknown | configured (env) |
| Google Tag Manager / GA4 | Analytics, gated on `NEXT_PUBLIC_GTM_ID` | free | live |
| PostHog | Product analytics (optional) | unknown | optional |
| Vercel | Hosting, auto-deploy | unknown | live |

*Source: no MCP config files found in repo; integrations inferred from `.env.example`, `package.json`, and `lib/`.*

---

## Decisions log  [append-only — never rewrite or delete]

The "why" behind key choices. Newest first.

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

## Open loops  [rewrite — but carry forward unfinished items]

- [ ] Send the drafted REFMed dental-CDT verification email (`~/Desktop/Work/Calderwood/REFMed-dental-verification-email-DRAFT.txt`) requesting a sample D1110/D2740 lookup; get written confirmation of (1) dental CDT coverage and (2) charge-based UCR percentiles vs allowed-amount deciles — gates both naming REFMed publicly and the compliance review — Finley
- [ ] Fill the two blank CDT-application fields (incorporation date/state, company URL) and submit the ADA CDT license application to CDT-SNODENT@ada.org — Finley
- [ ] Fallback: pursue a FAIR Health commercial license with written redistribution rights if REFMed can't confirm dental CDT charge-percentile UCR — Finley
- [ ] Compliance review of data sourcing before expanding code coverage beyond ~19 codes — gated on written REFMed confirmation (or a FAIR Health license as fallback) — Finley
- [ ] Optional CI follow-up: add a preventive `next build` gate to PRs in `factory.yml` (the `main` build guard is currently detective-only) — Finley
- [ ] Optional CI follow-up: bump CI actions off deprecated Node 20 — Finley
- [ ] Confirm Resend delivery email is wired and sending in production — Finley
- [ ] Decide manual vs. automated fulfillment for first paid customers (README runbook is still manual ~2h/customer) — Finley

---

## Risks & known issues  [rewrite]

- Public/report data-source copy is now neutral ("a national UCR benchmark database") and names no vendor, so there is no unverified vendor claim live — a safe state. Risk remaining: REFMed dental coverage is unconfirmed (their public materials describe a medical CPT/HCPCS allowed-amount product; we have only a verbal claim of a national UCR database). Do not switch the copy to name REFMed until written confirmation of dental CDT charge-percentile UCR is in hand.
- CI blind spot (a clean 3-way merge can land non-compiling source without a conflict marker, and the factory only tests PR branches) is now mitigated by the `main` build guard (`main-build-check.yml`) — but that guard is detective (post-merge). A build-breaking merge still lands on `main` momentarily before going red; a preventive PR-build gate would close the window.
- Benchmark coverage is narrow (~19/142 CDT codes); reports may understate or feel incomplete until the compliance gate clears, which now depends on written REFMed confirmation (or a FAIR Health license as fallback). Nothing is signed with anyone.
- Licensing risk: whichever source is chosen, terms and redistribution rights still have to be negotiated; timelines are unknown and outside our control. (The off-the-shelf NDAS form was ruled out — it forbids reselling embedded data.)
- PDF extraction depends on Claude vision quality across heterogeneous PM exports (Dentrix/Eaglesoft/Open Dental); the post-extraction review step mitigates but doesn't eliminate extraction errors.
- Money is rendered in multiple places (web report, PDF, dashboard); any gating regression risks exposing locked figures pre-payment — `lib/report/gate.ts` must remain the only gate.
- Fulfillment for early customers may still be partly manual per the README runbook.

---

## Links  [rewrite]

- **Live URL:** Vercel project `calderwood` (auto-deploy on `main`) — exact domain unknown
- **Staging:** (none documented)
- **Client Drive folder:** unknown
- **Slack channel:** unknown
- **Related repos:** `https://github.com/kubatopia/calderwood` (per README)

---

## Changelog  [append-only — never rewrite or delete]

- **2026-07-13 (evening):** Rebuilt the marketing landing page as a typed, reusable Mintlify-style component set (PR #11) — additive brand token palette leaving the app theme untouched, dependency-free motion primitives, signature bars, sticky LandingNav; removed orphaned `report-mockup.tsx`. Hit a merge-corruption incident: a clean 3-way merge of #11 onto #10 produced non-compiling source that landed on `main` (factory CI only tests PR branches, never builds); PR #12 repaired `proof-bar.tsx`/`faq.tsx` and unified all data-source copy (site + report PDF) to the neutral "a national UCR benchmark database"; PR #13 added a post-merge build guard (`main-build-check.yml`, first run passed). Site now names no vendor — REFMed remains selected-but-unverified, naming deferred pending written dental-CDT confirmation. Nothing signed.
- **2026-07-13 (later):** Selected REFMed TruePrice as intended UCR source over FAIR Health (now fallback) after a sales call; updated public copy to cite "REFMed's national UCR database" in proof-bar/faq/methodology (removed stale discontinued "ADA Survey of Dental Fees"), PR open and human-review-required. Recorded caveat that REFMed's public materials are a medical CPT/HCPCS allowed-amount product; dental CDT coverage + charge-percentile UCR are unverified. Drafted REFMed verification email (D1110/D2740 sample lookup) as the prerequisite for the compliance review. Nothing signed.
- **2026-07-13:** Recorded UCR data-sourcing/licensing direction — reviewed licensing docs, ruled out off-the-shelf NDAS (no redistribution), recommended FAIR Health, drafted inquiries to FAIR Health + NDAS; ADA CDT license application completed/dated 2026-06-25 pending submission. Corrected terminology (CDT not "CDC"; NDAS/Wasserman not "Henry Schein"). Nothing signed.
- **2026-06-26:** Initial PROJECT.md superdoc created from repo scan (61 commits, through PR #5 report parity).
