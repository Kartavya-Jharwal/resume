# Data layer reference (Pillar 4)

Canonical guide for cold agents editing [`resume.json`](./resume.json) and [`variants.json`](./variants.json).

## Headless CMS model

| File | Role |
|------|------|
| `resume.json` | **Content atoms** — work/project highlights with stable `id`s and `variants` eligibility tags |
| `variants.json` | **Composed views** — explicit `content` plans referencing highlight ids; one PDF per pair |

The compiler ([`bun/src/compile.js`](../bun/src/compile.js)) resolves content plans into fitted profiles. Do not duplicate bullet text in variants — reference highlight ids only.

## Taxonomy glossary

### Public navigation (Pillar 2)

| Term | Field | Notes |
|------|-------|-------|
| **Pair / variant** | `variants[].id` | 88 curated views; kebab-case slug |
| **Role** | `variants[].role` | PDF job title; selector level 1 |
| **Industry** | `variants[].industry` | PDF context; selector level 2; unique with role |

`family` is **not** stored in source. Compile sets `family: role` for legacy payload. Deep links must use exact `role` strings (e.g. `Strategy Consultant`, not `Consultant`).

### Backend only

| Term | Field | Notes |
|------|-------|-------|
| **Category** | `variants[].category` | 22 v2 buckets — validation, audit, **coursework ranking** via `keywordBank` |
| **Register** | Editorial only | Prose tone (Operator, MBB, VC diligence, etc.) — shapes `description` rewrites |
| **Bucket** | Editorial shorthand | Informal subdivisions within a category (e.g. culinary A–C) |
| **Evidence thread** | Not a field | Cross-cutting life history (design, VC, culinary, law, risk) expressed via content plan highlight selection |

### Role vs industry vs category (VC example)

```
role      = Venture Capital Analyst     (PDF title)
industry  = Early-Stage Funds           (employer archetype)
category  = Venture Capital & Early-Stage (backend bucket)
```

VC is a **sector context**, not a job title family. Multiple platform roles inside VC (analyst, associate, portfolio ops) are separate `role × industry` pairs.

## Category taxonomy v2 (22 buckets)

**Deprecated (reject on validate):** `Strategy, Investment & Private Wealth`, `Product Management`, `Product, UX & Experience Design`.

| Category | ~Pairs | Split rationale |
|----------|--------|-----------------|
| MBB Strategy Consulting | 1 | Exhibit-linked cases — not Tier-2 or IB |
| Tier-2 Strategy Consulting | 1 | Boutique commercial strategy + brand translation |
| Corporate Turnarounds & Restructuring | 1 | Kill-gate hotel/asset turnaround + FMEA controls |
| Investment Banking & Capital Markets | 3 | Bulge / boutique / growth equity |
| Venture Capital & Early-Stage | 5 | Pre-seed diligence + growth-stage / portfolio / platform / corp VC |
| Private Wealth & Family Enterprise | 1 | Governance + family office |
| PropTech & Real Estate Investment | 3 | Underwriting + hospitality assets + PropTech SaaS |
| Product Management & Platform | 2 | PM roles (merged from standalone Product Management) |
| UI/UX & Product Design | 7 | Dashboards, enterprise SaaS, civic UX |
| Creative Strategy & Brand | 6 | ESG/carbon brand, campaign identity, FinTech narrative |
| Spatial & Experiential Design | 3 | Museum/expo phygital + retail flagship |
| Creative Technology & Hybrid Design | 2 | Agency prototypes + FinTech data products |
| Executive Operations & Chief of Staff | 8 | Operator cadence |
| Innovation Programs & Events | 5 | Accelerators, corp venture labs, events |
| AI Engineering | 5 | FDE, agents, ML pipelines, MLOps, speech ML |
| Growth, Content & Developer Community | 6 | GTM, DevRel, SEO |
| Data & Decision Intelligence | 5 | BI, viz, data science |
| Technical Delivery, Infrastructure & Solutions | 8 | DevOps, infra, QA, solutions |
| Organizational & Systems Design | 4 | Org design, systems mapping |
| Hospitality & Culinary Operations | 7 | Kitchen, FOH, events |
| Risk, Compliance & Responsible AI | 2 | Controls, responsible AI |
| Legal Operations & Transaction Support | 3 | Law-firm, in-house, M&A transaction support |

Source of truth for assignment: [`bun/src/category-taxonomy.js`](../bun/src/category-taxonomy.js) `CATEGORY_BY_VARIANT_ID`.

### AI Engineering vs AI-adjacent (v1.14.0)

| Label | Count | Notes |
|-------|-------|-------|
| **`AI Engineering` category** | 5 pairs | FDE, agentic systems, core ML pipeline, MLOps, speech ML — roles where AI delivery is the primary craft |
| **AI-adjacent** | ~13 pairs | Responsible AI, knowledge ops, data scientist, spatial AI, etc. — different backend categories by design |

Do not bulk-reclassify data-science or risk pairs into `AI Engineering`; add distinct ML pairs when the bucket needs depth.

### London finance thread matrix (v1.14.0)

