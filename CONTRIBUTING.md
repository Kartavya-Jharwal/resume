# Contributing

This is a personal résumé product. Keep changes traceable to source data or to the v1.5 typesetting specification.

## Content changes

1. Edit `data/resume.json`.
2. Add or change curated variants in `data/variants.json` when needed.
3. Run `bun run validate` while editing.
4. Run `bun run test` before committing; this rebuilds all PDFs.
5. Review `.build-cache/fit-report.json` for changed omissions and visually inspect representative PDFs.

Variant IDs are lowercase kebab-case. Every tag other than `all` must reference an existing variant ID. PDF filenames are declared by the variant and generated automatically; never hand-edit or commit files in `dist/`.

## Layout changes

Read `TYPESETTING.md` before editing the résumé CSS. Do not solve overflow by reducing font size, tightening margins, changing page dimensions, adding line clamps, clipping, or browser-time deletion. Change the source content priority or the deterministic fitting policy and keep the omission auditable.

Font-dependent measurements belong in `bun/src/font-metrics.js`, not handwritten CSS constants. A typeface change must revalidate required OpenType features and character coverage.

## Implementation constraints

- The production application remains static and deploys from `dist/`.
- Bun owns validation, compilation, minification, fitting orchestration, and the build lifecycle.
- The exact Playwright version pins Chromium; do not silently switch the PDF engine.
- Browser code stays small and dependency-light. Self-host assets needed for deterministic rendering.
- `public/data.js`, `.build-cache/`, and `dist/` are generated.
- Do not claim PDF/A or PDF/UA compliance without reports from dedicated validators.

Use concise conventional commit subjects such as `fix: reserve actual date width` or `build: generate fitted resume PDFs`. Do not add co-author trailers.
