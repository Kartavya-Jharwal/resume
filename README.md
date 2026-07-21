# Kartavya Jharwal Résumé

The résumé is the product. The surrounding controls make it an explorable microsite, but every view remains a precisely typeset, downloadable A4 document.

The source data describes one person across many role and industry contexts. Bun validates that source, compiles 102 curated variants, fits optional content at build time, renders one searchable PDF per variant with a pinned Chromium release, minifies the website, and writes the deployable artifact to `dist/`.

The canonical URL is `https://resume.kartavya.tech`. The repository’s GitHub Pages custom-domain setting must also be changed to that hostname; committing `CNAME` alone does not change the setting.

## Product model

- One identity supports all role variants. Cross-domain breadth is positioning and evidence, not a separate frontend persona.
- A root visit opens the universal résumé immediately. Role and industry controls switch among curated variants; “Surprise me” remains an optional exploration feature.
- Searchable skills live in the source data and compiled payload. Recruiters can inspect the site, follow a focused deep link, or download the matching PDF.
- The résumé never reflows to a different document geometry. Screen rendering scales the fixed A4 page; print and PDF use the same internal layout.

Deep links use the curated role and industry labels:

```text
https://resume.kartavya.tech/?role=Agentic+Systems+Architect&industry=FinTech+Automation
```

## Commands

```bash
bun ci                 # install the lockfile exactly
bun run validate       # validate source data and variant references
bun run metrics        # extract font metrics used by the CSS
bun run compile        # create the development public/data.js payload
bun run serve          # compile, then serve the source site on port 3000
bun run build          # create dist/ and all 102 PDFs
bun run test           # full build followed by production-artifact tests
bun run preview        # serve dist/ on port 3000
```

`bun run build` deletes the previous `dist/` and `.build-cache/` directories before rebuilding. Do not edit anything in those directories by hand.

## Build contract

The build performs these steps in order:

1. Validate `data/resume.json` and `data/variants.json`.
2. Inspect the official Source Serif 4 variable TTF for required OpenType features, Unicode coverage, date width, cap offset, x-height, and bullet sidebearing.
3. Compile every curated profile.
4. Ask the pinned Chromium engine to measure the actual A4 DOM and deterministically omit low-priority optional items until the profile fits. Every omission is recorded in `.build-cache/fit-report.json`; words are never clipped or ellipsized.
5. Bundle/minify the browser JavaScript and CSS, copy self-hosted fonts/assets, and write `dist/`.
6. Render all variant PDFs from the fitted payload with tagged-PDF export enabled.
7. Fail unless every PDF has exactly one A4 page.

The output PDF text remains searchable and the Source Serif subsets are embedded. Tagged export is enabled, but this project does not claim PDF/UA or PDF/A conformance without an external standards validator.

## Source map

```text
data/resume.json          canonical résumé content
data/variants.json        curated role × industry variants and PDF names
assets/css/style.css      screen shell plus normative A4 typesetting
assets/js/app.js          rendering, controls, measurement, build fitting
assets/fonts/             self-hosted Source Serif 4 web fonts and metric TTF
bun/src/validate.js       source validation
bun/src/font-metrics.js   build-time font inspection
bun/src/compile.js        profile compiler
bun/src/build.js          dist/PDF orchestrator
bun/src/test.js           production artifact checks
TYPESETTING.md            v1.5 master typesetting specification
dist/                     generated GitHub Pages artifact (ignored)
```

GitHub Actions builds and deploys only `dist/` from `main`. The workflow installs Bun 1.3.14 and the Chromium revision pinned by the exact Playwright dependency.

## Editing content

Edit only the JSON source, then run `bun run test`. Variant tags must reference an ID declared in `data/variants.json`. A content change may alter build-time omissions in multiple PDFs, so inspect `.build-cache/fit-report.json` and visually check representative output before committing.

The complete geometric and typographic rules are normative in [TYPESETTING.md](./TYPESETTING.md). Implementation decisions and fitting policy are summarized in [ARCHITECTURE.md](./ARCHITECTURE.md).
