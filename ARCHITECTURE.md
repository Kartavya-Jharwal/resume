# Architecture

## System boundary

The deployed application is static. Bun is the build orchestrator; Chromium measures A4 fit for the site payload; WeasyPrint renders downloadable PDFs (plus editable DOCX). GitHub Pages serves only `dist/`. There is no production server, database, or runtime data population.

```text
resume.json + variants.json
Newsreader (sheet) + Satoshi (UI)
                    |
          validate / compile
                    |
         site build (default)
                    |
       minified microsite + retained PDFs
                    |
                  dist/
                    |
            bun run deploy
                    |
      origin gh-pages (project Pages)

Optional: Chromium fit + WeasyPrint PDF/DOCX → dist/resumes/
```

See [PILLARS.md](./PILLARS.md) for the five-layer model. Pillar 5 ([DISCOVERABILITY.md](./DISCOVERABILITY.md)) is connective tissue for SEO, structured data, cold GEO, and agent fetch paths; implementation is phased and mostly ahead of the current build.

## One source, two representations

`data/resume.json` is the single content source. `data/variants.json` defines **87** curated role × industry views. There is no separate coarse `family` field in source data — the compiler sets `family` equal to `role` for deep-link and selector compatibility. Backend `category` metadata (22 v2 buckets) structures validation and audits; see [data/DATA_LAYER.md](./data/DATA_LAYER.md).

The fitted production payload drives both the on-screen A4 document and PDF generation when PDFs are built. This prevents a download from silently containing different text than the selected résumé.

- `bun run build` — site artifact; preserves `dist/resumes/` if present; sets `pdfAvailable` from current WeasyPrint artifacts.
- `bun run build:pdf --yes` — Chromium fit + WeasyPrint PDF/DOCX for every variant.
- `bun run compile` — unfitted debug payload; `pdfAvailable` is always false.
- `bun run serve` / `preview` — serve bundled `dist/` only.

## Typography stack

| Face | Role | Source of truth |
|------|------|-----------------|
| **Newsreader** 1.003 (variable, OFL) | A4 sheet text and titles | [TYPESETTING.md](./TYPESETTING.md), `config/typesetting.json`, `assets/fonts/font-manifest.json` |
| **Satoshi** (Regular / Medium / Bold) | Microsite UI chrome (`--font-ui`) | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), `assets/css/tokens.css` |

`bun run fonts:sync` vendors Newsreader from Google Fonts and must preserve Satoshi entries already recorded in `font-manifest.json`. Sheet metrics come from Newsreader TTFs; cold-load WOFF2s ship in `dist/`.

## Typesetting

`TYPESETTING.md` v1.6 is normative. Screen controls transform the A4 proofing surface only. They do not change document measure or reflow content.

## Fitting policy

Runtime truncation is forbidden. During an explicit PDF build, Chromium measures each profile against the fixed page and deterministically omits optional data when needed. Omissions are auditable in `.build-cache/fit-report.json`. Chromium is not used for download PDF bytes.

## PDF / DOCX engine and verification

Download PDFs are WeasyPrint composition emits (`pillar3:emit` / `build:pdf`): tagged, full-font-embedded A4 with the Pillar 1 canon. Editable DOCX is emitted in parallel with static Newsreader instances. Playwright Chromium remains the A4 fit measurer for the site payload only.

`bun/src/test.js` accepts `--skip-pdfs` for site-only checks. Full PDF assertions run after `build:pdf`. Artifact manifest entries use `"engine": "weasyprint"`.

Site-only builds retain whatever is already under `dist/resumes/`. Orphan PDFs from renamed or removed variants can linger until a full `build:pdf` / `deploy:pdf` refresh — do not treat file presence alone as proof the catalog is current.

## Deployment

Local publish only — no cloud GitHub Actions build.

`bun run deploy`:

1. `bun run test` (site build + `test.js --skip-pdfs`; retains existing `dist/resumes/`).
2. Force-push the contents of `dist/` to `origin` branch `gh-pages`.

`bun run deploy:pdf` runs `build:pdf --yes`, full tests, then the same publish step.

GitHub Pages on `Kartavya-Jharwal/resume` must use **Deploy from a branch** → `gh-pages` / `/`. Custom domain `resume.kartavya.tech` is set in repo Pages settings; `dist/CNAME` preserves the hostname in the published tree. The user site (`Kartavya-Jharwal.github.io` / `kartavya.tech`) is separate; this product is the project site at `/resume` on those hosts and at the subdomain when configured.

`origin` is `Kartavya-Jharwal/resume`. The optional `legacy-root` remote points at the user-site repo for history only — never publish résumé `dist/` there.

## Repository layout vs deploy tree

| Repo path | Deployed? | Notes |
|-----------|-----------|-------|
| `dist/` | Yes (entire tree) | Only artifact published to `gh-pages`. |
| `public/data.js` | No | Local `bun run compile` output; gitignored. |
| `dist/public/data.js` | Yes | Fitted `window.PROFILES` at site build. |
| `dist/resumes/` | Yes | Optional PDFs from pillar 3. |
| `assets/fonts/` | Via `dist/` | Newsreader + Satoshi; copied at site build. |
| `assets/img/og/` | Via `dist/` when build includes them | Open Graph placeholders / defaults. |
| `output/` | No | Ad-hoc exports; gitignored. |
| `tmp/` | No | Evidence and QA; gitignored. |
