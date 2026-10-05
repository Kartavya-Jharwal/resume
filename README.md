# Kartavya Jharwal Résumé

The résumé is the product. The surrounding controls make it an explorable microsite, but every view remains a precisely typeset, downloadable A4 document.

The source data describes one person across many role and industry contexts. Bun validates that source, compiles **88** curated variants, minifies the website, and writes the deployable artifact to `dist/`. PDF generation is a separate, explicit step when you choose to run it.

The canonical URL is `https://resume.kartavya.tech`. The site is also reachable at `https://kartavya.tech/resume` and `https://kartavya-jharwal.github.io/resume`. GitHub Pages serves the `gh-pages` branch of this repository; set the custom domain to `resume.kartavya.tech` in the repo’s Pages settings.

See [PILLARS.md](./PILLARS.md) for the five-layer model: typesetting, screen UI, PDF output, data, and discoverability/agent surface.

## Product model

- One identity supports all role variants. Cross-domain breadth is positioning and evidence, not a separate frontend persona.
- A root visit opens the **flagship fallback** profile (Strategic Design Engineer · Founder-Led Startups). This variant blends the founder-associate lens with product design and hands-on engineering evidence. Role and industry controls switch among curated variants; “Explore another profile” remains an optional feature.
- Searchable skills live in the source data and compiled payload. Recruiters can inspect the site, follow a focused deep link, or download the matching PDF when that file exists in `dist/resumes/`.
- The résumé never reflows to a different document geometry. Screen rendering scales the fixed A4 page; print and PDF use the same internal layout.

Deep links use exact selector `role` and `industry` labels (compile sets `family` equal to `role` — there is no separate coarse family in source data):

```text
https://resume.kartavya.tech/?role=Strategy+Consultant&industry=MBB+Strategy+Consulting
```

See [`data/DATA_LAYER.md`](./data/DATA_LAYER.md) for taxonomy, categories, evidence threads, and **`all` tag doctrine** (v1.15.0).

## Commands

```bash
bun ci                 # install the lockfile exactly
bun run validate       # validate source data and variant references
bun run metrics        # extract font metrics used by the CSS
bun run fonts:sync     # vendor Newsreader 1.003 TTF + WOFF2; preserves Satoshi in the manifest
bun run compile        # unfitted debug payload → public/data.js (gitignored)
bun run build          # create dist/ (site only; retains existing dist/resumes/)
bun run build:pdf --yes  # Chromium fit + WeasyPrint PDF/DOCX for all variants
bun run pillar3:publish  # WeasyPrint PDF/DOCX emit into dist/resumes/
bun run test           # site build + production tests (--skip-pdfs)
bun run test:pdf       # full WeasyPrint PDF build + strict PDF tests
bun run serve          # rebuild site, then serve dist/
bun run preview        # serve dist/ without rebuilding
bun run deploy         # build, test, publish dist/ to origin gh-pages
bun run deploy:pdf     # full PDF/DOCX build, test, then publish
```

`bun run build` deletes previous `dist/` **except** `dist/resumes/` when not in PDF mode, so an existing PDF batch survives site-only rebuilds. Do not edit anything in `dist/` or `.build-cache/` by hand.

**Preview:** open the bundled site from `dist/`, not repo-root `index.html`. Source JavaScript uses bare `motion` / `gsap` imports that only resolve after `bun run build` bundles them.

## Build contract

### Site build (`bun run build`)

1. Validate `data/resume.json` and `data/variants.json`.
2. Inspect Newsreader for required OpenType features, coverage, and metric extraction; copy Newsreader + Satoshi faces into `dist/`.
3. Compile every curated profile.
4. Bundle/minify browser JavaScript and CSS, copy self-hosted fonts/assets, write `dist/`.
5. Mark each profile’s `pdfAvailable` from whether a current WeasyPrint artifact exists at `dist/resumes/{pdfFilename}`.

### PDF build (`bun run build:pdf --yes`)

1. Chromium measures A4 fit and records omissions in `.build-cache/fit-report.json` (words are never clipped or ellipsized).
2. WeasyPrint renders tagged, font-embedded A4 PDFs from the composition sheet; editable DOCX is emitted beside each PDF.
3. Artifact manifest entries use `"engine": "weasyprint"`.

This project does not claim PDF/UA or PDF/A conformance without an external standards validator.

## Source map

```text
data/resume.json          canonical résumé content
data/variants.json        88 curated role × industry variants and PDF names
data/DATA_LAYER.md        taxonomy, categories, threads, `all` tag doctrine, metadata contract
assets/css/tokens.css     microsite UI tokens
assets/css/typesetting.css  generated A4 geometry and type scale
assets/css/style.css      screen shell plus normative A4 typesetting
assets/js/app.js          rendering, controls, measurement, build fitting
assets/fonts/             Newsreader 1.003 (sheet, OFL) + Satoshi UI WOFF2s + font-manifest.json
assets/img/og/            Open Graph artwork (defaults and proof cards)
config/typesetting.json   canonical typesetting numbers (v1.6)
config/typesetting-requirements.json  conformance requirement ids
config/release-priority-variants.json  optional PDF / release prioritization
bun/src/validate.js       source validation
bun/src/typesetting.js    unit conversions and CSS projection
bun/src/font-metrics.js   build-time Newsreader inspection
bun/src/compile.js        profile compiler
bun/src/build.js          dist orchestrator (site default; --pdf for PDFs)
bun/src/test.js           production artifact checks
bun/src/deploy.js         publish dist/ to origin gh-pages
TYPESETTING.md            v1.6 master typesetting specification
TYPESETTING_CONFORMANCE.md requirement ledger
DISCOVERABILITY.md        pillar 5 — SEO, JSON-LD, GEO, agent surface (roadmap)
PILLARS.md                five-layer product model
ARCHITECTURE.md           system boundary, fonts, deploy
public/                   local compile target only (see public/README.md)
dist/                     generated GitHub Pages artifact (ignored)
output/                   ad-hoc local PDF exports (ignored)
tmp/                      research and QA scratch (ignored)
```

Production deploys locally: `bun run deploy` builds and tests the site (PDFs skipped), then force-pushes the contents of `dist/` to the `gh-pages` branch on `origin` (`Kartavya-Jharwal/resume`). Run `bun run deploy:pdf` when you want to refresh downloadable WeasyPrint PDFs and DOCX before publishing.

## Editing content

Edit only the JSON source, then run `bun run test`. Variant tags must reference an ID declared in `data/variants.json`. Exactly one variant must set `fallback: true`. Each role/industry pair must remain unique, and each pair needs its own summary. Backend `category` (22 v2 buckets) is documented in [`data/DATA_LAYER.md`](./data/DATA_LAYER.md) — do not set `family` in `variants.json`.

After substantive content changes, run `bun run build:pdf --yes` when you want to refresh downloadable PDFs/DOCX, then inspect `.build-cache/fit-report.json` and spot-check representative output.

Education is structured source data with institution links, locations, honors, and keyword-tagged coursework. The compiler ranks coursework per profile.

`data/resume.json#custom.limits` is the editorial page-capacity policy: two evidence blocks per targeted profile, bounded bullets, and optional technical qualifications for tagged profiles.

Redaction is a presentation control for screen sharing, not a secrecy boundary.

Normative geometry and typography: [TYPESETTING.md](./TYPESETTING.md). System design: [ARCHITECTURE.md](./ARCHITECTURE.md).
