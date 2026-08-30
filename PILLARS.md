# Five pillars

The résumé engine is five intentional layers. Edit one pillar per agent session so typesetting, screen UI, PDF output, source data, and discoverability do not bleed into each other.

## Pillar 1 — Typesetting engine

**Purpose:** Fixed A4 geometry and typographic excellence. The sheet never reflows.

**Owns:** [TYPESETTING.md](./TYPESETTING.md), [TYPESETTING_CONFORMANCE.md](./TYPESETTING_CONFORMANCE.md), [config/typesetting.json](./config/typesetting.json), [assets/css/typesetting.css](./assets/css/typesetting.css), résumé rules in [assets/css/style.css](./assets/css/style.css), [bun/src/font-metrics.js](./bun/src/font-metrics.js), [bun/src/typesetting.js](./bun/src/typesetting.js), Source Serif 4.005R, unit grid, date column, bullet hang, print CSS.

**Does not own:** Side rails, mobile menu, Spotify, zoom chrome, Chromium PDF export, SEO or agent manifests.

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

**Purpose:** Standalone searchable A4 PDFs per variant, ATS-oriented, generated from the same fitted payload as the screen. A separate pillar from the live site build.

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

**Pairs:** each selector choice is a unique role × industry pair. The public UI navigates Role → Industry only; backend `category` metadata (13 groups) structures validation, audit, and future expansion. Duplicate pair descriptions fail validation.

**Explicit content plans:** each variant in `data/variants.json` carries a `content` block with stable work/project ids and highlight ids from `data/resume.json`. The compiler resolves these plans directly (typically 3 work entries + 2 projects). Regenerate plans with `bun run content:plan` after retagging; assign ids first with `bun run content:ids`. Export audit JSON with `bun run content:audit`.

**Variant aliases:** `variantAliases` in `data/variants.json` preserves deep links when variant ids are renamed (e.g. agritech → culinary/hospitality).

**Coursework:** canonical course inventory stays intact in source; each compiled profile reorders courses by relevance to role, industry, category, and keywords. A4 fitting may omit the lowest-ranked tail per profile.

**Canonical `/` profile:** exactly one variant sets `fallback: true` (currently Startup Operations Manager · Early-Stage Technology Startups). Root visits with no query load that profile.

**Master CV:** preview-only outlier under pillar 4 (`canonicalMaster` in variants metadata). Not part of the public microsite selector or the variant PDF set.

## Pillar 5 — Discoverability & agent surface

**Purpose:** Connective tissue between the typeset product (pillars 1–3) and the open web — search engines, LLM crawlers, and autonomous agents. A cold visit should receive trustworthy, machine-readable context (who, what evidence, which PDF) before defaulting to skepticism.

**Owns:** [DISCOVERABILITY.md](./DISCOVERABILITY.md), gateway `robots.txt` / `sitemap.xml` (emitted to `dist/` today), document `<head>` meta and Open Graph in [index.html](./index.html), future JSON-LD (`Person`, `ProfilePage`, `CreativeWork`), `llms.txt` / agent manifest, variant deep-link contracts, canonical PDF fetch URLs for agents.

**Cold GEO / agent engine optimisation (planned):** structured summaries per variant, evidence pointers back to pillar 4 ids, fast PDF pull paths (`dist/resumes/{pdfFilename}`), and HTML that preserves semantic résumé structure so agents can appreciate typographic intent without executing the microsite shell.

**Does not own:** A4 geometry (pillar 1), shell chrome and controls (pillar 2), Chromium PDF rendering (pillar 3), canonical JSON source (pillar 4).

## Repository paths (not deploy artifacts)

| Path | Role |
|------|------|
| `public/data.js` | Local debug compile output only (`bun run compile`). Gitignored. |
| `dist/public/data.js` | Production fitted payload consumed by the bundled site. |
| `dist/resumes/` | Published variant PDFs when built. |
| `output/` | Ad-hoc local exports — not part of the build contract. Gitignored. |
| `tmp/` | Research, QA renders, evidence extraction. Gitignored. |

See [public/README.md](./public/README.md) for the `public/` folder convention.

## Cross-pillar contracts

| Concern | Source of truth |
|--------|------------------|
| Profile text on screen and in PDF | Fitted `dist/public/data.js` from compile + optional Chromium fit |
| PDF on disk | `dist/resumes/{pdfFilename}` from variant record |
| Download href | `resumes/` + `profile.pdfFilename` |
| Variant count | `data/variants.json` |
| Document geometry | [config/typesetting.json](./config/typesetting.json) → CSS; future PDF reads the same JSON |
| Crawler gateway | `dist/robots.txt`, `dist/sitemap.xml` (pillar 5; variant URLs planned) |
| Agent-readable identity | Pillar 4 source + pillar 5 structured surface (JSON-LD / manifest planned) |
