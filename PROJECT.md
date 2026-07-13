# Calderwood (Fee IQ)
*A $199 dental fee-schedule assessment that shows practices where they're underpaid.*

*Last updated: 2026-07-13 16:30 ET by kuba-vault*

---

## TL;DR  [rewrite]

Calderwood is a self-serve web product that benchmarks a dental practice's fee schedule against UCR (usual, customary, reasonable) data and surfaces recoverable revenue per code and per carrier. A practice onboards, uploads fees/volumes (CSV or PDF from their practice-management system), pays $199 via Stripe, and gets a gated report — on the web and as a downloadable PDF. The product is post-MVP: onboarding, computation, paywall, report rendering, and view-only sharing all work. The main open constraint is a compliance gate limiting how many CDT codes can be benchmarked — the report covers ~19 of 142 codes. Current focus is unblocking that by locking a UCR data source. After a sales call, Finley selected REFMed TruePrice as the intended source over FAIR Health (now the fallback). One catch: REFMed only confirmed verbally that they have a national UCR database, and all their public materials describe a medical product (CPT/HCPCS, allowed-amount deciles) — not dental CDT codes or charge-percentile UCR, which is what Calderwood's report model needs. So REFMed is selected-but-unverified: a verification email requesting a sample CDT lookup is drafted, and written confirmation that they cover dental CDT codes with charge-based UCR percentiles is now the prerequisite input to the still-open compliance review. Public copy already cites "REFMed's national UCR database" (PR open, human-review-required). Nothing is signed with anyone.

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
- **Next milestone:** get written confirmation from REFMed that TruePrice covers dental CDT codes with charge-based UCR percentiles (not just allowed-amount deciles) — the prerequisite input to the still-open compliance review that gates benchmark coverage expansion; FAIR Health remains the fallback
- **Flags:** shipping

---

## Where we are right now  [rewrite]

The full path works end to end: onboard → upload fees and volumes → compute benchmark → pay $199 → see the gated report on the web and download the PDF. The last several PRs (#3–#5) pushed report parity — the rich sections (carrier scorecard + grade, carrier-vs-code heatmap, category opportunity rollup, methodology) now render in both the web report and the PDF, and the web report got the percentile callout and a "full picture" section. View-only sharing via `/r/<token>` is live so a practice can hand someone a read-only link with no login.

The active work is the data-sourcing path that gates expanding coverage beyond the vetted ~19 of 142 CDT codes. After a sales call with REFMed, Finley selected REFMed TruePrice as the intended UCR source, chosen over FAIR Health — which now drops to fallback. On the strength of that, public-facing copy was switched to cite "REFMed's national UCR database" in three places (`components/landing/proof-bar.tsx`, `components/landing/faq.tsx`, `components/report/methodology-section.tsx`), which also removed the stale "ADA Survey of Dental Fees" reference (that survey was discontinued in 2023). Those copy changes are on branch `chore/refmed-data-source` with a PR open; because they touch data-provenance (trust) and report methodology, the repo merge policy requires human review before shipping — they are not auto-mergeable.

The important caveat, recorded honestly: REFMed only confirmed verbally that they have a "national UCR database covering all 50 states." But all of REFMed's public materials (TruePrice, TrueUCR, TrueFee) describe a medical product keyed to CPT/HCPCS codes with allowed-amount deciles — not dental CDT codes, and not charge-percentile UCR. Calderwood's entire report is built on billed-charge UCR percentiles (50th/75th/90th) for dental CDT codes. So two things stay unverified and must be confirmed in writing before we rely on REFMed: (1) that their database includes dental CDT ("D") codes, and (2) whether values are charge-based UCR percentiles vs allowed-amount deciles. A verification email requesting a sample lookup for D1110 and D2740 is drafted (`REFMed-dental-verification-email-DRAFT.txt`); that written confirmation is now the prerequisite input to the still-open compliance review. Separately, CDT codes/descriptors are ADA-copyrighted regardless of source, so an ADA CDT commercial license is still required; that application is completed, attested, and dated 2026-06-25 (with product/marketing exhibits), pending submission to CDT-SNODENT@ada.org, minus two blank fields (company-history summary, company URL). Nothing is signed with REFMed or anyone. Next concrete step: send the REFMed verification email and hold the copy PR for human review.

---

## What's built  [rewrite]

**Frontend / UI**
- Landing page composed from `components/landing/*`; search-engine indexing enabled, GTM container wired (gated on `NEXT_PUBLIC_GTM_ID`).
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
- Supervised PR factory (`.claude/agents/pr-reviewer.md`) — auto-merges only low-risk surfaces (landing, legal, markdown); everything touching money/auth/data/computation escalates to a human.

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

- [ ] Send the drafted REFMed verification email (`REFMed-dental-verification-email-DRAFT.txt`) requesting a sample D1110/D2740 lookup; get written confirmation of (1) dental CDT coverage and (2) charge-based UCR percentiles vs allowed-amount deciles — prerequisite for the compliance review — Finley
- [ ] Hold the `chore/refmed-data-source` copy PR (proof-bar / faq / methodology now cite "REFMed's national UCR database") for human review — touches trust/methodology, not auto-mergeable — Finley
- [ ] Fallback: pursue a FAIR Health commercial license with written redistribution rights if REFMed can't confirm dental CDT charge-percentile UCR — Finley
- [ ] Fill the two blank fields (company-history summary, company URL) and submit the ADA CDT license application to CDT-SNODENT@ada.org — Finley
- [ ] Compliance review of data sourcing before expanding code coverage beyond ~19 codes — gated on written REFMed confirmation (or a FAIR Health license as fallback) — Finley
- [ ] Confirm Resend delivery email is wired and sending in production — Finley
- [ ] Decide manual vs. automated fulfillment for first paid customers (README runbook is still manual ~2h/customer) — Finley

---

## Risks & known issues  [rewrite]

- Public copy now asserts "REFMed's national UCR database" as the data source, but REFMed dental coverage is unconfirmed: their public materials describe a medical (CPT/HCPCS, allowed-amount decile) product, and we have only a verbal claim of a national UCR database. If they can't confirm dental CDT charge-percentile UCR in writing, the copy is inaccurate and must be reverted before shipping — hence the copy PR is held for human review.
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

- **2026-07-13 (later):** Selected REFMed TruePrice as intended UCR source over FAIR Health (now fallback) after a sales call; updated public copy to cite "REFMed's national UCR database" in proof-bar/faq/methodology (removed stale discontinued "ADA Survey of Dental Fees"), PR open and human-review-required. Recorded caveat that REFMed's public materials are a medical CPT/HCPCS allowed-amount product; dental CDT coverage + charge-percentile UCR are unverified. Drafted REFMed verification email (D1110/D2740 sample lookup) as the prerequisite for the compliance review. Nothing signed.
- **2026-07-13:** Recorded UCR data-sourcing/licensing direction — reviewed licensing docs, ruled out off-the-shelf NDAS (no redistribution), recommended FAIR Health, drafted inquiries to FAIR Health + NDAS; ADA CDT license application completed/dated 2026-06-25 pending submission. Corrected terminology (CDT not "CDC"; NDAS/Wasserman not "Henry Schein"). Nothing signed.
- **2026-06-26:** Initial PROJECT.md superdoc created from repo scan (61 commits, through PR #5 report parity).
