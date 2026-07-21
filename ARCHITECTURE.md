# Architecture

## System boundary

The deployed application is static. Bun is the build orchestrator; Chromium is a pinned typesetting/PDF engine; GitHub Pages serves only `dist/`. There is no production server, database, runtime data population, or manual PDF authoring step.

```text
resume.json + variants.json + Source Serif 4
                    |
          validate / compile / measure
                    |
       deterministic optional-content fitting
                    |
       minified site + 102 searchable A4 PDFs
                    |
                  dist/
                    |
               GitHub Pages
```

## One source, two representations

`data/resume.json` is the single content source. `data/variants.json` defines curated role × industry views. The compiler ranks direct variant matches ahead of global fallbacks and produces browser-ready profiles.

The fitted production payload drives both the on-screen A4 document and PDF generation. This prevents a download from silently containing different text than the selected résumé. Source development can use the unfitted `public/data.js`; that file is generated and ignored.

## Typesetting

`TYPESETTING.md` v1.5 is normative. Notable implementation guarantees are:

- A4 is always 210 × 297 mm with 17.5 mm side, 16.5 mm top, and 33 mm bottom margins.
- Body, title, and name sizes are 11 pt, 13 pt, and 16 pt on a 14 pt unit.
- Section and entry spacing is expressed in unit multiples.
- Dates use tabular lining figures in a right-flush reserved zone measured from the widest actual formatted date string.
- Prose uses oldstyle proportional figures; labels use real `smcp`; ligatures remain enabled.
- The bullet hang and other font-dependent constants are extracted from the actual Source Serif 4 binary at build time.
- Screen controls transform the A4 proofing surface only. They do not change document measure or reflow its content.

## Fitting policy

Runtime truncation is forbidden. During the build, Chromium renders each full profile against the fixed page and checks both vertical overflow and overlong entry titles. If it does not fit, the builder removes optional data in a stable priority order and measures again. It never cuts a word, clamps a line, shrinks type, changes margins, or hides overflow.

The retained candidate must pass measurement or the build fails. Omitted values remain auditable in `.build-cache/fit-report.json` and in each compiled profile’s `omissions` array.

## PDF engine and verification

The exact Playwright dependency pins the Chromium revision. Bun invokes that binary directly in headless mode because the produced artifact does not require a long-lived browser automation session. Four isolated print workers render profiles in bounded parallel batches.

Every output enables tagged-PDF export and is immediately parsed with `pdf-lib`. The build fails unless it contains exactly one page whose MediaBox is A4 within a 0.5 pt tolerance. `bun/src/test.js` repeats page, asset, payload, PDF-presence, and CNAME checks.

The PDFs contain embedded searchable text. Tagged export is useful accessibility metadata, but PDF/UA and PDF/A are conformance standards requiring dedicated validators; neither label is asserted automatically.

## Deployment

`.github/workflows/pages.yml` runs only for `main` (or manually), installs the locked Bun dependencies and pinned Chromium, builds and tests `dist/`, uploads it as the Pages artifact, and deploys it to the `github-pages` environment.

The repository’s Pages source must be set to GitHub Actions, and its custom domain must be set to `resume.kartavya.tech`. The generated `dist/CNAME` preserves that domain after deployment.
