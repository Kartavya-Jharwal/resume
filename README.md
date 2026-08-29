# Kartavya Jharwal Résumé

The résumé is the product. The surrounding controls make it an explorable microsite, but every view remains a precisely typeset, downloadable A4 document.

The source data describes one person across many role and industry contexts. Bun validates that source, compiles **59** curated variants, minifies the website, and writes the deployable artifact to `dist/`. PDF generation is a separate, explicit step when you choose to run it.

The canonical URL is `https://resume.kartavya.tech`. The site is also reachable at `https://kartavya.tech/resume` and `https://kartavya-jharwal.github.io/resume`. GitHub Pages serves the `gh-pages` branch of this repository; set the custom domain to `resume.kartavya.tech` in the repo’s Pages settings.

See [PILLARS.md](./PILLARS.md) for how typesetting, screen UI, PDF output, and data are separated.

## Product model

- One identity supports all role variants. Cross-domain breadth is positioning and evidence, not a separate frontend persona.
- A root visit opens the **fallback** profile (Startup Operations Manager · Early-Stage Technology Startups). Role and industry controls switch among curated variants; “Explore another profile” remains an optional feature.
- Searchable skills live in the source data and compiled payload. Recruiters can inspect the site, follow a focused deep link, or download the matching PDF when that file exists in `dist/resumes/`.
- The résumé never reflows to a different document geometry. Screen rendering scales the fixed A4 page; print and PDF use the same internal layout.

Deep links use the selector’s role-family and industry labels. A variant may declare a shared `family` such as `Consultant` while retaining a precise résumé title such as `Strategy Consultant`:

```text
https://resume.kartavya.tech/?role=Consultant&industry=Global+Strategy+Consulting
```

## Commands

```bash
bun ci                 # install the lockfile exactly
bun run validate       # validate source data and variant references
bun run metrics        # extract font metrics used by the CSS
bun run compile        # create an unfitted debug payload (public/data.js)
bun run build          # create dist/ (site only; retains existing dist/resumes/)
bun run build:pdf --yes  # fit + render all variant PDFs (~45 min)
bun run test           # site build + production tests (--skip-pdfs)
bun run test:pdf --yes # full PDF build + strict PDF tests
bun run serve          # rebuild site, then serve dist/
bun run preview        # serve dist/ without rebuilding
bun run deploy         # build, test, publish dist/ to origin gh-pages
bun run deploy:pdf     # full PDF build, test, then publish
```

`bun run build` deletes previous `dist/` **except** `dist/resumes/` when not in PDF mode, so an existing PDF batch survives site-only rebuilds. Do not edit anything in `dist/` or `.build-cache/` by hand.

**Preview:** open the bundled site from `dist/`, not repo-root `index.html`. Source JavaScript uses bare `motion` / `gsap` imports that only resolve after `bun run build` bundles them.

## Build contract

### Site build (`bun run build`)

1. Validate `data/resume.json` and `data/variants.json`.
2. Inspect Source Serif 4 for required OpenType features, coverage, and metric extraction.
3. Compile every curated profile.
4. Bundle/minify browser JavaScript and CSS, copy self-hosted fonts/assets, write `dist/`.
5. Mark each profile’s `pdfAvailable` from whether `dist/resumes/{pdfFilename}` exists.

### PDF build (`bun run build:pdf --yes`)

Adds Chromium measurement, deterministic optional-content fitting, and one searchable A4 PDF per variant. Omissions are recorded in `.build-cache/fit-report.json`. Words are never clipped or ellipsized.

Tagged PDF export is enabled, but this project does not claim PDF/UA or PDF/A conformance without an external standards validator.

## Source map

```text
data/resume.json          canonical résumé content
data/variants.json        59 curated role × industry variants and PDF names
assets/css/style.css      screen shell plus normative A4 typesetting
assets/js/app.js          rendering, controls, measurement, build fitting
assets/fonts/             self-hosted Source Serif 4 web fonts and metric TTF
bun/src/validate.js       source validation
bun/src/font-metrics.js   build-time font inspection
bun/src/compile.js        profile compiler
bun/src/build.js          dist orchestrator (site default; --pdf for PDFs)
bun/src/test.js           production artifact checks
bun/src/deploy.js         publish dist/ to origin gh-pages
TYPESETTING.md            v1.5 master typesetting specification
PILLARS.md                four-layer product model
dist/                     generated GitHub Pages artifact (ignored)
```

Production deploys locally: `bun run deploy` builds and tests the site (PDFs skipped), then force-pushes the contents of `dist/` to the `gh-pages` branch on `origin` (`Kartavya-Jharwal/resume`). Run `bun run deploy:pdf` when you want to refresh downloadable PDFs before publishing (~45 min).

## Editing content

Edit only the JSON source, then run `bun run test`. Variant tags must reference an ID declared in `data/variants.json`. Exactly one variant must set `fallback: true`. The optional `family` field groups related titles under one first-level selector choice. Each family/industry pair must remain unique, and each pair needs its own summary.

After substantive content changes, run `bun run build:pdf --yes` when you want to refresh downloadable PDFs, then inspect `.build-cache/fit-report.json` and spot-check representative output.

Education is structured source data with institution links, locations, honors, and keyword-tagged coursework. The compiler ranks coursework per profile.

`data/resume.json#custom.limits` is the editorial page-capacity policy: two evidence blocks per targeted profile, bounded bullets, and optional technical qualifications for tagged profiles.

Redaction is a presentation control for screen sharing, not a secrecy boundary.

Normative geometry and typography: [TYPESETTING.md](./TYPESETTING.md). System design: [ARCHITECTURE.md](./ARCHITECTURE.md).
