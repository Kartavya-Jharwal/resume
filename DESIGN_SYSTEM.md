# KJ Design System

The résumé microsite uses a small, layered design system so visual changes stay intentional without affecting the deterministic A4 document. Crawler meta, Open Graph, and future JSON-LD belong to pillar 5 ([DISCOVERABILITY.md](./DISCOVERABILITY.md)), not this file.

## Foundations

[`assets/css/tokens.css`](assets/css/tokens.css) is the source of truth for:

- primitive and semantic colour roles;
- interface typography (`--text-micro` → `--text-lg`, tracking kickers);
- spacing and layout scales;
- surface washes (`--surface-wash-02` … `--surface-wash-10`) for white-on-obsidian lifts;
- radii, borders, elevation, and scrims;
- overlay z-index stack (`--z-aside` … `--z-shortcuts-dialog`);
- motion duration and easing curves;
- rail / touch / fit control sizing (`--touch-target`, `--rail-section-gap`, `--fit-btn-min-height`).

Typography is a dual stack:

- **Satoshi** (`--font-ui`) — microsite chrome, rails, buttons, and status copy. Loaded faces are Regular / Medium / Bold only (`--weight-ui-regular` 400, `--weight-ui-medium` 500, `--weight-ui-bold` 700). Do not invent intermediate weights.
- **Newsreader** (`--font-resume-text` / `--font-resume-title`) — the A4 sheet, plus the left-rail editorial display line (`.rail-title`).

Left-rail type order: display → brand (Medium) → control value (Medium) → intro/help (Regular) → kickers (Bold, `--text-3xs`) → footer (Medium). Block gaps use `--rail-block-gap` / `--rail-block-gap-tight` instead of competing `vh` clamps.

A4 geometry, the type scale, and Newsreader metrics live in [`config/typesetting.json`](config/typesetting.json) and are projected to [`assets/css/typesetting.css`](assets/css/typesetting.css). [`assets/css/style.css`](assets/css/style.css) holds `@font-face` rules for both families plus component, document, responsive, and print rules — prefer tokens over ad-hoc `rgb()` / rem sizes.

## Motion ownership

- Motion powers short interface choreography: shell entrance, text updates, option lists, and mobile controls.
- GSAP powers spatial transitions: Flip-based résumé recomposition and the ambient SVG morph.
- CSS owns durable interaction states such as hover, focus, privacy mode, and responsive panels.

All programmatic motion is disabled in PDF fitting mode and when `prefers-reduced-motion: reduce` is active. Print output removes every microsite-only layer and transition.

## Component principles

1. Keep the A4 sheet typographically neutral and evidence-first.
2. Use mint only for interactive state, live status, keyword marks (`--accent-mark`), and orientation cues.
3. Use one elevation treatment per surface; borders describe grouping, shadows describe depth (`--shadow-preview`, `--shadow-dialog`).
4. Animate opacity, blur, and transforms only—never résumé font size, margins, or page geometry.
5. Preserve visible focus and a minimum `--touch-target` (44px) for chrome controls.
6. Right-rail sections (View / Proof / Share / Listening) share kickers via `--tracking-kicker` and `--rail-section-gap`.
