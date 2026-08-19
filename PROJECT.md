# Calderwood (public brand: New Fee Schedule)
*A $199 dental fee-schedule assessment that shows practices where they're underpaid.*

*Last updated: 2026-08-19 by kuba-vault*

---

## TL;DR  [rewrite]

Calderwood is the company and repo name; **New Fee Schedule** has been the public brand since 2026-07-28 (PR #17). The product is a self-serve web app that benchmarks a dental practice's fee schedule against UCR (usual, customary, reasonable) data and surfaces recoverable revenue per code and per carrier. A practice onboards, uploads fees and volumes (CSV or PDF from their practice-management system), pays $199 via Stripe, and gets a gated report on the web and as a downloadable PDF. Onboarding, computation, paywall, report rendering, and view-only sharing all work.

Since the last update (2026-07-13), 24 PRs merged (#15 through #47, latest on 2026-08-12), nearly all of it public-surface work: the rebrand, a second landing redesign (a data-forward indigo "Console" layout that supersedes the Mintlify-style rebuild), the one-page landing split into five standalone routes, a readability and accessibility pass aimed squarely at the ICP (independent practice owners and office managers, often older and less tech-savvy), and a real forgot-password / reset-password flow. `CLAUDE.md` became the enforcement surface for all of it: audience and design principles, working style, and a no-em-dash rule are now project instructions that override default behavior, not preferences.

The business blocker has not moved in five weeks. Data sourcing is still unresolved: public copy stays neutral ("a national UCR benchmark database" and no vendor named), REFMed dental CDT coverage is still unverified, benchmarking is still limited to ~19 of 142 CDT codes, and nothing is signed with anyone. Latest commit on `main` is 2026-08-12; no PRs are open; one issue (#39) is open.

---

## What it is  [rewrite when value prop evolves]

**The problem:** Dental practices set fees blind and quietly leave money on the table. They don't know which procedure codes are priced below what carriers in their area actually reimburse.
**The solution:** Upload your fees and volumes; get a benchmarked report showing per-code and per-carrier underpayment and total recoverable revenue.
**The user:** Independent and small-group dental practices (office managers and owner-dentists), often older and less comfortable with software. This is now written into `CLAUDE.md` as a design constraint, not a persona note.
**The value:** A $199 assessment that typically points to multiples of that in recoverable annual revenue.
**The name:** public-facing copy says "New Fee Schedule"; the repo, Vercel project, and internal tooling stay "Calderwood".

---

## Status  [rewrite]

- **Phase:** post-MVP iteration; public surface converging, data sourcing stalled
- **Engagement manager:** self-directed
- **Lead:** Finley
- **Cadence:** self-directed
- **Next milestone:** unchanged since 2026-07-13. Send the drafted REFMed dental-CDT verification email (it gates both naming REFMed publicly and the compliance review that gates coverage expansion); FAIR Health remains the fallback.
- **Flags:** shipping; the data-source milestone has not moved in five weeks while frontend work continued

---

## Where we are right now  [rewrite]

**Brand and landing surface.** Public copy was rebranded from Calderwood to "New Fee Schedule" (PR #17); the repo, Vercel project, and internal naming were deliberately left alone. The landing page was then redesigned a second time, from the Mintlify-style rebuild into a data-forward indigo "Console" layout (PRs #18, #19, #20), and the single scrolling page was split into real routes: `/how-it-works`, `/features`, `/sample-report`, `/pricing`, `/resources` (PR #21), each composed from `components/landing/*` through a shared `LandingShell` with a sticky nav that highlights the active link (PR #23). How It Works went through three iterations and ended as the hybrid layout promoted to the main page, with the temporary `/hybrid` route dropped (PRs #36, #38). Pricing got a pay-versus-get-back value comparison card and handed its FAQ off to `/resources` (PR #37).

**The ICP pass.** PR #24 wrote audience and design principles into `CLAUDE.md` as requirements: lead with dollars, body copy at 16px or larger, line-height at 1.5 or more, WCAG AA contrast with no light-gray body text on white, plain language paired with dental terms, one obvious primary action per screen, nothing critical behind hover or icon-only controls, and no essential content gated behind scroll reveals. PRs #28, #29, #31, and #32 then paid that down on the live pages (closing issues #25, #26, #27, and #30): a real mobile nav, darker body text, larger type, visible focus states, plain-language glosses next to billing terms, a simplified hero card, and reveal animations demoted to progressive enhancement so content is present without JS. Style rules followed in August: a personal working-style block (PR #40), a shared standard block (PR #41), and a hard no-em-dash rule covering everything committed (PR #42). Em dashes were also stripped from user-facing copy (PRs #15, #22).

**Auth.** Password recovery is now a first-class flow, not a bare magic-link round trip: `/forgot-password` and `/reset-password` pages (PR #44), recovery `?code=` forwarded from the site root by `middleware.ts` (PR #46), and reset links pinned to one canonical origin because the bare apex `newfeeschedule.com` returns NXDOMAIN and only `www` resolves (PR #47). Both helpers are unit tested (`lib/site-url.test.ts`, `lib/auth/recovery-redirect.test.ts`) and the flow is documented in `docs/auth-password-reset.md`, the repo's first `docs/` entry.

**Data sourcing: no change.** The site and the report PDF still say the neutral "a national UCR benchmark database" and name no vendor, which remains a safe, defensible state. REFMed TruePrice is still selected-but-unverified: naming it publicly stays deferred until REFMed confirms in writing that it covers dental CDT codes with charge-based UCR percentiles rather than medical CPT/HCPCS allowed-amount deciles. The ADA CDT commercial license application is still completed and dated 2026-06-25, still pending submission, still missing two fields. Nothing is signed with anyone. Every item here is Finley's to move; none of it moved between 2026-07-13 and today.

---

## What's built  [rewrite]

**Frontend / UI**
- Public marketing surface: `/` plus five standalone routes (`/how-it-works`, `/features`, `/sample-report`, `/pricing`, `/resources`), composed from `components/landing/*` through `LandingShell` (`shell.tsx`). Sticky `<LandingNav>` with active-route highlighting and a real mobile menu; the global `<Header>` returns null on marketing and app routes (`components/header.tsx`).
- Design: data-forward indigo "Console" layout. Brand tokens in `app/globals.css` (`--brand: #4f46e5`, `--brand-deep`) sit alongside the app's ink/canvas theme, so dashboard, report, and onboarding render unchanged. Fonts via `next/font`: Inter (body), Newsreader, a display face, and a mono face for data.
- Landing sections: hero, carrier proof bar (real provider logos, PR #16), deliverable, stat band, gap/percentile/carrier bars, methodology, how-it-works (hybrid), pricing plus `pricing-compare`, FAQ, final CTA, footer, shared `ui.tsx`.
- Motion primitives in `components/motion/` with no framer-motion dependency (Reveal, CountUp, Odometer, useInView, useReducedMotion, useIsomorphicLayoutEffect). Content renders without JS, the hero is instant, and `prefers-reduced-motion` is honored.
- Accessibility and readability baked to the `CLAUDE.md` bar: AA-contrast body ink, 16px-plus body copy, visible keyboard focus, labeled navigation, large tap targets, no meaning carried by color alone.
- Auth pages: `/login`, `/signup`, `/forgot-password`, `/reset-password` (page plus client component each).
- Authenticated app under `app/(app)/`: dashboard, intake, reports, account (with a "Remove data" reset for testing).
- Onboarding flow (`components/onboarding/`): unified upload box, staged PDF extraction progress, post-extraction review step.
- Report UI (`components/report/`): per-code fee-vs-UCR table, ordinal percentile, carrier scorecard/heatmap, category opportunity, provider variance, methodology. Underpayment renders red as a positive recoverable figure.
- View-only shared report at `/r/<token>`, no login required.

**Backend / data**
- API routes under `app/api/`: `onboard`, `intake`, `upload-url`, `parse-pdf`, `carrier-schedule`, `eob-ocr`, `generate`, `report`, `share`, `checkout`, `stripe/webhook`, `account`, `reset-data`, plus `admin/` (seed-finley, verify-rls).
- Auth helpers: `lib/site-url.ts` (canonical origin for browser-built redirect URLs) and `lib/auth/recovery-redirect.ts` plus `middleware.ts` (forwards a Supabase recovery `?code=` from `/` to `/reset-password`). Documented in `docs/auth-password-reset.md`.
- Parsing (`lib/parser/`): CSV and PDF dispatch; PDF "Procedure Summary" extraction via Claude vision (`pdf-summary.ts`) for code, fee, annual volume, and per-provider fees; per-carrier fee-schedule capture (`pdf-schedule.ts`) feeds carrier ranking.
- Benchmark resolution (`lib/benchmark/resolve.ts`): cascades zip3, metro, state, region, national; skips levels with sample_size below 30; never blends across levels.
- Computation (`lib/computation/compute.ts`) with snapshot tests.
- Paywall (`lib/report/gate.ts`): the single gating boundary. Zeros locked numbers (headline $, top-carrier $, per-code annual gap, per-carrier recoverable $) pre-payment; the teaser (% codes below UCR, fee-vs-UCR columns, rounded opportunity) stays visible.

**Infrastructure**
- Supabase Postgres; 8 migrations (`supabase/migrations/0001`-`0008`) covering schema, practice name, paywall provenance, PDF input method, unique email, phone, share token, and per-provider fees.
- Supabase Auth, including the password-recovery redirect allow-list (one canonical origin, `www`).
- Stripe Checkout (hosted) plus webhook setting `paid_at` on `checkout.session.completed`.
- Scripts: `load:zcta`, `load:ucr`, `render:sample-report`, `seed:finley`, `db:migrate`.
- Supervised PR factory (`.claude/agents/pr-reviewer.md`, `.github/workflows/factory.yml`): runs `npm test` on PR branches, auto-merges only low-risk surfaces (landing, legal, markdown), escalates anything touching money, auth, data, or computation.
- Post-merge build guard (`.github/workflows/main-build-check.yml`): `npm ci`, `tsc --noEmit`, `next build` on every push to `main`.
- Repo-local skill: `.claude/skills/brand-guide/` (PR #43).
- Tests: 7 vitest suites (`compute` plus snapshot, `parser`, `gate`, `resolve`, `supabase-source`, `site-url`, `recovery-redirect`).

---

## Tech stack  [rewrite]

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14.2.35 (App Router), React 18, TypeScript, Tailwind 3.4 | `app/`, `components/` |
| Backend | Next.js API routes (Node) | `app/api/` |
| Database | Supabase Postgres (`@supabase/ssr`, `@supabase/supabase-js`) | `supabase/migrations/` |
| Auth | Supabase Auth, email/password plus recovery flow | `app/login`, `app/forgot-password`, `app/reset-password`, `middleware.ts` |
| Hosting | Vercel | project `calderwood`, auto-deploy on push to `main`, live on `www.newfeeschedule.com` |
| AI/LLM | Anthropic Claude (`@anthropic-ai/sdk`), native PDF vision for extraction | `lib/parser/pdf-summary.ts` |
| Payments | Stripe Checkout plus webhook (`stripe`, `@stripe/stripe-js`) | `lib/stripe.ts`, `app/api/stripe/webhook` |
| PDF report | `@react-pdf/renderer` | `lib/report/` |
| Parsing | `papaparse` (CSV), `xlsx`, Claude PDF vision | `lib/parser/` |
| Validation | `zod` 4 | |
| Typography | `next/font` (Inter, Newsreader, display, mono data) | `app/layout.tsx` |
| Motion | in-repo primitives, no animation dependency | `components/motion/` |
| Email | Resend (configured via env) | |
| Analytics | Google Tag Manager / GA4 (gated on `NEXT_PUBLIC_GTM_ID`), PostHog (optional) | `components/analytics/gtm.tsx` |
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

## Open loops  [rewrite — but carry forward unfinished items]

Carried forward from 2026-07-13, none moved:

- [ ] Send the drafted REFMed dental-CDT verification email (`~/Desktop/Work/Calderwood/REFMed-dental-verification-email-DRAFT.txt`) requesting a sample D1110/D2740 lookup; get written confirmation of (1) dental CDT coverage and (2) charge-based UCR percentiles vs allowed-amount deciles. Gates both naming REFMed publicly and the compliance review. Finley
- [ ] Fill the two blank CDT-application fields (incorporation date/state, company URL) and submit the ADA CDT license application to CDT-SNODENT@ada.org. Finley
- [ ] Fallback: pursue a FAIR Health commercial license with written redistribution rights if REFMed can't confirm dental CDT charge-percentile UCR. Finley
- [ ] Compliance review of data sourcing before expanding code coverage beyond ~19 codes, gated on written REFMed confirmation (or a FAIR Health license as fallback). Finley
- [ ] Optional CI follow-up: add a preventive `next build` gate to PRs in `factory.yml` (the `main` build guard is still detective-only). Finley
- [ ] Optional CI follow-up: bump CI actions off deprecated Node 20 (both workflows still pin `node-version: "20"`). Finley
- [ ] Confirm Resend delivery email is wired and sending in production. Finley
- [ ] Decide manual vs. automated fulfillment for first paid customers (the README runbook is still manual, ~2h/customer). Finley

New since 2026-07-13:

- [ ] Issue #39 (Headers, open since 2026-07-29): combine `/features` and `/sample-report` under a single "Features" heading. The only open issue in the repo.
- [ ] `README.md` is stale and now actively misleading: it describes Puppeteer plus `@sparticuz/chromium` for PDF rendering (the app uses `@react-pdf/renderer`), a four-phase plan that is finished, the old `kubatopia/calderwood` repo URL, and the retired public name. Rewrite or delete.
- [ ] Confirm `NEXT_PUBLIC_SITE_URL` is set in Vercel production and that the canonical origin is on the Supabase Redirect URLs allow-list, otherwise reset links fall back to the request origin (see `lib/site-url.ts`).

---

## Risks & known issues  [rewrite]

- Data sourcing is the critical path and it has not moved in five weeks. Public and report copy is neutral ("a national UCR benchmark database") and names no vendor, so nothing indefensible is live, but REFMed dental coverage is still unconfirmed (their public materials describe a medical CPT/HCPCS allowed-amount product; we have only a verbal claim of a national UCR database). Do not switch copy to name REFMed until written confirmation of dental CDT charge-percentile UCR is in hand.
- Benchmark coverage is narrow (~19 of 142 CDT codes); reports may understate or feel incomplete until the compliance gate clears. Nothing is signed with anyone.
- Licensing risk: whichever source is chosen, terms and redistribution rights still have to be negotiated; timelines are unknown and outside our control. The off-the-shelf NDAS form was ruled out because it forbids reselling embedded data.
- The `main` build guard is detective, not preventive. A build-breaking merge still lands on `main` momentarily before going red; a PR-level `next build` gate would close the window.
- Password recovery has a hard external dependency: the canonical origin must be set in the environment and allow-listed in Supabase. The bare apex `newfeeschedule.com` returns NXDOMAIN, so a link built from the wrong origin strands the user. Covered by unit tests and `docs/auth-password-reset.md`, but the config itself lives outside the repo.
- The brand split (public "New Fee Schedule" vs internal "Calderwood") is a documentation trap: new copy, emails, and support material must use the public name, while infra, repo, and env references keep the old one. Expect drift.
- PDF extraction depends on Claude vision quality across heterogeneous PM exports (Dentrix, Eaglesoft, Open Dental); the post-extraction review step mitigates but does not eliminate extraction errors.
- Money is rendered in several places (web report, PDF, dashboard); any gating regression risks exposing locked figures pre-payment. `lib/report/gate.ts` must remain the only gate.
- Fulfillment for early customers may still be partly manual per the README runbook, and the README itself is stale.

---

## Links  [rewrite]

- **Live URL:** `https://www.newfeeschedule.com` (Vercel project `calderwood`, auto-deploy on `main`). The bare apex does not resolve; only `www` is live.
- **Staging:** (none documented)
- **Repo:** `https://github.com/Kuba-Ventures/calderwood` (the README still points at the old `kubatopia/calderwood`)
- **Client Drive folder:** unknown
- **Slack channel:** unknown
- **Internal docs:** `docs/auth-password-reset.md`, `CLAUDE.md` (audience, design principles, merge policy)

---

## Changelog  [append-only — never rewrite or delete]

- **2026-08-19:** PROJECT.md refreshed after five weeks of drift, covering the 24 PRs merged since the last update (#15 through #47). Recorded the public rebrand to "New Fee Schedule", the second landing redesign (indigo "Console" layout) and its split into five standalone routes, the ICP readability and accessibility pass, `CLAUDE.md` becoming the enforcement surface for audience, design, and style rules, the real forgot-password / reset-password flow with canonical-origin pinning, and the repo-local brand-guide skill. Data sourcing unchanged and still the critical path: neutral copy, REFMed unverified, ~19 of 142 CDT codes, nothing signed.
- **2026-08-11 to 2026-08-12:** Shipped account recovery: `/forgot-password` and `/reset-password` pages (#44), root `?code=` forwarding in `middleware.ts` (#46), and reset links pinned to the canonical origin with unit tests and `docs/auth-password-reset.md` (#47). Vendored the brand-guide skill into `.claude/skills/` (#43).
- **2026-08-05 to 2026-08-09:** `CLAUDE.md` gained a personal working-style block (#40), a shared standard block (#41), and a no-em-dash rule covering everything committed (#42).
- **2026-07-28:** Large public-surface day. Rebranded public copy to "New Fee Schedule" (#17); shifted the palette to indigo and rebuilt the landing as a data-forward Console layout (#18, #19, #20); split the nav into standalone pages (#21) with active-link highlighting (#23); wrote audience and design principles into `CLAUDE.md` (#24); ran the ICP readability and accessibility pass, mobile nav, contrast, focus states, plain-language glosses, JS-free content, sizing (#28, #29, #31, #32); removed em dashes from user-facing copy (#22); iterated How It Works to the hybrid and dropped `/hybrid` (#36, #38); added the pricing value-comparison card and moved the FAQ to `/resources` (#37).
- **2026-07-14:** Real provider logos in the carrier proof bar (#16).
- **2026-07-13 (evening):** Rebuilt the marketing landing page as a typed, reusable Mintlify-style component set (PR #11) — additive brand token palette leaving the app theme untouched, dependency-free motion primitives, signature bars, sticky LandingNav; removed orphaned `report-mockup.tsx`. Hit a merge-corruption incident: a clean 3-way merge of #11 onto #10 produced non-compiling source that landed on `main` (factory CI only tests PR branches, never builds); PR #12 repaired `proof-bar.tsx`/`faq.tsx` and unified all data-source copy (site + report PDF) to the neutral "a national UCR benchmark database"; PR #13 added a post-merge build guard (`main-build-check.yml`, first run passed). Site now names no vendor — REFMed remains selected-but-unverified, naming deferred pending written dental-CDT confirmation. Nothing signed.
- **2026-07-13 (later):** Selected REFMed TruePrice as intended UCR source over FAIR Health (now fallback) after a sales call; updated public copy to cite "REFMed's national UCR database" in proof-bar/faq/methodology (removed stale discontinued "ADA Survey of Dental Fees"), PR open and human-review-required. Recorded caveat that REFMed's public materials are a medical CPT/HCPCS allowed-amount product; dental CDT coverage + charge-percentile UCR are unverified. Drafted REFMed verification email (D1110/D2740 sample lookup) as the prerequisite for the compliance review. Nothing signed.
- **2026-07-13:** Recorded UCR data-sourcing/licensing direction — reviewed licensing docs, ruled out off-the-shelf NDAS (no redistribution), recommended FAIR Health, drafted inquiries to FAIR Health + NDAS; ADA CDT license application completed/dated 2026-06-25 pending submission. Corrected terminology (CDT not "CDC"; NDAS/Wasserman not "Henry Schein"). Nothing signed.
- **2026-06-26:** Initial PROJECT.md superdoc created from repo scan (61 commits, through PR #5 report parity).
