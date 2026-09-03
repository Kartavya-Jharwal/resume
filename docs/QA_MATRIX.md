# QA matrix (Stage 8)

## Viewports

| Viewport | Device class | Priority checks |
|----------|--------------|-----------------|
| 375×812 | iPhone | Splash, sheet, zoom, PDF |
| 390×844 | iPhone Pro | Deep link skips splash |
| 430×932 | iPhone Max | Profile bar truncate + aria-label |
| 768×1024 | iPad | Mobile shell (≤1023) |
| 1280×800 | Laptop | Popover, no rail scroll, Spotify |
| 1440×900 | Desktop | Full three-column |
| 1920×1080 | External monitor | Stage fit, zoom |

## Browsers

Chrome (primary), Safari iOS, Firefox (spot), LinkedIn in-app browser (iOS WebView).

## Flows

1. **Cold `/`** → fallback profile loads; desktop popover fields show role/industry.
2. **Deep link** `?role=Strategy%20Consultant&industry=MBB%20Strategy%20Consulting` → skips splash; bar matches URL.
3. **Surprise me** → swaps to random variant.
4. **Redact + download** → sensitive fields hidden; PDF download or honest toast.
5. **Copy link** → paste in new tab → same variant.
6. **Resize 1023↔1024** → sheet/popover close; layout mode switches cleanly.

## Accessibility spot checks

- Keyboard: focus role field → popover → pick industry → download PDF (desktop).
- `prefers-reduced-motion`: splash dismiss instant; no Flip stagger.
- axe DevTools: 0 critical on home + popover open.

## Performance spot checks

- LCP: sheet visible <2.5s on 4G throttle (mobile).
- No flash before `data-resume-ready="true"`.

## P5 spot checks

- Rich Results Test parses Person JSON-LD.
- `/sitemap.xml` URLs return 200.
- `/llms.txt` readable at root.
