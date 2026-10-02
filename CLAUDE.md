# Calderwood

Dental fee-benchmarking product. Next.js (App Router) + Supabase + Stripe. Tests: `npm test` (vitest).

## Initiative and previews

These are the owner's standing preferences. This repo's merge policy and the rules below it still apply and take precedence where they conflict.

- **Do it, don't tell me to do it.** If a step can be done directly (clicking through a dashboard in the browser, running a CLI, calling an MCP or API), do it instead of handing the owner instructions. This covers Vercel, Supabase, Stripe, Resend, Anthropic, Google Tag Manager, Google Analytics and GitHub.
- **Verify before reporting.** Open dashboards, check settings, pull logs and run read-only queries to confirm results yourself.
- **Make routine, reversible changes** that are part of the request without asking: toggling settings, creating webhooks or segments, redeploying, opening PRs.
- **Stop and ask first** before spending money (ad budgets, launching or editing live campaigns, purchases), sending messages as the owner, entering live API keys, passwords or 2FA codes, DNS or domain changes, and deleting data. When you stop, stage everything so the owner only has to confirm or paste one thing.
- **If a permission check blocks you,** say so in one line and give the shortest exact step to finish it. Don't look for a workaround.
- **Show, don't link.** When there's something to look at (a dev server, a Vercel preview or production deploy, a changed page, a dashboard), open it in a browser tab yourself, and after a UI change share a screenshot of the result.

## Audience & design principles

Our ICP is independent dental practice **owners and office managers** — often **older
and less tech-savvy**. The client defers visual and branding decisions to us, with one
firm bar: **emphasize the data and the savings, and keep the site easy for a
non-technical, older user to read and operate on the first try.** Treat the rules below
as requirements for every code push and design ask, not suggestions. Keep it simple and
clear over clever.

**Lead with data and savings.** Every page's visual focus is the money — dollars
recoverable, code-by-code underpayment, carrier gaps. Use big, clearly-labeled numbers
and plain framing of what each number means ("the dollars you're leaving on the table
this year"). Never bury the outcome under decoration.

**Only publish numbers we can back up.** Marketing copy must not state market
statistics, averages, or "up to" claims (e.g. "average recovery", "up to 35% below")
unless they come from a sourced dataset. Mock or illustrative data visuals must carry a
visible "Sample" / "Sample practice" label, should use the sample-practice fixture
(`test-fixtures/sample-practice/`) so figures agree across sections, and must not show a
total that conflicts with any other section. The $199 price is supported by
`lib/stripe.ts` and is fine to state.

**Readability first (older eyes).**
- Body copy ≥ 16px (prefer 17–18px). Never render text a user needs to read below 14px;
  reserve small sizes for genuinely secondary labels only.
- Line-height ≥ 1.5 for body; generous whitespace; comfortable measure (~60–70 chars).
- Meet WCAG AA contrast: ≥ 4.5:1 for normal text, ≥ 3:1 for large text. Do **not** put
  light-gray body text on white — use a dark ink token for anything meant to be read;
  reserve muted gray for minor captions only.

**Plain language.** Short sentences, active voice, concrete nouns, benefit stated in
dollars. Dental-billing terms the ICP already knows (UCR, CDT codes, EOB, percentile)
are fine, but pair them with a plain-English outcome. Avoid product/tech jargon.

**Simplicity and obvious affordances.**
- One clear primary action per screen. Buttons look like buttons (solid, labeled with
  the action they perform).
- No critical action hidden behind hover, icon-only controls, or clever gestures.
  Navigation must be labeled and predictable, and must work on phones and tablets, not
  just desktop.
- Don't depend on scroll-triggered reveals to deliver essential content — content must
  be present and legible without animation.

**Accessibility baseline (every PR).** Visible keyboard focus, real alt text, never
convey meaning by color alone, honor `prefers-reduced-motion`, keyboard-operable,
legible at 200% zoom, responsive down to small screens with large tap targets (≥ 44px).

**Restraint over flash.** Conservative, trustworthy, professional. Favor clarity over
cleverness; when in doubt, make it bigger, higher-contrast, and simpler. In PR
descriptions for UI/design changes, note how the change serves this ICP.

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

<!-- BEGIN STANDARD -->
## Response style
- Lead with the concrete next action, before context or caveats.
- Number multi-step work.
- Restate what's done and what's left each turn.
- No tangents or "you might also consider."
- Time estimates as specifics ("~5 min").
- Call out completed steps explicitly.
- Never use em dashes. Not in chat, not in code, comments, UI copy,
  commit messages, or anything committed. Use commas, colons,
  parentheses, or a full stop instead.

## Design and UI work
Any product or feature change with a visual surface: present exactly three
options (A, B, C), one-line rationale each. Render them, never describe
them in prose. Build each as a working preview and open all three side by
side in a browser. `/design-shotgun` does this end to end.
Stop and wait for a choice before building anything further.

## Git workflow
- Never commit to `main`. Branch as `claude/<description>`.
- One PR per logical change, no mixing chores into feature branches.
- Delete the branch after merge.
<!-- END STANDARD -->
# Working style (personal)

Shape every response for a reader with ADHD — lead with the concrete next
action; number multi-step work; externalize what's done vs left; suppress
tangents; give specific time estimates ("~5 min"); make progress visible.
For design/UI work, present exactly three options (A, B, C) with one-line
rationales and wait for a choice before building.
