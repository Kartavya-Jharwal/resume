# KJ Design System

The résumé microsite uses a small, layered design system so visual changes stay intentional without affecting the deterministic A4 document.

## Foundations

[`assets/css/tokens.css`](assets/css/tokens.css) is the source of truth for:

- primitive and semantic colour roles;
- interface and résumé typography;
- spacing and layout scales;
- radii, borders, and elevation;
- motion duration and easing curves;
- A4 geometry and Source Serif metrics fallbacks.

The build appends measured font metrics to the production `tokens.css`, so extracted values override their safe source fallbacks. [`assets/css/style.css`](assets/css/style.css) contains only component, document, responsive, and print rules.

## Motion ownership

- Motion powers short interface choreography: shell entrance, text updates, option lists, and mobile controls.
- GSAP powers spatial transitions: Flip-based résumé recomposition and the ambient SVG morph.
- CSS owns durable interaction states such as hover, focus, privacy mode, and responsive panels.

All programmatic motion is disabled in PDF fitting mode and when `prefers-reduced-motion: reduce` is active. Print output removes every microsite-only layer and transition.

## Component principles

1. Keep the A4 sheet typographically neutral and evidence-first.
2. Use mint only for interactive state, live status, and orientation cues.
3. Use one elevation treatment per surface; borders describe grouping, shadows describe depth.
4. Animate opacity, blur, and transforms only—never résumé font size, margins, or page geometry.
5. Preserve visible focus and a minimum 44px touch target for controls.
