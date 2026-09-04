# Pillar 5 — Discoverability & agent surface

This pillar is the **connective tissue** between the résumé product and the open web. Pillars 1–4 produce a deterministic document; pillar 5 makes that document **findable, legible, and trustworthy** for humans, search engines, LLM crawlers, and autonomous agents — especially on a **cold visit with no JavaScript**.

## Problem

Without a cold agent surface, crawlers see an empty sheet and default to a hostile prior: self-reported marketing, inflated metrics, unverifiable competence. Pillar 5 re-poses pillar 4 truth in **agent-level language** so the first reaction is structured identity + checkable proofs, not skepticism.

## Goals

1. **Cold agent trust** — Static HTML carries the fallback résumé, claim discipline, and preferred sources without executing the microsite shell.
2. **Evidence grounding** — Live [`data/proof-router.json`](./data/proof-router.json) URLs and project links surface as citeable external validity.
3. **Child SEO** — `resume.kartavya.tech` ranks as Kartavya Jharwal’s dossier under parent [`kartavya.tech`](https://kartavya.tech/).
4. **GEO / AI robots** — Explicit allow for citation/search crawlers; preferred-source map in `llms.txt`.
5. **Structured data** — JSON-LD `Person` / `ProfilePage` / optional `DigitalDocument` compiled from the same payload as the sheet.

## Principles

- **Same truth as pillar 4.** Never invent employers, metrics, or skills.
- **Claim classes:** identity · curated lens · attested bullets · external proof · engagement disclosure.
- **Self-reported ≠ ungrounded.** State first-party provenance, then point at independent-checkable proofs.
- **Polymath framing is earned breadth** from category/keyword coverage — not a credential slogan.
- **Child of kartavya.tech.** `sameAs` / `isPartOf` always link the parent site.
- **No false precision.** Omit rather than decorate.
- **Internal `evidence[]` stays private** (Canvas paths). Public proofs only.

## Current state (shipped)

| Asset | Location | Notes |
|-------|----------|-------|
| Cold fallback `#sheet` | `dist/index.html` | Build-injected; `#r-name` is the sole SEO H1; `aria-busy="false"` when prefilled |
| `#nojs-gate` | `index.html` / `404.html` | Humans without JS: hide `.app`; explanatory copy + GitHub `gh-pages/resumes` PDF folder |
| `#ai-meta` | `dist/index.html` | 2px dark dropdown: TLDR, keywords, AI summary, provenance, proofs (near-invisible contrast) |
| Meta / OG / Twitter / canonical | `dist/index.html` | 7-word TLDR + 3-line block, then depth description |
| JSON-LD `@graph` | `#profileJsonLd` | Person `@id`, ProfilePage, optional PDF DigitalDocument |
| `robots.txt` | `dist/robots.txt` | Explicit AI search/citation agents + `*` |
| `sitemap.xml` | `dist/sitemap.xml` | Gateway + fallback + priority deep links |
| `llms.txt` | `dist/llms.txt` | Preferred sources; notes query ignored without JS |
| `404.html` | `dist/404.html` | Same no-JS PDF-folder pattern |
| Proof router | `window.PROOF_ROUTER` | Leave-site OG + cold proof list |
| OG image | `assets/img/og-default.png` → `dist/` | Tracked fallback; `OG_RENDER=1` regenerates |
| Client share meta | `assets/js/app.js` | Deep-link updates after hydrate |

Implementation: [`bun/src/discoverability.js`](./bun/src/discoverability.js) via [`writeGatewayMetadata`](./bun/src/build.js).

## Claim discipline (agent copy)

| Class | Meaning |
|-------|---------|
| Identity | Name, location, profiles from `basics` |
| Curated view | `?role=&industry=` is one lens over one record |
| Attested evidence | Highlight text as written in source; numbers are source-bound |
| External proof | Live proof-router + `project.url` |
| Engagement disclosure | Compile `engagementLabel` when present |

## AI crawler policy

Citation/search bots are **allowed** so the dossier can become a preferred source:

- `OAI-SearchBot`, `ChatGPT-User`
- `Claude-SearchBot`, `Claude-User`
- `PerplexityBot`
- `Googlebot`, `Google-Extended`
- `User-agent: *`

Training-vs-citation distinction is documented here; do not silently block citation bots.

## Planned / later

- [ ] Public subset `resume.json` export for LLM ingestion (must stay compile-synced)
- [ ] Canvas proof wrapper microsites (`proof-wrapper-canvas`)
- [ ] Optional `humans.txt` / `security.txt`
- [ ] `/.well-known/ai-plugin.json` only if a real agent API is added
- [ ] Rich Results Test / live deploy verification (manual)

## Non-goals

- Replacing pillar 3 PDF generation
- Dynamic SSR APIs (static GitHub Pages)
- Per-variant HTML pages for all 87 pairs
- Guaranteeing SERP #1 for “Kartavya”

## Ownership

| Concern | Owner |
|---------|--------|
| Cold HTML / meta / JSON-LD / llms / robots | Pillar 5 (`discoverability.js` + build) |
| Profile text and variant list | Pillar 4 |
| Proof destinations | Pillar 4 `proof-router.json` |
| PDF bytes | Pillar 3 |
| Interactive shell hydrate | Pillar 2 |

## Verification

- `bun run build` then `bun run bun/src/test.js --skip-pdfs`
- Cold HTML contains fallback name, role, and at least one proof URL
- JSON-LD parses with `@id` and parent `sameAs`
- `llms.txt` states anti-inference + preferred sources
- `robots.txt` names AI search agents
- Agent fixture: resolve fallback profile + PDF path from `llms.txt` without UI interaction
