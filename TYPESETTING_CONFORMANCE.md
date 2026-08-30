# TYPESETTING.md v1.5 — Engine Conformance Ledger

This ledger is not the specification. [TYPESETTING.md](./TYPESETTING.md) remains normative. Every requirement below must be **implemented**, **visually verified**, or **explicitly deferred**. The build fails if a non-deferred ID has no owner.

Status tags:

- **Restore** — live engine must match the spec; previous compression/copyfitting is rejected
- **Keep** — current implementation is spec-compatible and retained
- **Optical** — allowed `[C]` additive correction after Chromium 1:1 proof
- **Defer** — named later work; not forgotten

Coordinate spaces (never collapse these names):

- font units (`unitsPerEm`) → points (`pt`) / millimetres (`mm`) → CSS pixels (`cssPx`) → device pixels
- `1pt = 1/72in = 4/3 cssPx`; `1mm = 96/25.4 cssPx`
- Canonical numbers live in [config/typesetting.json](./config/typesetting.json)

---

## §1 Base unit

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-1-01 | `u = 14pt` is the generative unit | Restore | `config/typesetting.json` `uPt`; `--u` | `bun/src/test-typesetting.js` |
| TS-1-02 | `S0 = u / λ` with `λ ≈ 1.273` | Restore | `bun/src/typesetting.js` `deriveCanon()` | unit test: raw 10.997…, in-use 11pt |
| TS-1-03 | Downstream values are multiples of `u` or `u/2` | Restore | résumé CSS; metrics ceil | CSS audit + metrics |

## §2 Modular type scale

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-2-01 | `r = 1.2`; `Sn = S0 × r^n` | Restore | `config/typesetting.json` | unit test |
| TS-2-02 | In-use sizes L0=11pt, L1=13pt, L2=16pt | Restore | `--s0 --s1 --s2` | unit test + computed style |
| TS-2-03 | Section labels stay at L0 | Restore | `.r-lbl` | CSS |

## §3 Page construction

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-3-01 | A4 210×297mm exclusive | Keep | `.sheet`; `@page` | `test-typesetting.js` |
| TS-3-02 | `n = 12`; L/R = 17.5mm | Keep | `--margin-x` | derived geometry test |
| TS-3-03 | Text block 175×247.5mm (page aspect) | Keep | derived `textWidthMm` | unit test |
| TS-3-04 | Top 16.5mm / bottom 33mm (1:2 footing) | Keep | `--margin-top --margin-bottom` | unit test |
| TS-3-05 | No Letter parallel table | Keep | canon `page.format` | JSON |

## §4 Row geometry

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-4-01 | Role/company left, date right-flush, same baseline | Keep | `.r-item-hdr` grid | CSS |
| TS-4-02 | Date reserved width from real glyph advances, ceil to `u/2` | Restore | `font-metrics.js` | metrics JSON |
| TS-4-03 | Gutter `u/2` | Restore | `--col-gutter` | CSS |
| TS-4-04 | Title wrap, never `break-word` / ellipsis / clamp | Keep | `.r-co` | CSS + `measureA4Layout` |
| TS-4-05 | Title >2 lines is overflow failure | Keep | `measureA4Layout` | JS |
| TS-4-06 | CSS grid reserved column (stricter than spec flex) | Keep | `.r-item-hdr` | CSS |

## §5 Baseline grid

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-5-01 | Non-S0 leading rounds to integer `u` | Restore | `.r-name` `line-height: 2u` | CSS |
| TS-5-02 | `text-box-trim` / `text-box-edge` on name, labels, bullets | Keep | those selectors | CSS; Lightning target 133 |
| TS-5-03 | `@supports` cap-offset polyfill from OS/2 | Keep | `--cap-offset-s2` | metrics + CSS |
| TS-5-04 | No generic padding used as fake baseline lock | Restore | résumé CSS | CSS audit |
| TS-5-05 | Firefox `text-box-trim` | Defer | grey-day | ledger |

## §6 Optical alignment

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-6-01 | Bullet hang = extracted LSB (+ named optical correction) | Restore | `--hang-bullet`; `.r-ul li` | metrics + CSS |
| TS-6-02 | En dash in dates is not a hang candidate | Restore | date formatter | microtype |
| TS-6-03 | Education colon hang is a separate measured token | Optical | `--edu-colon-optical-hang` | education fixture |

## §7 Figures

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-7-01 | Dates: tabular lining | Restore | `.r-date`, `.r-ctc` | CSS |
| TS-7-02 | Body/bullets: oldstyle proportional | Restore | `.sheet`, `.r-prose` | CSS |

