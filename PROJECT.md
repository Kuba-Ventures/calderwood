# Calderwood (Fee IQ)
*A $199 dental fee-schedule assessment that shows practices where they're underpaid.*

*Last updated: 2026-06-26 14:00 ET by kuba-vault*

---

## TL;DR  [rewrite]

Calderwood is a self-serve web product that benchmarks a dental practice's fee schedule against UCR (usual, customary, reasonable) data and surfaces recoverable revenue per code and per carrier. A practice onboards, uploads fees/volumes (CSV or PDF from their practice-management system), pays $199 via Stripe, and gets a gated report — on the web and as a downloadable PDF. The product is post-MVP: onboarding, computation, paywall, report rendering, and view-only sharing all work. Current focus has been report parity between web and PDF. The main open constraint is a compliance gate limiting how many CDT codes can be benchmarked.

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
- **Next milestone:** compliance review of UCR data sourcing (gates benchmark coverage expansion) — ~week of 2026-06-15
- **Flags:** shipping

---

## Where we are right now  [rewrite]

The full path works end to end: onboard → upload fees and volumes → compute benchmark → pay $199 → see the gated report on the web and download the PDF. The last several PRs (#3–#5) pushed report parity — the rich sections (carrier scorecard + grade, carrier-vs-code heatmap, category opportunity rollup, methodology) now render in both the web report and the PDF, and the web report got the percentile callout and a "full picture" section. View-only sharing via `/r/<token>` is live so a practice can hand someone a read-only link with no login. The known constraint to watch: the report currently benchmarks only ~19 of 142 CDT codes; expanding coverage is gated on a compliance review of how the UCR data is sourced (targeted ~week of 2026-06-15). Next concrete step is that compliance review before widening code coverage.

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

- **2026-06-26 — Benchmark only ~19/142 CDT codes for now** — Reporting is limited to a vetted subset of codes; expanding coverage is gated on a compliance review of UCR data sourcing (~week of 2026-06-15). Avoids shipping benchmarks the data sourcing can't yet defend.
- **2026-06-09 — Supervised PR factory with low-risk-only auto-merge** — Auto-merge restricted to landing/legal/markdown; anything touching money, auth, data, schema, or report computation escalates to a human (see `CLAUDE.md`, `.claude/agents/pr-reviewer.md`).
- **2026-05 — Single paywall boundary in `lib/report/gate.ts`** — All gating lives in one place; locked dollar figures are zeroed server-side so they never reach the browser pre-payment, while a non-gated teaser stays visible.
- **2026-05 — Benchmark cascade picks one geo level, never blends** — `resolveBenchmark` cascades zip3 → metro → state → region → national, skipping levels below sample_size 30, and uses exactly one level per code for defensibility.
- **2026-05 — PDF extraction via Claude native vision over OCR rules** — PM "Procedure Summary" PDFs are parsed with Claude vision into code + fee + annual volume rather than brittle per-PM-system parsers.

---

## Open loops  [rewrite — but carry forward unfinished items]

- [ ] Compliance review of UCR data sourcing before expanding code coverage beyond ~19 codes — Finley
- [ ] Confirm Resend delivery email is wired and sending in production — Finley
- [ ] Decide manual vs. automated fulfillment for first paid customers (README runbook is still manual ~2h/customer) — Finley

---

## Risks & known issues  [rewrite]

- Benchmark coverage is narrow (~19/142 CDT codes); reports may understate or feel incomplete until the compliance gate clears.
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

- **2026-06-26:** Initial PROJECT.md superdoc created from repo scan (61 commits, through PR #5 report parity).
