---
name: brand-guide
description: Build or expand a client brand guideline document as a print-ready landscape PDF plus HTML. Use when the user asks for a brand guide, brand guidelines, brand book, style guide, or visual identity document; when they want to add sections to an existing one (typography, voice, iconography, art direction, legal); or when they hand over a logo and ask what can be built from it. Also use to re-render every client after the shared template changes.
---

# Brand guide

Builds a sectioned brand guideline document from a client's `brand.json` plus logo
files. Sections render only when their data exists, so page count is an output,
not a setting. One logo and a short interview yields about six pages; a fully
answered brand yields twelve.

## Layout

```
<skill>/assets/template.html      shared template — never edit per client
<skill>/assets/render.py          build script
<skill>/assets/brand.starter.json copy this to start a client
<skill>/SCHEMA.md                 every key, and which section it unlocks

<client>/brand.json               all client data
<client>/assets/*.svg             logo and icon files
<client>/out/                     generated — brand-guide.html, .pdf, GAPS.md
```

Client dirs live with the client's other work, not inside the skill. Nothing
client-specific ever enters `assets/template.html` — that separation is what
makes a template upgrade a re-render instead of a migration.

## Build

```bash
python3 <skill>/assets/render.py <client-dir>
```

Prints the pages built, the sections still locked ranked by cheapest next win,
and writes `out/GAPS.md`. Add `--no-pdf` to skip Chromium and emit HTML only.

Requires `playwright` with Chromium. If the PDF step fails, the HTML is still
written — open it in Chrome and print at Landscape / Letter / no margins /
background graphics on.

## Section registry

Order is fixed; numbering follows whatever survives. Each section renders only
when every key in `requires` is present and non-empty.

| # | Section | Requires |
|---|---|---|
| — | Cover | `name` |
| — | Foundation | `foundation.headline`, `.body`, `.pillars` |
| — | Primary logo | `logos.primary` |
| — | Logo variations | `logos.primary` |
| — | Logo misuse | `logos.primary` |
| — | Color suite | `colors.primary` |
| — | Typography | `typography.faces` |
| — | Iconography | `icons` |
| — | Applications | `logos.primary` |
| — | Art direction | `artDirection.principles` |
| — | Voice & tone | `voice.attributes` |
| — | Legal & usage | `legal` |

Five sections come free from one logo: cover, primary logo, variations, misuse,
and applications. Color needs only hex values, which can be sampled from the art.

## What gets derived vs. what needs real art

With only `logos.primary`, the variations page fills four of six cells by
transforming that one file, and every misuse cell is generated the same way.

| Rendition | From primary alone |
|---|---|
| Reversed on dark | Yes — same art on an ink ground |
| One color black | Yes — `brightness(0)` |
| One color white | Yes — `brightness(0) invert(1)` |
| Mark only | No — needs real art |
| Stacked lockup | No — needs real art |

Derived cells carry a **DERIVED** badge and a line telling the client to supply
master art before print. Never remove that badge — a derived knockout silently
loses any white detail inside the mark, which is exactly the failure the badge
warns about. Do not hand a client a guide whose variations page is entirely
derived without saying so in the delivery message.

Anything missing renders as a dashed drop-zone printing the filename it wants,
so an unfilled guide doubles as the asset checklist.

## Procedure

### Starting a new client

1. Inventory what exists — logo files, a live site, an existing deck. If there's
   a site, read it: nav labels, hero copy, product nouns, and footer entity all
   feed `applications` and `legal`.
2. Sample hex values from the logo art. Assign primary / secondary / tertiary by
   role, not by pixel count — the primary is the color the logo is recognized
   by, not necessarily the most abundant. Show the assignment and get it
   confirmed before writing `brand.json`.
3. Write `brand.json` from `brand.starter.json`. Fill only what's known. Do not
   invent positioning copy, voice attributes, or legal claims — a wrong pillar
   is worse than a locked section, and legal copy invented for a regulated
   category (alcohol, health, finance, insurance) can put the client at risk.
   Ask, or leave locked.
4. Build. Report the page count and the ranked gaps.

### Expanding an existing client

`brand.json` is append-only. Add keys, re-run, page numbers renumber themselves.
Bump `version` on any release to a client so a printed PDF can be identified.

Work one section per pass, cheapest first, and read `out/GAPS.md` rather than
re-interviewing about things already answered. Roughly what each locked section
costs:

| Section | Cost |
|---|---|
| Typography | font names and roles |
| Foundation | 4 short answers |
| Voice & tone | 5 short answers |
| Art direction | 3 answers plus one reference image |
| Iconography | icon SVGs with roles |
| Legal & usage | jurisdiction and claim review |

### Upgrading the template

Edit `assets/template.html`, then re-run `render.py` for every client dir. No
client file changes. Adding a section means appending an entry to the `SECTIONS`
array in the template with its own `requires` list — existing clients simply
show it as locked until they have the data.

## Constraints

- Landscape Letter, 11 × 8.5 in, `@page` margin 0. Both the browser print path
  and the Chromium path must agree, so never introduce page-level margins.
- Every page is one `.page` section and must not overflow. After any template
  change, screenshot each page at print size and check the bottom edge — the
  running foot is absolutely positioned and content will slide under it.
- Colors reach the design only through the CSS custom properties set from
  `brand.json`. Never hardcode a client color in the template.
- Text interpolated into the template goes through `esc()`. Keys documented as
  HTML-capable (`foundation.body`, `applications.heroHtml`, `legal.trademark`)
  are inserted raw — treat those as trusted client copy, not user input.
