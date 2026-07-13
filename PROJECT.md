# Calderwood (Fee IQ)
*A $199 dental fee-schedule assessment that shows practices where they're underpaid.*

*Last updated: 2026-07-13 12:00 ET by kuba-vault*

---

## TL;DR  [rewrite]

Calderwood is a self-serve web product that benchmarks a dental practice's fee schedule against UCR (usual, customary, reasonable) data and surfaces recoverable revenue per code and per carrier. A practice onboards, uploads fees/volumes (CSV or PDF from their practice-management system), pays $199 via Stripe, and gets a gated report — on the web and as a downloadable PDF. The product is post-MVP: onboarding, computation, paywall, report rendering, and view-only sharing all work. The main open constraint is a compliance gate limiting how many CDT codes can be benchmarked — the report covers ~19 of 142 codes. Current focus is unblocking that: we've reviewed the licensing documents, ruled out the off-the-shelf NDAS form (it forbids redistribution), and identified FAIR Health as the recommended fee-data source with existing commercial redistribution licensing. Inquiry emails to FAIR Health and NDAS are drafted, and the ADA CDT content-license application is completed and dated 2026-06-25, pending submission. No license is signed yet.

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
- **Next milestone:** secure a FAIR Health commercial license with written redistribution rights as the input to the still-open compliance review of data sourcing (gates benchmark coverage expansion)
- **Flags:** shipping

---

## Where we are right now  [rewrite]

The full path works end to end: onboard → upload fees and volumes → compute benchmark → pay $199 → see the gated report on the web and download the PDF. The last several PRs (#3–#5) pushed report parity — the rich sections (carrier scorecard + grade, carrier-vs-code heatmap, category opportunity rollup, methodology) now render in both the web report and the PDF, and the web report got the percentile callout and a "full picture" section. View-only sharing via `/r/<token>` is live so a practice can hand someone a read-only link with no login.

The active work this week is the data-sourcing/licensing path that gates expanding coverage beyond the vetted ~19 of 142 CDT codes. We reviewed the two licensing documents in `~/Desktop/Work/Calderwood/`. Two terminology corrections: the codes are CDT (Current Dental Terminology, ADA-copyrighted), not "CDC"; and the fee-data licensor is NDAS (National Dental Advisory Service, published by Yale Wasserman DMD / DMD Medical Publishers), not "Henry Schein." The standard NDAS "Developers License Agreement 2026" only permits internal business use and explicitly bans redistributing NDAS data to third parties or acting as an ASP/service bureau (§§4, 7, 8) — so the off-the-shelf form does not cover Calderwood's model of selling reports that embed the data to dental practices; a negotiated redistribution/OEM license would be needed. Recommended alternative: FAIR Health (FH Charge Dental module) — CDT-arrayed charge percentiles, ~493 geozips (~3-digit ZIP), coverage of essentially all dental procedures (well past the 142-code target), and an existing commercial data-licensing business that supports vendors embedding FH Benchmarks. Inquiry emails to both FAIR Health and NDAS/Wasserman are drafted. Separately, CDT codes/descriptors are ADA-copyrighted regardless of data source, so an ADA CDT commercial license is also required; that application is completed, attested, and dated 2026-06-25 (with product screenshots + marketing exhibits), pending submission to CDT-SNODENT@ada.org, minus two blank fields (company-history summary, company URL). Nothing is signed — these are drafted inquiries and a recommended direction. Next concrete step: send the FAIR Health inquiry and treat a written redistribution license as the prerequisite input to the compliance review before widening code coverage.

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

- [ ] Send the drafted FAIR Health inquiry and pursue a commercial license with written redistribution rights (prerequisite for the compliance review) — Finley
- [ ] Send the drafted NDAS/Wasserman inquiry re: a negotiated redistribution/OEM license (fallback to FAIR Health) — Finley
- [ ] Fill the two blank fields (company-history summary, company URL) and submit the ADA CDT license application to CDT-SNODENT@ada.org — Finley
- [ ] Compliance review of data sourcing before expanding code coverage beyond ~19 codes — gated on a signed redistribution license — Finley
- [ ] Confirm Resend delivery email is wired and sending in production — Finley
- [ ] Decide manual vs. automated fulfillment for first paid customers (README runbook is still manual ~2h/customer) — Finley

---

## Risks & known issues  [rewrite]

- Benchmark coverage is narrow (~19/142 CDT codes); reports may understate or feel incomplete until the compliance gate clears, which now depends on landing a benchmark data license with written redistribution rights (FAIR Health is the recommended target). No data or CDT license is signed yet.
- Licensing risk: the off-the-shelf NDAS form forbids reselling embedded data, so a bespoke/OEM negotiation is required for any of the candidate sources; timelines and terms are unknown and outside our control.
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

- **2026-07-13:** Recorded UCR data-sourcing/licensing direction — reviewed licensing docs, ruled out off-the-shelf NDAS (no redistribution), recommended FAIR Health, drafted inquiries to FAIR Health + NDAS; ADA CDT license application completed/dated 2026-06-25 pending submission. Corrected terminology (CDT not "CDC"; NDAS/Wasserman not "Henry Schein"). Nothing signed.
- **2026-06-26:** Initial PROJECT.md superdoc created from repo scan (61 commits, through PR #5 report parity).
