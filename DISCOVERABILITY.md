# Pillar 5 — Discoverability & agent surface

This pillar is the **connective tissue** between the résumé product and the open web. Pillars 1–4 produce a beautiful, deterministic document; pillar 5 makes that document **findable, legible, and actionable** for humans, search engines, LLM crawlers, and autonomous agents — especially on a **cold visit** where there is no prior relationship or trust.

## Goals

1. **SEO** — Correct canonical URLs, crawlable gateway, sitemaps, and meta that reflect the live product (not a generic landing page).
2. **Structured data** — JSON-LD for `Person`, `ProfilePage`, and per-variant `CreativeWork` / downloadable `DigitalDocument` where appropriate.
3. **Cold GEO** (generative engine optimisation) — Concise, factual summaries and evidence pointers that generative systems can cite without hallucinating roles or inventing metrics.
4. **Agent engine optimisation** — Machine-readable manifests (`llms.txt`, optional agent API surface) so tools can fetch context, select a variant, and retrieve the matching PDF without driving the microsite UI.
5. **Trust on first contact** — Agents and crawlers should encounter verified structure (name, roles, industries, PDF URLs, source revision) before treating the site as unverified marketing copy.

## Principles

- **Same truth as pillar 4.** Structured surfaces are compiled from `data/resume.json` and `data/variants.json`, never hand-maintained duplicates.
- **Respect pillar 1.** Public HTML for agents should expose semantic résumé structure; do not flatten typography into undifferentiated plain text when structured fields exist.
- **PDF is a first-class fetch target.** Agents should resolve `https://resume.kartavya.tech/resumes/{pdfFilename}` when `pdfAvailable` is true, not scrape the canvas.
- **Gateway vs deep links.** The microsite is the interactive gateway; variant query URLs (`?role=…&industry=…`) are shareable deep links. Sitemaps and JSON-LD must eventually reflect both without creating duplicate-content penalties.
- **No false precision.** Omit fields rather than inventing employment dates, employers, or skills not present in source.

## Current state (shipped)

| Asset | Location | Notes |
|-------|----------|-------|
| `<meta name="description">` | `index.html` | Static gateway copy |
| Open Graph (`og:type=profile`) | `index.html` | Title + description; image planned |
| Canonical URL | `index.html` | `https://resume.kartavya.tech/` |
| `robots.txt` | `dist/robots.txt` | Emitted by `bun/src/build.js` |
| `sitemap.xml` | `dist/sitemap.xml` | Single gateway URL today |
| Compiled profiles | `dist/public/data.js` | Runtime payload; not yet a public JSON API |
| PDFs | `dist/resumes/` | Linked when `pdfAvailable` |

## Planned work

### Phase A — Structured identity (HTML head)

- [ ] JSON-LD `Person` block with stable `@id`, `name`, `url`, `sameAs` (LinkedIn, GitHub, site).
- [ ] `ProfilePage` wrapper with `mainEntity` pointing at the active variant context.
- [ ] Per-variant `CreativeWork` or `DigitalDocument` for PDFs with `encodingFormat: application/pdf` and absolute `contentUrl`.
- [ ] Build-time injection from compile output (pillar 4 revision hash in a comment or `dateModified`).

### Phase B — Crawler expansion

- [ ] Sitemap entries for fallback + high-priority variant deep links (or a sitemap index if count grows).
- [ ] `link rel="alternate"` for PDF when available on the active profile.
- [ ] Optional `humans.txt` / `security.txt` for transparency.

### Phase C — Agent manifests

- [ ] Root `llms.txt` describing site purpose, variant model, PDF paths, and editing policy (“do not infer skills not in source”).
- [ ] `/.well-known/ai-plugin.json` or successor manifest only if a real agent API is added (defer until needed).
- [ ] Stable `GET /public/data.js` semantics documented for agents (read-only, revision header).

### Phase D — Cold GEO copy

- [ ] Short, variant-aware `description` meta (or `og:description`) generated at build time from the active/fallback profile summary.
- [ ] Evidence-backed one-liners per category for external citation (no superlatives without source ids).
- [ ] Optional public `resume.json` export (subset schema) for LLM ingestion — must stay in sync via compile.

## Non-goals

- Replacing pillar 3 PDF generation or claiming PDF/UA conformance here.
- Server-side rendering or dynamic APIs (the product stays static on GitHub Pages).
- Hiding content from crawlers to “game” rankings; `noindex` remains reserved for private artifacts (e.g. master CV preview).

## Ownership

| Concern | Owner |
|---------|--------|
| Meta / OG / JSON-LD templates | Pillar 5 (`index.html` + build injection) |
| Sitemap / robots | Pillar 5 (`bun/src/build.js` `writeGatewayMetadata`) |
| Profile text and variant list | Pillar 4 |
| PDF bytes and filenames | Pillar 3 + variant records |
| Typographic HTML semantics | Pillar 1 + pillar 2 renderer |

## Verification (future)

- HTML validator + [Google Rich Results Test](https://search.google.com/test/rich-results) on `dist/index.html`.
- Assert JSON-LD parses and `@id` URLs resolve.
- Assert sitemap URLs return 200 on preview deploy.
- Agent fixture: given cold `llms.txt`, resolve fallback profile + PDF URL without UI interaction.