## §8 Tracking

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-8-01 | Display −0.015em, body 0, labels +0.06em | Restore | `--track-*` | CSS |
| TS-8-02 | Prefer optical-size masters / `opsz` over tracking hacks | Restore | `@font-face` Text/Title map | CSS + manifest |

## §9 Hierarchy

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-9-01 | Name 16pt regular (size only) | Restore | `.r-name` | CSS |
| TS-9-02 | Title/role line size only at S1 | Keep | `.r-role` | CSS |
| TS-9-03 | Company/role weight only at S0 / 600 | Keep | `.r-co` | CSS |
| TS-9-04 | Labels: small-caps + tracking, same size/weight | Restore | `.r-lbl` | CSS |
| TS-9-05 | No per-entry copyfitting | Restore | no runtime size mutation | `measureA4Layout`; fitter omits only |
| TS-9-06 | Two-line company + role stack | Keep | `renderExperience` | JS |

## §10 Paragraph setting

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-10-01 | Flush left, ragged right | Keep | `.sheet` `text-align: left` | CSS |
| TS-10-02 | `hyphens: none` | Keep | `.sheet` | CSS |
| TS-10-03 | `widows: 2; orphans: 2` | Keep | `.sheet` | CSS |
| TS-10-04 | `text-wrap: pretty` on bullets/prose | Keep | `li`, `.r-prose` | CSS |
| TS-10-05 | No truncation of titles or bullets | Keep | CSS + fitter | JS |

## §11 Vertical rhythm

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-11-01 | 2u before a section label | Restore | `.r-sec` margin+padding | CSS |
| TS-11-02 | 1u label → first content | Restore | `.r-lbl` margin-bottom | CSS |
| TS-11-03 | 0.5u lead-in → first bullet; 0.5u between bullets | Keep | `.r-role + .r-ul`; `li + li` | CSS |
| TS-11-04 | 1u end of any entry → next entry, with or without bullets | Keep | `.exp-block` etc. | CSS |
| TS-11-05 | Last entry in a section has no extra trailing 1u | Keep | `:last-child` | CSS |
| TS-11-06 | Divider subdivides the 2u pre-label budget | Restore | `.r-sec` border-top | CSS |

## §12 Microtypography

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-12-01 | En dash `U+2013` in ranges | Restore | `bun/src/microtype.js` | compile + tests |
| TS-12-02 | Apostrophe `U+2019` | Restore | `microtype.js` `typograph()` | compile |
| TS-12-03 | NBSP in phone groups and number–unit pairs | Restore | `formatPhone`, `nb()` | compile + app.js |
| TS-12-04 | NNBSP around inline `|` separators | Restore | contact, education, additional | JS |
| TS-12-05 | True small caps + `case` on labels | Restore | `.r-lbl` | CSS |
| TS-12-06 | Ligatures on | Keep | `.sheet` | CSS |
| TS-12-07 | NFC on names/places | Restore | `microtype.js` | compile |

## §13 Ink / contrast

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-13-01 | Body ink is `paper-ink` on `paper`; no grey body/dates/markers | Restore | `.sheet` descendants | CSS |
| TS-13-02 | Hairline uses measured median grey, not `#000` | Optical | `--rule-color` | token |
| TS-13-03 | WCAG 1.4.3: name is 16pt regular → 4.5:1 | Restore | `--paper-ink` vs `--paper` | `test-typesetting.js` contrast |
| TS-13-04 | 300dpi blur / ΔE2000 patch test | Defer | pillar 1 later | ledger |

## §14 Typeface

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-14-01 | Required features: opsz or separate masters, smcp, 4 figure sets, real italic, Latin Ext | Restore | `fonts-sync.js`, `font-metrics.js` | manifest + metrics |
| TS-14-02 | Source Serif 4.005R OFL is the implementation face | Restore | `assets/fonts/font-manifest.json` | hashes |
| TS-14-03 | TTF (metrics/PDF) and WOFF2 (Chromium) are the same outlines | Restore | manifest pairs | font tests |
| TS-14-04 | Commercial §14 names are candidates, not auto-compliant | Keep | this ledger | Phase 1A notes |
| TS-14-05 | `GRAD` print compensation if axis exists, else no-op | Restore | `@media print` gated | metrics `hasGrad` |
| TS-14-06 | Atkinson / dyslexia trade-off | Defer | not this brief | ledger |

## §15 Digital layer

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-15-01 | Links inherit colour; underline on hover/focus only | Restore | `.sheet a` | CSS |
| TS-15-02 | Name is `h1`, labels `h2` | Keep | `#r-name`, `.r-lbl` | HTML/JS |
| TS-15-03 | PDF/UA tagging of Chromium export | Defer | pillar 3 | ledger |

