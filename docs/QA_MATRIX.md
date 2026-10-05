# QA matrix (Stage 8)

## Viewports

| Viewport | Device class | Priority checks |
|----------|--------------|-----------------|
| 375×812 | iPhone | Splash, sheet, zoom, PDF |
| 390×844 | iPhone Pro | Deep link skips splash |
| 430×932 | iPhone Max | Profile bar truncate + aria-label; 48px matrix opts |
| 768×1024 | iPad | Mobile shell (≤1023); sticky search + segments |
| 1280×800 | Laptop | Popover, no rail scroll, Spotify |
| 1440×900 | Desktop | Full three-column |
| 1920×1080 | External monitor | Stage fit, zoom |

## Browsers

Chrome (primary), Safari iOS, Firefox (spot), LinkedIn in-app browser (iOS WebView).

## Flows

1. **Cold `/`** → fallback profile loads; desktop popover fields show role/industry.
2. **Deep link** `?role=Strategy%20Consultant&industry=MBB%20Strategy%20Consulting` → skips splash; bar matches URL; boot canonicalizes casing.
3. **Surprise me** → swaps to random variant.
4. **Redact + download** → sensitive fields hidden; PDF download or honest toast.
5. **Copy link** → paste in new tab → same variant.
6. **Resize 1023↔1024** → sheet/popover close; layout mode switches cleanly.

## Selector UX (additive)

Wave 3 QA — additive chrome only (search, alpha rails, keyboard, speed dial, edge pairs, a11y). Core Role → Industry commit path is unchanged.

### Filter (desktop `#mtxPop` + mobile `#mxM`)

| # | Check | Pass |
|---|-------|------|
| F1 | Typing in search filters roles (fuzzy on role, industry, category, id, aliases). | |
| F2 | Match text shows mint `.matrix-match` highlight; clearing query removes marks. | |
| F3 | Role-name hit keeps the full industry column (dual-column pick still usable). | |
| F4 | Industry-only queries hide non-matching industries for the browse role. | |
| F5 | Zero matches → empty copy `No matches for “…”` (`role="status"`); lists stay empty. | |
| F6 | Clearing the query restores the full role/industry lists (variance intact). | |
| F7 | Filter keystrokes reuse keyed option sync — no full list remount / focus thrash. | |
| F8 | Desktop open resets search; mobile sheet open resets mobile query on profile-sheet reset paths. | |

### Alpha rails (desktop)

| # | Check | Pass |
|---|-------|------|
| A1 | Role column shows sticky A–Z (and `#` when needed) letter heads ahead of groups. | |
| A2 | Trailing `.matrix-alpha` rail (`aria-label="Jump to letter"`) lists A–Z. | |
| A3 | Letters with visible roles: enabled, `aria-label="Jump to X"`, focusable. | |
| A4 | Empty letters: `.is-empty`, `disabled`, `aria-disabled="true"`, `tabIndex=-1`, inert click. | |
| A5 | Enabled letter jump scrolls letter head / first opt into view and focuses that option. | |
| A6 | Heavy letter buckets (e.g. S) still scroll under the sticky head; rail jump lands at group start. | |
| A7 | Filtering updates rail enablement (letters with no remaining roles become empty/disabled). | |

### Keyboard (desktop listbox + shortcuts)

| # | Check | Pass |
|---|-------|------|
| K1 | `/` opens popover focused on search; `R`/`r` → role listbox; `I`/`i` → industry listbox. | |
| K2 | Search `ArrowDown` moves focus into the first visible role option. | |
| K3 | Listbox: `ArrowUp`/`ArrowDown`, `Home`/`End`; `Enter`/`Space` activates focused option. | |
| K4 | Typeahead (letters/digits, 700ms buffer): jumps to matching option; repeated single letter advances. | |
| K5 | `ArrowRight` role→industry; `ArrowLeft` industry→role (desktop columns only). | |
| K6 | `Escape` closes popover and restores focus to the opening trigger. | |
| K7 | While popover open, global shortcuts (`/`, `R`, `I`, zoom, etc.) do not fire. | |
| K8 | `?` toggles shortcuts dialog; Esc closes it and restores hint focus. | |

