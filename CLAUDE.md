# Calderwood

Dental fee-benchmarking product. Next.js (App Router) + Supabase + Stripe. Tests: `npm test` (vitest).

## Merge policy

This repo runs a supervised PR factory. A PR auto-merges only when the factory review
returns APPROVE-LOWRISK against this policy.

**Low-risk surfaces (eligible for auto-merge):**
- `components/landing/**` — marketing sections and presentational copy
- `app/privacy/**`, `app/terms/**` — static legal pages
- `**/*.md` — documentation and markdown

**Always escalate to a human (never auto-merge), regardless of how small the change:**
- Anything touching trust, money, auth, sessions, secrets, billing, or pricing
  (Stripe, `lib/stripe*`, `app/api/checkout`, `app/api/stripe/**`, the paywall gate
  `lib/report/gate.ts`, anything that renders dollar figures)
- Database schema, migrations (`supabase/migrations/**`), or data deletion/retention
- Access control / permissions / RLS
- Report computation + parsing (`lib/computation/**`, `lib/parser/**`, `lib/report/**`,
  `lib/benchmark/**`)
- Onboarding, dashboard, and report-rendering components (they render money + gating)
- All `app/api/**` routes, `middleware.ts`
- CI, workflows, build config, or dependency changes (`package.json`, `.github/**`)
- Anything outside the low-risk surfaces above

The reviewer (`.claude/agents/pr-reviewer.md`) is the source of truth for how this policy
is enforced. Tighten this block whenever something slips through.