## §16 Segment lines

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-16-01 | 0.5pt hairline, full text-block width | Restore | `.r-sec` border-top | CSS |
| TS-16-02 | Rule does not add to the 2u budget | Restore | margin/padding split | CSS |

## §17 Locale

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-17-01 | Dates `Jan 2019–Aug 2021` / `Present`; never `to` or `01/2019` | Restore | `formatDateRange` | compile tests |
| TS-17-02 | Phone ITU-T E.123 with NBSP groups | Restore | `formatPhone` | compile |
| TS-17-03 | NFC; coverage check vs résumé code points | Restore | metrics + typograph | tests |

## §18 Fixed-page rendering

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-18-01 | No résumé content-reflow breakpoints | Keep | no `@media` on `.sheet` internals | CSS |
| TS-18-02 | Screen scale is outer transform only (pillar 2) | Keep | `app.js` `applyDesktopSheetScale` | JS |
| TS-18-03 | Measure with transform removed | Keep | `measureA4Layout` | JS |

## §19 Print determinism

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-19-01 | `@page { size: A4; margin: 0 }` | Keep | `style.css` | CSS |
| TS-19-02 | Self-hosted fonts, `font-display: block` on résumé faces | Restore | `@font-face` | CSS |
| TS-19-03 | Document title for PDF metadata | Restore | `<title>` | `index.html` |
| TS-19-04 | Glyph-placed PDF/A engine | Defer | pillar 3 | ledger |
| TS-19-05 | No PDF/A or PDF/UA claim without validator | Keep | README / tests | docs |

## §20 Overflow

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-20-01 | `.entry`/`.section` `break-inside: avoid` | Keep | `.r-sec`, blocks | CSS |
| TS-20-02 | Measure inner bottom (clientHeight − padding-bottom) | Keep | `measureA4Layout` | JS |
| TS-20-03 | Outcomes: fit, omit optional content, or loud fail — never shrink type | Restore | `fitProfileForBuild` | JS |
| TS-20-04 | `measureA4Layout` reads tokens, not 9.8/11.7 literals | Restore | `app.js` | JS |

## §21 Reference CSS / Education

| ID | Rule | Status | Owner | Proof |
|---|---|---|---|---|
| TS-21-01 | Spec CSS is illustrative; keep current semantic DOM | Keep | `index.html` / `app.js` | — |
| TS-EDU-01 | Institution/date uses the same reserved zone as experience | Restore | `.edu-school-row` | CSS |
| TS-EDU-02 | NNBSP separators, no ASCII ` - ` / ` \| ` | Restore | `renderEducation` | JS |
| TS-EDU-03 | Run-in labels; colon attached; `--edu-after-colon` | Restore | education CSS/JS | fixture |
| TS-EDU-04 | Value continuation hanging indent per row | Restore | float hang | CSS |
| TS-EDU-05 | `--edu-detail-inset` default 0 | Restore | CSS | CSS |
| TS-EDU-06 | Hidden fact rows consume 0 height | Restore | `[hidden]` | CSS |
| TS-EDU-07 | No standing underlines on institution/degree | Restore | CSS | CSS |
| TS-EDU-08 | Education fixture (wrap, colon, dates, hidden rows) | Restore | `bun/src/test-education.js` | tests |

## Deferred (explicit)

| ID | Item |
|---|---|
| TS-DEF-01 | Firefox `text-box-trim` |
| TS-DEF-02 | Knuth–Plass global paragraph optimisation |
| TS-DEF-03 | HZ micro-justification |
| TS-DEF-04 | Automated §13 raster ΔE2000 |
| TS-DEF-05 | Glyph-placed PDF engine (pillar 3) |
| TS-DEF-06 | Commercial typeface substitution |

---

## Optical corrections log `[C]`

Mathematical base and correction are stored separately in `config/typesetting.json` → `optical`. Changing `u`, `S0`, `S1`, or `S2` requires a TYPESETTING.md version bump.

| Token | Base | Correction | Note |
|---|---|---|---|
| `--hang-bullet` | extracted LSB | `hangBulletEm` | Chromium marker ink |
| `--edu-after-colon` | colon RSB + readable gap | `eduAfterColonEm` | same perceived gap on short/long labels |
| `--edu-colon-optical-hang` | colon bearing | `eduColonHangEm` | label only |
| `--rule-color` | median grey placeholder | `#8c8c8c` | calibrate if §13 raster is later run |
| `--track-display` | −0.015em | 0 extra | 16pt name |