Finance-category pairs should carry ≥1 of Duve / Airbnb / Ganet / Redshaw / BWC where evidence fits. Run `bun run content:coverage` for `bucketDepthSummary.financeThreadPct`.

| Pair | Thread evidence |
|------|-----------------|
| IB bulge-bracket | BWC desk + Airbnb models |
| IB growth equity | Duve diligence |
| IB boutique M&A | Redshaw ESG + Duve |
| Family office | Governance + Ganet garden |
| PropTech underwriter | Leased-hotel + Airbnb regression |
| VC diligence (pre-seed) | Duve + Ganet |
| VC growth-stage | Duve tearsheet |

## Evidence threads (must survive together)

Ten threads; each has **anchor pairs** with required highlight ids guarded in `validate.js`. Cherry-picking one thread (e.g. VC + strategy only) must not erase law, culinary, design, or risk craft.

| Thread | Example anchors | Guarded highlights |
|--------|-----------------|-------------------|
| London caliber / finance | VC, IB, Tier-2, family office | Duve, Airbnb, Ganet, Redshaw, family governance |
| Creative & design | Tier-2, university innovation, FinTech designer | Redshaw, NIRMANA, OULM, Ganet |
| VC & diligence | VC analyst, PE ops | Duve tearsheet |
| Strategy & cases | MBB, Tier-2, turnarounds | SRBS, Danone, leased-hotel |
| Risk & controls | Turnarounds, risk analyst, responsible AI | Savi FMEA, risk modelling |
| Founder & platform | Early-stage ops, founder associate, PM accelerators | Margadarshaka, healthcare venture, OULM |
| Hospitality & culinary | Stagiaire, culinary consulting, turnarounds | One property stack: Savi ops + Siya menu design + leased-hotel ETA + Menu Design project |
| Law & transactions | Legal ops, law-firm events | Legal documentation, Redshaw |
| Tech & platform | DevOps, FDE, founding engineer | Automation, Margadarshaka, software projects |
| Events & reports | Experiential producers | Carbon Forward, conference delivery |

Full anchor map: `THREAD_ANCHORS` in [`category-taxonomy.js`](../bun/src/category-taxonomy.js).

## Variant metadata contract

| Field | Compiles? | Contract |
|-------|-----------|----------|
| `description` | Yes → `profile.summary` (label via `summaryLabel`) | Unique; register-aligned |
| `summaryLabel` | Yes (compiled) | Section heading from [`summary-labels.js`](../bun/src/summary-labels.js); default `Professional Summary` |
| `content` | Yes → experience/projects | Explicit highlight id lists |
| `category` | Partial → coursework `keywordBank` | v2 allowlist |
| `requiredKeywords` | Partial → scoring | Non-empty array |
| `metrics` | **No** (source metadata) | Exactly 4 keys: Experience, Scope, Impact, Specialization |
| `limits` | Yes (override) | Subset of known limit keys |
| `limits.includeSummary` | Yes | When `false`, Professional Summary is not compiled or rendered (default `true`) |
| `weight` | No | Reserved for future selector ranking |
| `family` | **Forbidden in source** | Compile derives from `role` |
| `fallback` | Yes | Exactly one `true` |

### Metrics placeholder lexicon

| Situation | Use |
|-----------|-----|
| NDA / stealth | `Confidential` |
| No hard count | `Portfolio-scale`, `Multi-venture`, `Hands-on` |
| Student + operator mix | `Student + Operator` |
| Banned generics | `Expert`, `High`, `20+`, `5+ Yrs` |

## Education fields

| Field | Role |
|-------|------|
| `courses[]` `{ name, keywords }` | **Canonical** — compiler ranks these |
| `canvasCourses[]` / `additionalCourses[]` | Inventory reference only — do not add courses here without mirroring in `courses[]` |
| `canvasCourseCount` | Must equal `canvasCourses.length` |
| `highlights[]` | Honors strings |

## Work fields

| Field | Role |
|-------|------|
| `headerOrder` | Required: `company-first` (bold company, italic role + location) or `role-first` (bold role, italic company + location). Family ventures, AstroPatshala, and founder startups use `company-first`; default for new entries is `role-first`. |

## Project fields

| Field | Role |
|-------|------|
| `id` | Stable `proj-*` slug |
| `description` | Required agent-readable one-liner (even when hidden on sheet) |
| `url` | Optional public link (renders project title as hyperlink on PDF/web) |
| `proofId` | Optional id into [`proof-router.json`](./proof-router.json) — leave-site OG preview + future wrapper microsites |
| `engagementLabel` | Optional credibility label — see [`engagement-labels.js`](../bun/src/engagement-labels.js) allowlist |
| `engagementGroup` | Optional cluster id linking related engagements (e.g. `redshaw-carbon-market`) |
| `highlights[]` | Evidence bullets with `variants` tags |
| `evidence[]` | Internal provenance paths — non-public |
| `startDate` / `endDate` | Required; compile emits right-flush `date` like experience |
### Engagement labels (on-the-record)

Use **only** on firm-named or brief-shaped projects where credibility matters. Bespoke founder builds (BWC, Siya menu, Hospiteri, Crestara) do **not** need a label.

