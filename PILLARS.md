# Five pillars

The résumé engine is five intentional layers. Edit one pillar per agent session so typesetting, screen UI, PDF output, source data, and discoverability do not bleed into each other.

## Pillar 1 — Typesetting engine

**Purpose:** Fixed A4 geometry and typographic excellence. The sheet never reflows.

**Owns:** [TYPESETTING.md](./TYPESETTING.md), [TYPESETTING_CONFORMANCE.md](./TYPESETTING_CONFORMANCE.md), [config/typesetting.json](./config/typesetting.json), [assets/css/typesetting.css](./assets/css/typesetting.css), résumé rules in [assets/css/style.css](./assets/css/style.css), [bun/src/font-metrics.js](./bun/src/font-metrics.js), [bun/src/typesetting.js](./bun/src/typesetting.js), Newsreader 1.003 variable (sheet face), unit grid, date column, bullet hang, print CSS.

**Does not own:** Side rails, mobile menu, Spotify, zoom chrome, Satoshi UI chrome (pillar 2), Chromium PDF export, SEO or agent manifests.

## Pillar 2 — Screen renderer (microsite)

**Purpose:** Centerpiece A4 proof on desktop and mobile. Left rail = profile configuration. Right rail = view controls, export, listening context.

**Owns:** [index.html](./index.html), shell CSS, Satoshi UI faces (`--font-ui`), [assets/js/app.js](./assets/js/app.js) (rendering, controls, A4 scale on stage — not PDF fitting).

**Preview rule:** Serve **bundled** output only. Source `assets/js/app.js` imports bare npm specifiers (`motion`, `gsap`); the browser cannot load repo-root `index.html` directly. Use:

```bash
bun run build      # site artifact → dist/
bun run preview    # serve dist/ when already built
bun run serve      # rebuild site, then serve dist/
```

## Pillar 3 — PDF engine

**Purpose:** Standalone searchable A4 PDFs (and optional flow DOCX) per variant, ATS-oriented, generated from the same composition payload as the screen. A separate pillar from the live site build.

**Owns:**
- Production Chromium batch: [bun/src/build.js](./bun/src/build.js) with `--pdf`, Playwright, `dist/resumes/`, fit report
- Composition emit (WeasyPrint max + flow DOCX): [bun/src/pillar3-emit.js](./bun/src/pillar3-emit.js), [bun/src/composition.js](./bun/src/composition.js), [bun/src/composition-render.js](./bun/src/composition-render.js), [assets/css/composition.css](./assets/css/composition.css), [bun/src/emit-pdf.py](./bun/src/emit-pdf.py), [bun/src/emit-docx.py](./bun/src/emit-docx.py)
- Shared verification: [bun/src/pdf-verify.js](./bun/src/pdf-verify.js), PDF checks in [bun/src/test.js](./bun/src/test.js)
- Fitting policy: `fitProfileForBuild` / `removeNextOptional` in [assets/js/app.js](./assets/js/app.js) (build-time only)

**Composition emit (single profile, PDF/UA-2 + DOCX):**

```bash
bun run pillar3:emit
bun run pillar3:emit -- --profile <variant-id>
```

Artifacts land in `tmp/pillar3-emit/<id>/` (PDF, DOCX, `report.json`). WeasyPrint on Windows needs GTK under `D:\KJ\Programs_Files\GTK3-Runtime`.

**Optional by design:** `bun run build` deploys the **site only** and retains any existing `dist/resumes/`. Full Chromium PDF regeneration is explicit and slow (~45 minutes for all variants):

```bash
bun run build:pdf --yes    # fit + render every variant PDF
```

Publishing mirrors this locally: `bun run deploy` builds and tests the site with `--skip-pdfs`, then pushes `dist/` to `origin` `gh-pages`. `bun run deploy:pdf` regenerates every variant PDF before publishing.

PDF availability in the browser is determined at **site build** time from `dist/resumes/{pdfFilename}`. The debug compile path (`bun run compile`) does not set `pdfAvailable`.

## Pillar 4 — Data layer

**Purpose:** One person, many curated role × industry views.

**Owns:** [data/resume.json](./data/resume.json), [data/variants.json](./data/variants.json), [data/DATA_LAYER.md](./data/DATA_LAYER.md), [bun/src/compile.js](./bun/src/compile.js), [bun/src/validate.js](./bun/src/validate.js), [bun/src/category-taxonomy.js](./bun/src/category-taxonomy.js), variant tagging, evidence limits, omissions policy.

**Pairs:** each selector choice is a unique role × industry pair (87 total). The public UI navigates Role → Industry only; backend `category` metadata (**22 v2 groups** — see [`data/DATA_LAYER.md`](./data/DATA_LAYER.md)) structures validation, audit, coursework ranking, and thread preservation. Duplicate pair descriptions fail validation.

**Explicit content plans:** each variant in `data/variants.json` carries a `content` block with stable work/project ids and highlight ids from `data/resume.json`. The compiler resolves these plans directly (typically 3 work entries + 2 projects). Regenerate plans with `bun run content:plan` after retagging; assign ids first with `bun run content:ids`. Export audit JSON with `bun run content:audit`. Run `bun run content:coverage` for `allTagReport` eligibility exposure (v1.15.0).

**Variant aliases:** `variantAliases` in `data/variants.json` preserves deep links when variant ids are renamed (e.g. agritech → culinary/hospitality).

**Coursework:** canonical course inventory stays intact in source; each compiled profile reorders courses by relevance to role, industry, category, and keywords. A4 fitting may omit the lowest-ranked tail per profile.

**Canonical `/` profile:** exactly one variant sets `fallback: true` (currently Startup Operations Manager · Early-Stage Technology Startups). Root visits with no query load that profile.

**Master CV:** preview-only outlier under pillar 4 (`canonicalMaster` in variants metadata). Not part of the public microsite selector or the variant PDF set.

## Pillar 5 — Discoverability & agent surface

**Purpose:** Connective tissue between the typeset product (pillars 1–3) and the open web — search engines, LLM crawlers, and autonomous agents. A cold visit (no JS) should receive trustworthy, machine-readable context (who, fallback sheet, proofs, which PDF) before defaulting to skepticism.

**Owns:** [DISCOVERABILITY.md](./DISCOVERABILITY.md), [`bun/src/discoverability.js`](./bun/src/discoverability.js), gateway `robots.txt` / `sitemap.xml` / `llms.txt`, cold `#sheet` + `#agent-provenance` injection, document `<head>` meta and Open Graph, JSON-LD (`Person`, `ProfilePage`, `DigitalDocument`), variant deep-link contracts, canonical PDF fetch URLs for agents.

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
| Crawler gateway | `dist/robots.txt`, `dist/sitemap.xml`, `dist/llms.txt` (pillar 5) |
| Agent-readable identity | Cold `dist/index.html` + JSON-LD from pillar 4 compile via pillar 5 |
