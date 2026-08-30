# Contributing

This is a personal résumé product. Keep changes traceable to source data or to the v1.5 typesetting specification. See [PILLARS.md](./PILLARS.md) and edit **one pillar per session** (typesetting, screen, PDF, data, or discoverability).

## Content changes

1. Edit `data/resume.json`.
2. Add or change curated variants in `data/variants.json` when needed.
3. Run `bun run validate` while editing.
4. Run `bun run test` before committing (site build + tests, PDFs skipped).
5. Run `bun run build:pdf --yes` only when you intend to refresh downloadable PDFs; review `.build-cache/fit-report.json` and spot-check output.

Variant IDs are lowercase kebab-case. Exactly one variant must set `fallback: true`. Every tag other than `all` must reference an existing variant ID. Pair descriptions must be unique. PDF filenames are declared by the variant; never hand-edit files in `dist/`.

## Layout changes

Read `TYPESETTING.md` and `config/typesetting.json` before editing résumé CSS. Do not solve overflow by shrinking type, clipping, or browser-time deletion.

Font-dependent measurements belong in `bun/src/font-metrics.js`. Layout measurement must enforce the inner content boundary (`sheet bottom − padding-bottom`). Optical corrections are additive `[C]` tokens, never a silent change to `u` / `S0` / `S1` / `S2`.

## Preview

Serve `dist/` after `bun run build`. Repo-root `index.html` is not a valid preview target — browser code is bundled from `assets/js/app.js`.

## Implementation constraints

- Production deploys from `dist/` only via `bun run deploy` (publishes to `origin` `gh-pages`).
- `bun run build` is site-only; PDFs are optional via `build:pdf` or `deploy:pdf`.
- Do not claim PDF/A or PDF/UA without external validator reports.
- `public/data.js`, `.build-cache/`, `dist/`, `output/`, and `tmp/` are generated or local-only — do not commit.
- Production PDFs belong in `dist/resumes/`, not repo-root `public/resumes/`.

Use concise conventional commit subjects. Do not add co-author trailers.
