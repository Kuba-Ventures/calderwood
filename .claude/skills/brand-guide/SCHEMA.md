# brand.json schema

Every key is optional except `name`. A section appears when its required keys
are present. Keys marked **HTML** are inserted raw — use for emphasis only.

## Meta

| Key | Type | Notes |
|---|---|---|
| `name` | string | Brand name. Sets the cover. Required. |
| `descriptor` | string | Cover kicker. Default "Brand Guidelines". |
| `version` | string | e.g. `v1.0`. Bump on every client release. |
| `year` | string | Cover and report mock. |
| `owner` | string | Legal entity. Appears in every running foot. |
| `domain` | string | Browser mock URL and report footer. |

## `logos` — unlocks Primary logo, Variations, Misuse, Applications

| Key | Needed for |
|---|---|
| `primary` | Everything. The only truly required logo. |
| `reversed` | Variations cell 02 — else derived |
| `monoBlack` | Variations cell 03 — else derived |
| `monoWhite` | Variations cell 04 — else derived |
| `mark` | Variations cell 05 — cannot be derived |
| `stacked` | Variations cell 06 — cannot be derived |
| `reference` | Art direction reference image |

Paths are relative to `brand.json`, e.g. `assets/logo-primary.svg`. SVG preferred.

## `logoRules`

`clearSpace` (string), `minPrint` (e.g. `"12 mm"`), `minScreen` (e.g. `"48 px"`).

## `colors` — unlocks Color suite

`primary`, `secondary`, `tertiary`, each `{ hex, name, use }`. Only `primary` is
required; the page and grid adapt to how many are present. These drive
`--brand-1/2/3` everywhere — buttons, chart fills, the mark-only ground.

## `neutrals`

`ink`, `paper`, each `{ hex, name, use }`. `ink` sets the dark ground used by the
reversed and knockout cells.

## `colorRules`

`ratio` (string) — replaces the default "Do" copy on the color page.

## `foundation` — unlocks Foundation

| Key | Type |
|---|---|
| `headline` | array of strings; entries after the first render in the primary color |
| `body` | string, **HTML** |
| `pillars` | array of `{ title, body }`; grid adapts to length |

## `typography` — unlocks Typography

| Key | Type |
|---|---|
| `faces` | array of `{ name, role, sample, note, stack }` — `stack` is a CSS font-family |
| `scale` | array of `{ role, sample, spec }` |
| `rules` | `{ do, dont }` |

## `icons` — unlocks Iconography

Array of `{ name, file, role, body, do, dont, onDark }`. One or two icons stack
full-width; three or more use a two-column grid.

## `applications` — customizes the Applications page

| Key | Type |
|---|---|
| `nav` | array of nav labels |
| `cta`, `ctaAlt` | button labels |
| `hero` / `heroHtml` | headline; **HTML** version accepts `<em>` for the accent color |
| `heroSub` | subhead |
| `features` | array of strings, numbered strip |
| `docLabel` | "Report", "Proposal", "Invoice" — retitles the second mock |
| `docTitle`, `docSub` | document heading |
| `reportStats` | array of `{ k, v }` |
| `reportRows` | array of `{ k, label, v }`; first four also drive the bar chart |

## `artDirection` — unlocks Art direction

`intro` (string), `principles` (array of `{ title, body }`),
`grounds` (array of `{ hex, name, use }`), `referenceCaption` (string).

## `voice` — unlocks Voice & tone

`intro`, `attributes` (array of `{ title, body }`, grid adapts),
`reframe` (array of `{ from, to }`), `say` and `avoid` (arrays of strings).

## `legal` — unlocks Legal & usage

| Key | Type |
|---|---|
| `intro` | string |
| `requiredCopy` | verbatim text shown in a boxed callout |
| `requiredCopyLabel`, `requiredCopyNote` | box label and reproduction note |
| `labelCopy` | array of `{ k, v }` |
| `trademark` | string, **HTML** |
| `permission`, `marketing` | strings |

Do not draft this section without the client confirming it. Regulated categories
need their own counsel's wording, not a generated approximation.
