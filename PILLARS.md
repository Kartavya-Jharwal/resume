# Four pillars

The résumé engine is four intentional layers. Edit one pillar per agent session so typesetting, screen UI, PDF output, and source data do not bleed into each other.

## Pillar 1 — Typesetting engine

**Purpose:** Fixed A4 geometry and typographic excellence. The sheet never reflows.

**Owns:** [TYPESETTING.md](./TYPESETTING.md), résumé rules in [assets/css/style.css](./assets/css/style.css), [bun/src/font-metrics.js](./bun/src/font-metrics.js), Source Serif subsets, unit grid, date column, bullet hang, print CSS.

**Does not own:** Side rails, mobile menu, Spotify, zoom chrome, Chromium PDF export.

## Pillar 2 — Screen renderer (microsite)

**Purpose:** Centerpiece A4 proof on desktop and mobile. Left rail = profile configuration. Right rail = view controls, export, listening context.

**Owns:** [index.html](./index.html), shell CSS, [assets/js/app.js](./assets/js/app.js) (rendering, controls, A4 scale on stage — not PDF fitting).

**Preview rule:** Serve **bundled** output only. Source `assets/js/app.js` imports bare npm specifiers (`motion`, `gsap`); the browser cannot load repo-root `index.html` directly. Use:

```bash
bun run build      # site artifact → dist/
bun run preview    # serve dist/ when already built
bun run serve      # rebuild site, then serve dist/
```

## Pillar 3 — PDF engine

**Purpose:** Standalone searchable A4 PDFs per variant, ATS-oriented, generated from the same fitted payload as the screen.

**Owns:** [bun/src/build.js](./bun/src/build.js) with `--pdf`, Playwright Chromium, `dist/resumes/`, fit report, PDF verification in [bun/src/test.js](./bun/src/test.js).

**Optional by design:** `bun run build` deploys the **site only** and retains any existing `dist/resumes/`. Full PDF regeneration is explicit and slow (~45 minutes for all variants):

```bash
bun run build:pdf --yes    # fit + render every variant PDF
```

Publishing mirrors this locally: `bun run deploy` builds and tests the site with `--skip-pdfs`, then pushes `dist/` to `origin` `gh-pages`. `bun run deploy:pdf` regenerates every variant PDF before publishing.

PDF availability in the browser is determined at **site build** time from `dist/resumes/{pdfFilename}`. The debug compile path (`bun run compile`) does not set `pdfAvailable`.

## Pillar 4 — Data layer

**Purpose:** One person, many curated role × industry views.

**Owns:** [data/resume.json](./data/resume.json), [data/variants.json](./data/variants.json), [bun/src/compile.js](./bun/src/compile.js), [bun/src/validate.js](./bun/src/validate.js), variant tagging, evidence limits, omissions policy.

**Pairs:** each selector choice is a unique role × industry pair. Shared `family` values group related titles in the UI; the compiled summary, keywords, and tagged evidence still differ by industry. Duplicate pair descriptions fail validation.

**Explicit content plans:** each variant in `data/variants.json` carries a `content` block with stable work/project ids and highlight ids from `data/resume.json`. The compiler resolves these plans directly (typically 3 work entries + 2 projects). Regenerate plans with `bun run bun/src/plan-variant-content.js` after retagging; assign ids first with `bun run bun/src/assign-content-ids.js`.

**Canonical `/` profile:** exactly one variant sets `fallback: true` (currently Startup Operations Manager · Early-Stage Technology Startups). Root visits with no query load that profile.

**Master CV:** preview-only outlier under pillar 4 (`canonicalMaster` in variants metadata). Not part of the public microsite selector or the 59-variant PDF set.

## Cross-pillar contracts

| Concern | Source of truth |
|--------|------------------|
| Profile text on screen and in PDF | Fitted `dist/public/data.js` from compile + optional Chromium fit |
| PDF on disk | `dist/resumes/{pdfFilename}` from variant record |
| Download href | `resumes/` + `profile.pdfFilename` |
| Variant count | `data/variants.json` (currently 59) |