### Mobile speed dial (`#mxM` / `.matrix-speed`)

| # | Check | Pass |
|---|-------|------|
| M1 | Role step shows right-edge A–Z speed dial (`aria-label="A to Z speed dial"`). | |
| M2 | Dial lists **only present** letters (empty letters omitted — not disabled stubs). | |
| M3 | Tap / vertical scrub (pointer capture) jumps list to that letter head; active letter highlights. | |
| M4 | Industry step removes the speed dial entirely. | |
| M5 | Sticky search + Role\|Industry segments stay above the stepped list and thumb-reachable. | |
| M6 | ≤430px: matrix options ≥48px touch targets. | |
| M7 | Handle swipe-down dismisses sheet; live region announces Role / Industry steps. | |

### Edge pairs

| # | Check | Pass |
|---|-------|------|
| E1 | **Single-industry role** (desktop): picking the role auto-commits, closes popover, updates bar. | |
| E2 | **Single-industry role** (mobile): role tap commits and closes/resets sheet (Industry segment stays locked while on role). | |
| E3 | **Multi-industry role**: browsing/focusing a role does **not** false-activate an industry until industry commit. | |
| E4 | Multi-industry role shows `| N` count on the role option; industry column label becomes `Industry \| N`. | |
| E5 | Empty-letter rails stay inert (desktop disabled; mobile omitted) while populated letters still jump. | |
| E6 | Filter → zero results → empty status; clear filter → lists + rails restore. | |
| E7 | Session recent chips (≤3, `sessionStorage`) appear above lists after prior commits; chip pick commits. | |

### Accessibility & shortcuts spot checks

| # | Check | Pass |
|---|-------|------|
| S1 | Keyboard path: `/` → search → `ArrowDown` → pick role → industry → commit → download PDF (desktop). | |
| S2 | Focus trap stays inside `#mtxPop` / `#mobileProfileSheet`; stage wrap + asides are `inert` while open. | |
| S3 | `#profileLive` announces mobile Role / Industry step changes (re-announce works for identical strings). | |
| S4 | Alpha rail / speed dial / recent strip expose sensible `aria-label`s; options use `role="option"` + `aria-selected`. | |
| S5 | Industry trigger focuses industry listbox on open; Escape restores trigger focus. | |
| S6 | `prefers-reduced-motion`: splash dismiss instant; no Flip stagger; filter / letter micro-motion skipped (`canAnimate()`). | |
| S7 | axe DevTools: 0 critical on home + popover open + mobile sheet open. | |
| S8 | Shortcuts dialog documents `/`, `R`, `I`, and closes without trapping the matrix underneath. | |

### Desktop popover smoke (`#mtxPop` / `#mxD`)

1. Open via role chip, industry chip, `/`, `R`, or `I`.
2. Search filters with highlight + empty state; variance remains when cleared.
3. Role column: sticky letter heads + trailing alpha rail; empty letters disabled.
4. Multi-industry roles show `| N`; single-industry roles auto-commit on role pick.
5. Browsing a multi-industry role does not false-activate an industry until commit.
6. Listbox: Arrow / Home / End / typeahead; Left/Right moves role↔industry columns.
7. Industry trigger focuses the industry listbox; Escape restores trigger focus.
8. Session recent (≤3) chips appear above lists after prior commits.

### Mobile sheet smoke (`#mobileProfileSheet` / `#mxM`)

1. Sticky search + Role|Industry segments above the stepped list.
2. Role step shows right-edge A–Z speed dial (tap + vertical scrub); hidden on industry step.
3. Handle swipe-down dismisses; live region announces Role/Industry steps.
4. ≤430: 48px option targets; search/segments remain thumb-reachable.

## Performance spot checks

- LCP: sheet visible <2.5s on 4G throttle (mobile).
- No flash before `data-resume-ready="true"`.
- Matrix re-open uses keyed option sync (no full list remount churn on filter keystrokes).

## P5 spot checks

- Rich Results Test parses Person JSON-LD.
- `/sitemap.xml` URLs return 200.
- `/llms.txt` readable at root.

## Wave status

| Wave item | Owner | Status |
|-----------|-------|--------|
| `wave3-qa` | Agent Q | completed |
