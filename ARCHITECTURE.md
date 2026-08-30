# Architecture

## System boundary

The deployed application is static. Bun is the build orchestrator; Chromium is a pinned typesetting/PDF engine used only when PDF generation is explicitly requested; GitHub Pages serves only `dist/`. There is no production server, database, or runtime data population.

```text
resume.json + variants.json + Source Serif 4
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

Optional: Chromium fit + 59 PDFs → dist/resumes/
```

See [PILLARS.md](./PILLARS.md) for the five-layer model. Pillar 5 ([DISCOVERABILITY.md](./DISCOVERABILITY.md)) is connective tissue for SEO, structured data, cold GEO, and agent fetch paths; implementation is phased and mostly ahead of the current build.

## One source, two representations

`data/resume.json` is the single content source. `data/variants.json` defines **59** curated role × industry views and may group related precise titles under a shared selector `family`. The compiler ranks direct variant matches ahead of global fallbacks.

The fitted production payload drives both the on-screen A4 document and PDF generation when PDFs are built. This prevents a download from silently containing different text than the selected résumé.

- `bun run build` — site artifact; preserves `dist/resumes/` if present; sets `pdfAvailable` from files on disk.
- `bun run build:pdf --yes` — adds Chromium fit and renders every variant PDF.
- `bun run compile` — unfitted debug payload; `pdfAvailable` is always false.
- `bun run serve` / `preview` — serve bundled `dist/` only.

## Typesetting

`TYPESETTING.md` v1.5 is normative. Screen controls transform the A4 proofing surface only. They do not change document measure or reflow content.

## Fitting policy

Runtime truncation is forbidden. During an explicit PDF build, Chromium measures each profile against the fixed page and deterministically omits optional data when needed. Omissions are auditable in `.build-cache/fit-report.json`.

## PDF engine and verification

Playwright pins the Chromium revision. PDF generation runs only with `--pdf` (and `--yes` for non-interactive CI). Eight parallel workers render variants; `pdf-lib` verifies A4 MediaBox and page count.

`bun/src/test.js` accepts `--skip-pdfs` for site-only CI. Full PDF assertions run after `build:pdf`.

## Deployment

Local publish only — no cloud GitHub Actions build.

`bun run deploy`:

1. `bun run test` (site build + `test.js --skip-pdfs`; retains existing `dist/resumes/`).
2. Force-push the contents of `dist/` to `origin` branch `gh-pages`.

`bun run deploy:pdf` runs `build:pdf --yes`, full tests, then the same publish step.

GitHub Pages on `Kartavya-Jharwal/resume` must use **Deploy from a branch** → `gh-pages` / `/`. Custom domain `resume.kartavya.tech` is set in repo Pages settings; `dist/CNAME` preserves the hostname in the published tree. The user site (`Kartavya-Jharwal.github.io` / `kartavya.tech`) is separate; this product is the project site at `/resume` on those hosts and at the subdomain when configured.

## Repository layout vs deploy tree

| Repo path | Deployed? | Notes |
|-----------|-----------|-------|
| `dist/` | Yes (entire tree) | Only artifact published to `gh-pages`. |
| `public/data.js` | No | Local `bun run compile` output; gitignored. |
| `dist/public/data.js` | Yes | Fitted `window.PROFILES` at site build. |
| `dist/resumes/` | Yes | Optional PDFs from pillar 3. |
| `output/` | No | Ad-hoc exports; gitignored. |
| `tmp/` | No | Evidence and QA; gitignored. |