| Label | When to use |
|-------|-------------|
| `Independent Strategic Teardown` | Outsider analysis of a named company; no commission |
| `Applied Consulting` | Brief-shaped consulting advisory against a real company; not commissioned client work |
| `Pro Bono Advisor` | Unpaid advisory output the org could use (Redshaw, Danone, Carbon Forward) |
| `Client Advisory` | Real client brief with stakeholder delivery (AfriKids, One YMCA) |
| `Spec Strategy` | Portfolio/diligence exercise; firm as subject, not client (Duve) |

Never label visible project copy as **coursework** or **case study**. Use the table above, or leave novel own builds **unlabeled** (Menu Design, automation, BWC, Bloom, etc.).

**Honesty frames:** kill-gate exits and incomplete holds stay explicit; unfinished builds may read as work in progress / slow progress rather than fake completion.

When set, `compile.js` emits `engagementDisclosure` and the renderer shows it on the PDF even when `projectDescriptions` is `false`.

## Proof router (leave-site + OG previews)

Canonical registry: [`proof-router.json`](./proof-router.json).

| Field | Role |
|-------|------|
| `id` | Stable `proof-*` slug |
| `status` | `live` \| `planned` \| `internal` \| `none` — only `live` appears in leave-site previews |
| `url` / `match[]` | Destination URL(s) for href matching |
| `ogImage` | Path under `assets/img/og/` (SVG placeholders now; replace with final PNG) |
| `projectIds` / `workIds` | Optional reverse links from resume entries |

`evidence[]` stays **internal** (Canvas paths). Public proof wrappers will get their own microsite + OG card later; until then, leave-site dialog shows the placeholder OG for GitHub, LinkedIn, BWC, NIRMANA, site, and HAC.

Compile emits `window.PROOF_ROUTER`. Drop final cards as `github-og.png`, `linkedin-og.png`, `bwc-og.png`, etc., then update `ogImage` paths in the registry.

## Fact vs phrasing tradeoff

Highlights atomize at bullet level. Same underlying fact in a different register requires a new highlight id (e.g. Margadarshaka h0–h11). A future fact+template engine would separate structured facts from register phrasing — out of scope until highlight count becomes unwieldy.

## Highlight tagging doctrine

| Layer | Field | Role |
|-------|-------|------|
| Eligibility | `highlights[].variants[]` | Which pairs **may** use a bullet (auto/plan paths, editorial hints) |
| Selection | `variants[].content` highlight ids | **Source of truth** for what appears on each PDF |

**Rules:**
- Content plans choose which eligible bullets **do** appear; tags express which pairs **can**.
- After editing content plans, run `bun run content:sync-tags` to add missing tags for variants that actually use a highlight.
- `tagged but never selected` is normal — eligibility without selection is intentional.
- `selected but not tagged` should be fixed by syncing tags (never remove a tag just because a plan skipped it).
- Cross-parent highlight ids in content plans fail validate — each id must sit under its owning work/project entry.

### `all` tag doctrine (v1.15.0)

| `all` means | `all` does NOT mean |
|-------------|---------------------|
| Credible on any resume if deliberately selected | Insertable into any variant by auto-plan |
| Cross-functional delivery, founder ops, broad systems build | Domain-specific craft (kitchen line, legal filings, ASR, hotel FMEA) |

**Rules:**

1. **Never `all`-only** — always pair with category or variant ids.
2. **Denylist** narrow bullets — see [`all-tag-policy.js`](../bun/src/all-tag-policy.js) `ALL_TAG_DENY_PARENT_IDS`.
3. `content:sync-tags` adds variant ids for selected bullets; it does **not** grant `all`.
4. Run `bun run content:coverage` and inspect `allTagReport.summary.narrowWithAll` (target: **0**).

Audit a variant's tag exposure via `allTagReport.variantsAbove70PctAll` — high `allEligiblePct` means most selected bullets are globally eligible, not that the plan is wrong today.

## Repeatable tooling

| Script | Purpose |
|--------|---------|
| `bun run validate` | Schema + thread gates + metrics shape |
| `bun run content:audit` | Density/category/thread export → `tmp/pillar4-audit.json` |
| `bun run bun/src/apply-category-taxonomy.js` | Re-apply v2 category map |
| `bun run content:coverage` | Highlight usage, orphans, tag mismatches, overlap report |
| `bun run content:sync-tags` | Add missing `variants[]` tags from content-plan usage |
| `bun run bun/src/apply-editorial-coverage.js` | Batch orphan→variant swaps (same-parent only) |
| `bun run bun/src/apply-all-tag-discipline.js` | Strip `all` from denylisted narrow-domain highlights |
| `bun run bun/src/apply-weak-identity-swaps.js` | Design depth + weak-identity content swaps |
| `bun run bun/src/apply-variant-metadata.js` | Normalize metrics + apply v1.15.0 descriptions |
| `bun run bun/src/apply-summary-discipline.js` | Set `limits.includeSummary: false` per summary-policy |

## Pillar 2 breadcrumb

Selector may eventually support coarse `selectorGroup` collapse (e.g. all Strategy Consultant industries under one L1). Until then: L1 = exact `role`, URL params must match compiled `role` strings.
