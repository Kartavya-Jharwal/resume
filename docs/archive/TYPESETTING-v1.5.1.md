# A Precision Specification for Single-Page Résumé Typesetting
### First Principles → Derived Rules → Reference Implementation
**v1.5 — Master Document. Fully standalone: every rule, formula, and rationale below is complete in place. No section requires reading a prior version.**

---

## Document Status

This is a master document, not a diff. It consolidates everything established across the specification's development into one self-contained reference. A new implementer — human or agent — should be able to work from this file alone.

This document specifies the typesetting system for a single-page, unbound, information-dense reference document (a résumé/CV), targeting **A4** exclusively, set in **Latin-script English**. It borrows the canon and terminology of book typesetting where that canon transfers to a single unbound sheet, and explicitly declines to borrow it where it doesn't — this is a page class closer to a title page or dictionary spread than to long-form book text.

Every rule is tagged with its epistemic status:

| Tag | Meaning |
|---|---|
| **[N]** | Necessary — follows by derivation once prior parameters are fixed. Disputing it means disputing the math. |
| **[E]** | Empirical/heuristic — grounded in type-design or color-science practice, not a closed-form law. |
| **[C]** | Convention — a free aesthetic parameter. Legitimate grounds for expert disagreement. |

---

## 0a. Implementation Notes for the Agent

A prior render was reviewed against this spec and specific, correctable problems were found. These are stated as fixes, not suggestions, and the fixes are already folded into the rules below (§4, §11) — this section exists to explain *why* those rules read the way they do.

**Bug — inconsistent spacing around zero-bullet entries.** A résumé entry can legitimately have zero bullets (a very recent role, an entry still being built out). In a reviewed render, two such entries produced a visibly larger gap before the following section label than any other section transition on the page — almost certainly because, with no bullet list to anchor a margin to, the layout fell through to a browser or framework default instead of the defined grid value. **The fix, load-bearing and stated unconditionally in §11: the space from the end of any entry — with bullets or without — to the next element is fixed at 1u (next entry) or governed by the 2u pre-label rule (next section), and does not vary with bullet count.** There is no zero-bullet special case; there is only the same spacing, applied without a content-dependent fallback.

**Visual concern, separate from the bug above.** A role/date/title row with nothing under it can still read as unfinished even once spacing is fixed. **[C, not forced]** If a one-line descriptor genuinely exists, use it. If not, the entry stands as title/date only — with the spacing bug fixed, it should read as intentionally brief, not broken.

**Confirmed non-issue.** A single non-wrapping tagline/summary line (e.g. an "Areas of Focus" statement) is exempt from the continuous-prose measure concerns in §3a/§4 by construction — it never reaches a second line at this column width. If such a line is ever lengthened enough to wrap, it stops being exempt and needs prose-appropriate leading, not the tight bullet λ this spec otherwise uses.

**Flagged, not confirmed.** A rendered typeface should be checked against every criterion in §14 before its extracted metrics (§4, §6) are treated as final — a compliant typeface swap changes those numbers regardless of anything else in this document.

---

## 1. The Base Unit (u)

**[C]** The base unit is the leading of body text, in points, and every other spatial value in the document — horizontal and vertical — is a multiple of it. A point-based unit is legitimate for both dimensions, not a stretch: picas (1 pica = 12pt) have measured both column widths and leading in the print trade for centuries.

```
S0 = u / λ
```

**[C]** Current value: **u = 14pt**. (Raised from an original 12pt in two 1pt "notches" — a notch being defined, for this system, as the smallest meaningful step on the only unit it has — specifically to loosen a density that read as visually cramped in a reviewed render.)

**[E]** λ (leading-to-size ratio) should sit in **λ ∈ [1.15, 1.30]** — tighter than book convention (λ ≈ 1.45–1.5) — because tight leading suits *reading mode*, not just narrow columns: a short return-sweep benefits from tight leading whether the line is short because the column is narrow, or because the content is a discrete, single-clause fragment (a résumé bullet) rather than continuous multi-line prose. This document's body text is the latter — even where a bullet wraps to a second line, the reader isn't sustaining a long continuous read the way the classic 45–75-character measure guideline assumes.

**Worked example, current state:** u = 14pt, λ ≈ 1.273 → **S0 = 11pt**.

**[N]** Because every downstream value is a function of u, rescaling the whole system means changing this one number and recomputing forward — that's the entire point of committing to a single generative unit rather than setting sizes independently.

---

## 2. The Modular Type Scale

**[C]** A ratio r is chosen from the compressed end of the standard modular-scale family — the golden ratio (1.618) is too aggressive for a 3-level hierarchy on one page, producing a name large enough to unbalance the page's grey value before any content is read. This spec uses **r = 1.2** (minor third), giving exactly three sizes:

```
Sn = S0 × r^n
```

| Level | Role | Formula | Raw | Rounded (in use) |
|---|---|---|---|---|
| L0 | Body / bullets | S0 | 11pt | **11pt** |
| L1 | Title line | S0 × 1.2 | 13.2pt | **13pt** |
| L2 | Name | S0 × 1.44 | 15.84pt | **16pt** |

**[N]** Section labels (e.g. "EXPERIENCE") do **not** get a fourth scale step — introducing a fourth size to distinguish them would be a hierarchy error (see §9), not a refinement. They stay at L0 and are distinguished by case and tracking instead.

**[C — v1.5.1 packed composition]** The name uses a dedicated **20pt** size (`namePtInUse` in `config/typesetting.json`), centered in the header, with title case taken from source data. It remains on the Title optical master with **2u** leading. The contact row (byline) sits **0.5u** below the name box (`nameToContactU` → `--name-contact-gap`) so descenders clear the S0 contact line.

---

## 3. Page Construction — Margins Derived, Not Chosen

**[E]** The classical Van de Graaf / Villard de Honnecourt canon (documented by Tschichold) constructs margins geometrically from a page's own proportions rather than a settings-dialog default. It was built for bound, facing-page books, dividing each page into ninths with an asymmetric inner/outer margin sized for the gutter.

**[N]** A résumé is a single unbound sheet — there is no gutter, so that asymmetry has no referent and collapses to a symmetric left/right margin. What transfers, and is worth preserving, is the canon's core property: **the text block shares the page's own aspect ratio.**

**[C]** The divisor is the canon's second free parameter. Van de Graaf's ninths produced generous margins sized for a slow, long-form luxury read. A résumé is a dense reference document — closer in reading mode to a dictionary than a novel — and historically used tighter divisions. This spec uses **n = 14** for v1.5.1 packed composition (within a recommended n ∈ [10, 16]), not the classical 9. The v1.5.0 default was n = 12.

```
unit_x = W/n
left margin = right margin = unit_x
text_width = W − 2·unit_x = W·(n−2)/n
text_height = text_width × (H/W)          [preserves page aspect ratio]
vertical_margin_total = H − text_height
```

**[C]** Remaining vertical margin splits top:bottom per `footingTop`:`footingBottom` in `config/typesetting.json`. The classical canon used ≈ 1:2 — the "footing" convention, giving the text block visual weight at the bottom rather than reading as sliding off the page. v1.5.1 packed tightens the top further (`footingTop: 0.75`, `footingBottom: 2`) while keeping bottom weight.

**Page target: A4 exclusively (210 × 297mm).**

```
unit_x = 210/14 = 15mm → left = right = 15mm
text_width = 210 − 30 = 180.0mm (510.24pt)
text_height = 180.0 × (297/210) = 254.6mm
vertical_margin_total = 297 − 254.6 = 42.4mm → top = 11.6mm, bottom = 30.9mm
```

| Margins L/R | Text width | Text height | Top | Bottom |
|---|---|---|---|---|
| 15mm | 180.0mm (510.24pt) | 254.6mm | 11.6mm | 30.9mm |

(A Letter-size conversion, if ever needed, uses the identical formula with W = 215.9mm, H = 279.4mm — not carried as a parallel table in this version, since the brief is A4-exclusive.)

### 3a. Cross-Check: Character Count vs. Divisor

**[N]** It's worth checking the derived margins against the classic 45–75-character-per-line measure guideline, rather than assuming n=12 is compatible with it by coincidence.

At S0 = 11pt with an illustrative average character width of 0.5em: per-character width ≈ 5.5pt. For a 66-character target line: target text width ≈ 66 × 5.5pt = 363pt ≈ 128.0mm.

Solving `text_width = W(n−2)/n = target` for n:

```
n = 2W / (W − target) = 420 / (210 − 128.0) = 420 / 82.0 ≈ 5.12
```

**Interpretation:** hitting a true 66-character measure on a single full-width A4 column would require n ≈ 5.12 — margins of roughly **41mm per side**, over a third of the page width consumed by margin alone. This is not a call to shrink n; it's a demonstration that the classical measure guideline is structurally incompatible with a single full-width column on A4 at any margin a usable one-page reference document could actually afford. It confirms, rather than undermines, why this spec treats résumé bullets as exempt from that guideline (§1's reading-mode argument): they're discrete, mostly one-or-two-line fragments read in scanning mode, not sustained continuous prose. If a hard 60–72-character measure were a genuine requirement, the honest fix is a true multi-column body layout, not forcing n toward an unusable extreme — flagged here as a possible future-version direction, not something this version attempts.

---

## 4. Row Geometry — Right-Flush Dates

**[N]** A résumé entry is a row, not two independent columns: role/company left-aligned, date range right-flush against the text block's right margin, same baseline. (An earlier draft of this spec used a separate left-hand date column; that was withdrawn — right-flush-same-line is the standard convention for this document's register and is the only version this document now specifies.)

**[C]** Representative date-string convention: year-only ranges (`2019–2021`). A month-inclusive convention (`Jun 2019 – Aug 2021`) requires re-running the computation below with the longer string.

**Reserved zone** — space kept clear on the right so a long title/company string never collides with the date:

```
date_reserved_width = ceil( Σ(glyph advance widths, tabular lining figures, at S0) / (u/2) ) × (u/2)
```

**Build-Time Glyph Query Protocol [N]:** manual/illustrative measurement is not sufficient for a value this load-bearing — it must be extracted, not eyeballed:

- Shape the exact representative glyph sequence (e.g. `U+0032 U+0030 U+0031 U+0039 U+2013 U+0032 U+0030 U+0032 U+0031` for "2019–2021") using HarfBuzz (`hb-shape`) or `opentype.js`, against the actual chosen font file, with the tabular-lining feature set active.
- Sum the returned advance widths, scaled to S0.
- Write the result once into compiled CSS as a static custom property (`--date-reserved-width`) — this is a typeface constant, computed once at build time, not runtime or per-element data.

**[E — illustrative placeholder, pending real extraction]** At S0 = 11pt, using typical text-weight-font figures (tabular digit ≈ 0.6em ≈ 6.6pt, en dash ≈ 0.5em ≈ 5.5pt): for "2019–2021" (8 digits + 1 en dash), Σ ≈ 8(6.6) + 5.5 = 58.3pt → rounded up to the nearest u/2 (7pt) multiple → **63pt (22.2mm)**. This must be re-measured against the real chosen typeface before use.

**[C]** Gutter between title/company text and the reserved zone: **u/2 = 7pt**.

```
title_max_width = text_width − date_reserved_width − gutter
```

Worked example (A4): 496.06pt − 63pt − 7pt ≈ 426.06pt ≈ **150.2mm**.

**Title-overflow behavior [N]:** the reserved-zone math implies a too-long title wraps to a second line before ever colliding with the date. That must be specified explicitly, not left implicit:

```css
.entry-title {
  overflow-wrap: normal; /* never break-word — a mid-word break here is worse than the overflow it prevents */
  /* no line-clamp, no ellipsis truncation: truncating a job title is a content error to flag, not a typographic one to paper over */
}
```

A title that still doesn't resolve within two lines is not a CSS problem — it's an overflow-validation failure (§20), surfaced for content editing (a shorter title/company string), exactly the way §20 already treats a section that doesn't fit the page.

**[C — v1.5.1]** Experience entries use a single-line header when it fits: **company** (semibold) + *role, city, country* (italic S0, middle band) + right-flush **date**, with **0.5u** title gap between company and role (`entryTitleGapU` → `--entry-title-gap`). When the company wraps or would collide with the date column, the header stacks to company + date on line 1 and role on line 2 (`.r-item-hdr--stacked`).

**[N]** Both the date column and the title text remain on the same baseline grid established in §5 — this is a sub-region of the same text block, not a separate typographic system.

---

## 5. Baseline Grid Lock

**[N]**
```
baseline_k = top_margin + k·u        (k = 0, 1, 2, …)   [u = 14pt]
```

**[N]** Any element set at a size other than S0 must have its leading rounded to the nearest integer multiple of u, or it desyncs every baseline beneath it for the rest of the page. Worked example: the name at 16pt (natural leading ≈ 17.6pt at a typical 1.1× display ratio) is forced to **2u = 28pt**, consuming two grid rows and re-entering sync cleanly at the next row.

**[N — real limitation]** No mainstream layout engine, CSS included, has a native "lock arbitrary element to baseline grid" primitive. This constraint is enforced by convention — every downstream value must actually be checked as a multiple of u — not guaranteed by any tool.

### 5a. Cap-Height Alignment — Baseline Geodesy

A real gap exists beyond simple line-box locking: CSS `line-height` distributes "half-leading" above and below a glyph based on a font's internal ascent/descent metrics, so two fonts — or two sizes of the same font — at the same declared size/leading do not necessarily place their cap-height or baseline at visually identical positions relative to the line box. The grid-lock above constrains the *line box*, not the glyph's actual ink position within it.

**[N]** The current, real CSS solution is `text-box-trim`/`text-box-edge` (CSS Inline Layout Level 3), which trims a text block's box directly to font-provided metrics (e.g. cap-height at the top, alphabetic baseline at the bottom) rather than to the raw line-box:

```css
.name, .section-label, li {
  text-box-trim: trim-both;
  text-box-edge: cap alphabetic;
}
```

**[N — verified support]** Shipped in Chrome/Edge (133+) and Safari (18.2+); not yet Baseline because Firefox has not implemented it as of mid-2026. Degradation is graceful — unsupported browsers simply retain the old line-box leading (a few extra points of vertical space), not a broken layout.

**Fallback for non-supporting engines** — extract `sCapHeight`/`sTypoAscender` from the font's OS/2 table via the same HarfBuzz/`opentype.js` build-time protocol as §4, and bake the correction into a static custom property, used only as a polyfill:

```css
@supports not (text-box-trim: trim-both) {
  .name {
    /* --cap-offset-s2 baked at build time from the real font's OS/2.sCapHeight */
    margin-top: calc(-1 * var(--cap-offset-s2, 0pt));
  }
}
```

---

## 6. Optical Alignment (Hanging Punctuation)

**[N]** Bullets and other line-initial marks are optically lighter than letterforms at the same coordinate origin, because their ink occupies less of their advance width than a full letter does. The correct basis for the hang offset is the glyph's **left side bearing (LSB)** — the gap between the glyph's nominal origin and where its ink actually begins — extracted via the same build-time protocol as §4, not estimated by a generic advance-minus-ink midpoint formula (which is a poor fit for asymmetric glyphs like a bullet):

```
hang_offset = LSB(glyph)      [extracted from hmtx/glyf tables via HarfBuzz/opentype.js; static per typeface, expressed in em]
```

Rounded to the nearest 0.01em before use, to avoid sub-pixel drift that can produce a faint, inconsistent blur on LCD/subpixel-rendered screens.

**[N — scope]** This applies to the line-initial bullet marker only. The en dash inside a date range (§4, §12) is never a hanging-punctuation candidate — it sits mid-string, never at a line edge. The en-dash rule in §12 concerns correct character choice (en dash vs. hyphen-minus), not position; the two shouldn't be conflated.

**[C — v1.5.1 packed composition]** Bullet text is inset **0.75u** (`bullet.indentU` → `--bullet-indent`). The marker sits in that column, right-aligned with a **0.2em** text gap (`bullet.textGapEm` → `--bullet-text-gap`, default 0.2em), then hangs outward by a scaled LSB offset (`bullet.hangScale` × extracted `--hang-bullet`) so wrapped lines align flush with the first line's text:

```css
li {
  padding-left: var(--bullet-indent);
  margin-left: calc(-1 * var(--hang-bullet));
}
li::before {
  left: calc(-1 * var(--hang-bullet));
  width: var(--bullet-indent);
  text-align: right;
}
```

**[N — implementation note]** Advanced, typed `attr()` (allowing `attr(name type(<length>))` on arbitrary CSS properties, not just `content`) is real — shipping in Chrome/Edge 133+ and Safari 18.2+ — but not yet Baseline (no Firefox support as of mid-2026), and more importantly it reads values from HTML *attributes* on an element, not from a font's binary tables. There is no mechanism by which `attr()` reaches into a font file. Since LSB is a typeface constant, not per-element data, the correct implementation is the same static build-time custom property approach as §4:

---

## 7. Figure Treatment (Tabular vs. Oldstyle)

**[N]** Two figure contexts exist on this page and they take different figure styles, and font defaults must be overridden explicitly per context rather than relied upon:

| Context | Rule | Rationale |
|---|---|---|
| Date range (right-flush, §4) | **Tabular, lining** | Fixed advance width needed for visual alignment down the page |
| Numeral inside bullet prose (e.g. "led a team of 12") | **Oldstyle, proportional** | Matches lowercase x-height rhythm; lining figures at cap-height "shout" inside a sentence |

```css
.entry-date { font-variant-numeric: tabular-nums lining-nums; }
body        { font-variant-numeric: oldstyle-nums proportional-nums; }
```

---

## 8. Tracking as a Function of Size

**[E]** No closed-form physical or perceptual law connects tracking to point size — stated plainly rather than dressed as derived math. Long-standing type-design practice (historically hand-adjusted per master in metal type, now often interpolated via a font's optical-size axis):

| Size band | Direction | Practical range |
|---|---|---|
| Display (L2, 16pt) | Negative (tighten) | −0.01em to −0.02em |
| Body (L0, 11pt) | Neutral | 0 (as designed) |
| Small-caps section labels (L0, tracked) | Positive (open up) | +0.04em to +0.08em |

**[N]** If the chosen typeface has a genuine optical-size axis, registering the correct optical-size value at each size is preferable to a manual tracking hack — the font's own interpolated masters encode this relationship more correctly.

---

## 9. Hierarchy: One Variable Per Transition

**[N]** Elite typographic hierarchy changes exactly one lever per level transition — size, or weight, or position — rarely two at once, never three. Spending four levers (bold + larger + colored + tracked) to do one job's worth of differentiation is the failure mode this rule exists to prevent, and it's also what keeps the page's ink density (§13) flat.

| Transition | Lever changed | Held constant |
|---|---|---|
| Body → Title line | Size only | weight, tracking, case |
| Title line → Name | Size only | weight, tracking, case |
| Body → Section label | Case + tracking only | size, weight, color |
| Bullet body → Company/role line | Weight only | size, case, tracking |

**Explicit weight scale:**

| Element | Weight | CSS value |
|---|---|---|
| Body / bullets | Regular | 400 |
| Title line | Regular | 400 |
| **Name** | **Regular** | **400** |
| Section label | Regular | 400 |
| Company / Role line | Semibold | 600 |

**[C — a stated, not silent, consequence]** Per the one-lever rule, the name is set in the same weight as body text — size alone carries its hierarchy level (14pt → 16pt across the modular scale, §2). This runs against a common convention (bolding the name for a hard anchor) and is a legitimate point of override: a reviewer prioritizing a stronger top-of-page anchor could reasonably bold it, accepting that doing so spends a second lever exactly where §13's flat-grey-value goal matters most — and, per §13a, would also relax the applicable WCAG contrast requirement from 4.5:1 to 3:1, since 16pt-bold crosses into "large text."

**[C — named explicitly, not just absent]** **Copyfitting is deliberately rejected.** Professional directory and annual-report typesetting sometimes micro-adjusts tracking or size per entry to make uneven content fill uniform space. This spec does not do that: every entry at a given hierarchy level renders with identical size, weight, and tracking — no entry is quietly compressed to fit. An entry that doesn't fit is an overflow-validation failure (§4, §20), resolved by editing content, not by a typographic escape hatch that would make two visually-identical-looking entries actually be set differently underneath. This extends the one-lever discipline from *across* hierarchy levels to *within* a level, across every entry.

---

## 10. Text Alignment, Justification, and Paragraph Setting

**[C, with rationale]** Body text is **flush-left / ragged-right**, stated explicitly rather than left to a default. Justified text on the ~150mm body/title column at 11pt would force uneven word-spacing to hit a hard right edge, directly undermining the flat grey value §13 exists to protect. This matters less for genuinely short bullets (which often don't reach the right edge) and matters a great deal if a continuous-prose block is present.

```css
body { text-align: left; }
```

**[N]** Widows and orphans, beyond what `text-wrap: pretty` covers:

```css
body { widows: 2; orphans: 2; }
```

Support is patchy across engines but the property should still be declared — a harmless no-op where unsupported, a real improvement where it is. `text-wrap: pretty` is not a substitute: it addresses orphaned words within a paragraph's last lines, not orphaned/widowed *lines* stranded at a block boundary (e.g. a lone bullet stranded at the bottom of a section).

**[C]** **Hyphenation: off.**

```css
body { hyphens: none; }
```

Rationale: this is a dense reference document read in short scanning bursts, not sustained prose — hyphenated line-breaks read as visual noise against that goal, and at the widths involved (§4's ~150mm title zone, full-width bullets) hyphenation buys little the way it would in a genuinely narrow column. If a specific long word forces an awkward break, that's the same overflow-validation signal as §4's title-overflow case, not a hyphenation problem to solve silently.

---

## 11. Vertical Rhythm of Section Labels and Entries

**[C — v1.5.1 packed composition]** The table below tightens v1.5 defaults to match a dense one-page reference layout while keeping the same section model (tracked uppercase label, **rule below label**). Values are authored in `config/typesetting.json` → `rhythm` and projected to CSS custom properties.

**[N]** The baseline grid (§5) locks *where* a line can sit but not *how much air* precedes a given element — that has to be stated separately, and stated unconditionally:

| Position | Space (v1.5.1) | Applies |
|---|---|---|
| Before a section label (e.g. EXPERIENCE, EDUCATION) | **1u (14pt)** — **0.5u** air / label / **0.5u** to rule | Unconditionally |
| Section label → first line of content | **0.5u (7pt)** | Unconditionally |
| Role/project lead-in → first bullet | **0.25u (3.5pt)** | When bullets exist |
| Between bullets within the same role | **0.25u − 1pt (2.5pt)** | When bullets exist; wrapped lines inside a bullet use **1u − 1pt (13pt)** leading |
| **End of any entry → next entry** | **0.5u (7pt)** | **Unconditionally — with or without bullets** |

The last row is load-bearing (§0a): an entry with zero bullets gets exactly the same trailing space as an entry with five — there is no content-dependent branch in this rule.

A divider, if present (§16), subdivides the 1u pre-label budget rather than adding to it.

```css
.r-sec { margin-top: var(--pre-sec-margin); }
.r-lbl { margin-bottom: var(--label-gap); padding-bottom: var(--pre-sec-pad); border-bottom: 0.5pt solid var(--rule-color); }
.entry { margin-bottom: var(--entry-gap); }
.entry:last-of-type { margin-bottom: 0; }
.role + ul { margin-top: var(--lead-in-gap); }
li + li { margin-top: var(--bullet-gap); }
```

---

## 12. Micro-typography Floor

**[N]** Unicode correctness, not aesthetics:

- En dash `U+2013` for ranges (`2019–2021`) — never hyphen-minus `U+002D`
- True typographic apostrophe `U+2019` (’) — never the straight quote `U+0027`
- Non-breaking space `U+00A0` between elements that must not separate across a line break: initials (`J.\u00A0Q.\u00A0Public`), a number and a word/unit it modifies (`12\u00A0years`)
- True small caps (the font's own `smcp` glyphs) — never scaled capitals, which thin out under magnification and mismatch the stroke weight of real text around them
- Ligatures (`fi`, `fl`, `ffi`, `ffl`) enabled where the typeface provides them

**Separator glyphs:** inline dividers (e.g. `Company | City, Country`) are the same optical-calibration problem as hanging punctuation (§6), not a separate ad hoc rule — they need symmetric, non-breaking spacing so the separator is never orphaned onto its own line:

```
Company\u202F|\u202FCity, Country
```

using **U+202F NARROW NO-BREAK SPACE** — a real Unicode character designed for exactly this: non-breaking, narrower than a full space.

**OpenType `case` feature:** small caps (`smcp`) resizes letterforms but doesn't reposition punctuation designed to sit against lowercase, not cap-height, text. If a section label is ever followed by a colon, dash, or parenthetical, the `case` feature repositions that punctuation to sit correctly against the small-caps' effective cap-height:

```css
.section-label { font-feature-settings: "case" 1; }
```

**[E — craft note, not a hard rule]** Content on this page may include an ampersand. Many text-optimized typefaces cut a distinct, more calligraphic ampersand even in their upright/roman style — a holdover from the glyph's historical ligature origin ("et"). Use the typeface's default upright ampersand as the baseline; if a stylistic-set alternate (`ss01` or similar) exists and reads as more considered against the surrounding roman text, that's a legitimate, typeface-specific refinement — verify per font rather than assume one exists.

---

## 13. Ink Density / Grey Value — a Testable Procedure

**[N — procedure is objective]** **[C — specific thresholds]**

1. Render the page to raster (300dpi).
2. Convert to greyscale luminance.
3. Apply a Gaussian blur. **[E]** σ tied to font metrics rather than a fixed pixel range: `σ = x-height × 0.75`. Tying σ to x-height is a genuine improvement over an arbitrary absolute pixel count (it scales with the actual rendered text rather than assuming one specific resolution); the 0.75 multiplier itself remains a free parameter, not derived.
4. Measure local luminance variance across the blurred image, excluding true whitespace margins.

**Color-aware case:** for any chromatic element (an accent color, the segment-line color in §16), naive greyscale desaturation is the wrong conversion — perceived lightness of a saturated color doesn't match its simple greyscale average. Use CIE L\*a\*b\* (a perceptually uniform space) with ΔE2000 as the difference metric instead of plain relative luminance. For a purely black-on-white page the two approaches converge closely; the distinction matters most exactly where color is introduced.

**[E — softened, not asserted as a hard physical constant]** A commonly cited just-noticeable-difference threshold is roughly 2.3 ΔE units for the older ΔE76 formulation; because ΔE2000 was calibrated to better match perceptual uniformity, some sources treat approximately 1 ΔE2000 unit as one JND. Both figures shift with viewing conditions and patch size. This spec adopts **σ(L\*) ≤ 2 ΔE2000 per 1cm² patch** as a workable, conservative, tunable target — not a verified physical law.

### 13a. Minimum Contrast Ratio

**[N]** Ink-density evenness (above) is a *relative* check — it says nothing about whether text is legible in absolute terms against its background. WCAG 2.x's Success Criterion 1.4.3 (Contrast — Minimum) states the actual requirement:

- **Normal text: minimum 4.5:1**
- **Large text: minimum 3:1** — defined as ≥18pt regular, or ≥14pt bold

**[N — a real interaction between two already-stated rules]** The name is set at 16pt (§2) and stays Regular weight by §9's one-lever rule. 16pt regular does **not** meet the 18pt-regular large-text threshold — so despite being the largest, most visually dominant element on the page, the name is formally "normal text," bound to the **stricter 4.5:1** ratio, not the 3:1 a reader might assume applies to the biggest thing on the page. If the name is ever bolded (§9's flagged override), it crosses into large-text territory at 16pt-bold and only needs 3:1 — meaning §9's weight decision and this section's contrast requirement are coupled in a way neither states in isolation.

---

## 14. Typeface Selection Criteria

**[N]** Required properties — typeface-agnostic; this spec requires the properties, not a specific font:

- A genuine optical-size axis (or true separate text/display masters, not one master scaled uniformly)
- True small caps
- Both oldstyle and lining figures, each in both tabular and proportional widths (4 total figure sets)
- Sufficient hinting quality at 9–11pt for a 300dpi print/PDF target
- A real italic (not a synthetic oblique/skew)
- Full Latin Extended-A/B glyph coverage, verified against the specific names/languages actually appearing on the page (§17) — a hard requirement for identity-bearing text (a person's actual name), not a nice-to-have

Families in the optical-axis sans register (e.g. Söhne, National, Graphik) or serif text families with complete figure sets (e.g. Tiempos Text, Untitled Serif) are illustrative examples of typefaces meeting this bar, not prescriptions.

**[C — a named tension, not resolved by fiat]** An institutional convention might specify a general-purpose system font (e.g. Arial) for dyslexia-friendliness and universal availability. This is worth engaging honestly:

- **"System availability" is largely a non-issue for this deliverable.** Because the actual output is a PDF (§19), fonts are embedded — there is no dependency on a viewer's system having the font installed. This concern only re-applies if the deliverable is an unembedded Word document or a live webpage without web-font loading.
- **Dyslexia-friendliness is a real, separate axis, and it genuinely conflicts with this spec's density goals.** Accepted accessibility guidance (larger point size, ~1.5× leading, generous letter-spacing) is close to the opposite of this system's 11pt/λ≈1.27 setup, which is optimized for a fast recruiter scan, not sustained reading by a dyslexic reader. This spec does not pretend to resolve that — it's a genuine trade-off between two different documents' worth of goals.
- If accessibility-first rendering is a hard institutional requirement rather than a stylistic preference, that's a different brief and should be treated as such rather than forcing one document to serve both goals badly. If a single accessibility-leaning candidate is wanted regardless, **Atkinson Hyperlegible** (designed explicitly for low-vision/dyslexia legibility, freely embeddable, real italics) is the most defensible illustrative pick — with the caveat that it lacks the optical-axis/small-caps apparatus this spec otherwise requires, a deliberate trade-down in exchange for the accessibility goal.

### 14a. Print-Specific Optical Compensation

**[E — conditional on typeface support]** Printed ink spreads slightly (dot gain), making the same weight look marginally heavier on paper than on screen. The naive fix — bump `font-weight` for print — is wrong for this specific system: `wght` changes glyph advance widths, which would silently invalidate every build-time-extracted value in §4 and §6, undoing the whole point of formalizing that extraction as a fixed typeface constant.

The correct mechanism, where the chosen typeface supports it, is the registered OpenType **`GRAD` (Grade)** axis — designed specifically to adjust optical weight/density **without** altering spacing or advance widths:

```css
@media print {
  body { font-variation-settings: "GRAD" -30; } /* illustrative — calibrate per typeface, verify GRAD support before use */
}
```

**[C]** Not every typeface exposes a `GRAD` axis — this is a conditional enhancement, not a universal requirement, and should degrade to a no-op (not a broken declaration) on a font without it.

---

## 15. Digital-Native Layer: Color, Hyperlinks, Accessibility

Most résumés are read as PDFs on screen, not printed sheets — this layer exists so the spec isn't accidentally print-only by default.

**Color:** any accent color follows §13's relative-luminance/ΔE2000 discipline, not just a WCAG contrast minimum check — grey-value evenness and legibility contrast are two different, both-necessary checks (§13a).

**Hyperlinks:** a résumé PDF typically contains clickable email, portfolio, and LinkedIn links. Browser/PDF-viewer default styling (blue text, full underline) is a grey-value intrusion that fights everything §13 protects.

```css
a { color: inherit; text-decoration: none; }
a:hover, a:focus { text-decoration: underline; }
```

**Accessibility tagging:** a tagged PDF's logical structure should reflect semantic hierarchy independent of visual type scale — the name is `H1`, section labels are `H2`, regardless of the fact that a small-caps section label is visually the *same size* as body text (§9's one-lever rule). Reading order must follow logical sequence (role → date → body, grouped per entry), not raster position, particularly important given §4's right-flush date placement. This described requirement has an actual formal name: **PDF/UA (ISO 14289-1)**, the accessibility standard governing tagged-PDF structure, reading order, and semantic hierarchy — citing it precisely is the difference between "tag it properly" and pointing at the document that defines what "properly" means.

---

## 16. Segment Lines / Rules

**[C]** A hairline divider between sections, if used:

- **Weight:** 0.5pt — deliberately lighter than body text's stroke weight, so it never reads as a dark ink patch under §13's blur test.
- **Color:** not pure black. **[N, given §13's goal]** Target the page's own measured median grey value (from the §13 procedure) rather than 0% luminance — a full-black rule is the single highest-contrast mark on the page and spikes local ink density exactly where it's least wanted.
- **Position:** subdivides the existing 2u pre-section gap (§11) rather than adding to it — sits at exactly 1u below the previous content and 1u above the next section label.
- **Width:** full text-block width.

```css
.section-divider { border: none; border-top: 0.5pt solid var(--rule-color); margin: var(--u) 0 0 0; }
```

---

## 17. Locale & Character-Set Considerations

**[N]**

- **Date format:** unambiguous form (`2019–2021`, or `Jan 2019` if month precision is needed) — never all-numeric (`01/2019`), which is genuinely ambiguous between DD/MM and MM/DD reading conventions internationally.
- **Phone numbers:** international format per the general convention documented in ITU-T Recommendation E.123 — country code plus grouped digits (`+44 20 1234 5678`), groups joined by the same non-breaking space established in §12, so the number can't split across a line break.
- **Diacritics:** names and place names with accented characters use precomposed Unicode (NFC normalization), never ASCII transliteration or combining-character workarounds. The chosen typeface's Latin Extended-A/B coverage (§14) must be verified against the specific characters actually present before the typeface is finalized, not after.
- **Out of scope by design:** address ordering, honorific placement, and similar content conventions vary by country/institution and are a localization/content decision, not a typesetting one.

---

## 18. Fixed-Page Rendering vs. Responsive Reflow

**[N]** This document has exactly one valid physical geometry (§3, A4). It has **no content-reflow breakpoints, by design** — every rule from §1 onward (measure, leading, hang calibration, baseline grid, §4's reserved-zone math) is calibrated against one specific column width. Reflowing content at a different width would silently invalidate all of them at once. Applying conventional responsive-web breakpoints to a fixed-page print document is a category error — it imports a solution built for a document class that has no single correct width into one that, by definition, has exactly one.

**Screen rendering is a proofing surface, not the deliverable.** `@media screen` rules should only ever affect *preview scale*, never internal layout, sizing, or spacing:

```css
@media screen and (max-width: 210mm) {
  .page-wrapper {
    transform: scale(min(1, calc(100vw / 210mm)));
    transform-origin: top left;
  }
}
```

This is the same principle a PDF viewer uses on a phone: uniform zoom, never reflow. Any padding on a screen-preview wrapper is cosmetic only and must be zeroed out in the actual print/export path (§19) — it must never substitute for the `@page` margins derived in §3.

---

## 19. Print/PDF Determinism — the Purist Objection

Rendering via a browser engine and freezing to PDF is a real compromise, not a purist solution, and deserves to be named as one.

**Actual sources of nondeterminism:**

1. **Browser print-dialog defaults.** A human-facing print dialog can silently inject its own margins and headers/footers on top of `@page` unless explicitly disabled — a UI-layer risk CSS alone cannot close.
2. **Cross-engine and cross-version rendering drift.** Font hinting and subpixel rendering differ across engines (Skia/Chromium, CoreText/Safari, FreeType elsewhere) and can drift across versions of the same engine — a page frozen today isn't guaranteed bit-identical if regenerated from the same source months later on an updated browser, which directly threatens the calibrated values in §6 and §12.
3. **Font substitution risk** if fonts aren't explicitly embedded.

**The actual mitigation:** bypass the human-facing print dialog entirely. Use a headless browser's programmatic PDF-export API (e.g. Puppeteer's or Playwright's `page.pdf()`), passing exact physical dimensions and zero margins as parameters — removing failure mode #1 completely, since no human touches a settings UI. Pin the exact engine version used for generation rather than regenerating against "whatever the current browser is" later, and self-host every font file via `@font-face`.

**The residual, honestly unclosable gap:** even with a pinned engine and embedded fonts, the deliverable still depends on one specific browser engine's text-layout implementation, with no independent verification that its line-breaking, kerning, and hinting match what a non-browser PDF pipeline (a dedicated PDF library, or LaTeX, both of which place glyphs directly) would produce. This is a genuine, structural argument for a purist to prefer a non-browser pipeline for a permanently reproducible, audit-grade deliverable — even though CSS remains clearly better on OpenType feature ergonomics and iteration speed. That trade-off is real and is not resolved in CSS's favor by default here.

**The mitigation above is exactly what an actual formal standard exists to guarantee: PDF/A (ISO 19005)**, the archival-PDF standard requiring embedded fonts and no external/dynamic dependencies for permanent reproducibility — distinct from PDF/UA (§15, accessibility). This section's argument has effectively been "the deliverable should conform to PDF/A" without ever naming it until now.

**Practical verdict:** a résumé is regenerated rarely and reviewed by a human before every send, so pin-and-freeze via a headless engine with embedded fonts is a *defensible practical choice* under these specific constraints — stated as exactly that, not a mathematically settled one.

**Metadata note:** since the primary export path is Chromium's programmatic print-to-PDF, the source document's `<title>` element populates the PDF's Title metadata field directly:

```html
<title>Kartavya Jharwal — Résumé</title>
```

A small, zero-effort detail most naive HTML→PDF pipelines leave blank or generic.

---

## 20. Pagination & Overflow Validation

**[N]** This document targets exactly one page (§3), so "page-breaking" here means overflow validation, not general multi-page pagination — though the mechanism extends directly to a genuine multi-page CV if content requires it.

**Atomic unit rule:** each `.section` and each `.entry` (role + its bullets) is a non-divisible block for break purposes:

```css
.entry, .section { break-inside: avoid; }
```

`break-inside` is the current CSS Fragmentation property; `page-break-inside` is the legacy alias, still broadly supported but not the one to author against going forward.

**Overflow check, not true pagination:** compute remaining vertical space from the current baseline to the bottom margin; compare against what a new section needs (label + 2u + shortest possible entry). If it doesn't fit on a single-page target, the correct response is flagging the overflow for content editing — not silently forcing a second page, which defeats the one-page brief entirely. This requires a real pre-layout measurement pass (the DOM `Range` API / `getBoundingClientRect()`, or an equivalent headless-layout pass), not an estimate from character counts. The same check applies to §4's title-overflow case: a title that doesn't resolve within two lines is the same class of problem, flagged the same way.

**If a genuine multi-page CV is the actual target**, the same atomic-unit and remaining-space check becomes real pagination logic, and a proper pre-layout measurement pass — effectively a page-breaking optimizer, since browser-native CSS Paged Media heuristics aren't reliable enough to trust unsupervised — is the right call rather than over-engineering.

---

## 21. Reference Implementation Layer (CSS) — Complete

```css
@page { size: A4; margin: 0; }

:root {
  /* Base unit and derived grid, §1–§2 */
  --u: 14pt;
  --s0: 11pt; --s1: 13pt; --s2: 16pt;

  /* Margins, A4, n = 14, §3 */
  --margin-x: 15mm; --margin-top: 11.6mm; --margin-bottom: 30.9mm;

  /* Row geometry, §4 */
  --date-reserved-width: 63pt;  /* placeholder — replace with build-time HarfBuzz/opentype.js output */
  --col-gutter: 7pt;

  /* Tracking, §8 */
  --track-display: -0.015em; --track-body: 0; --track-label: 0.06em;

  /* Hanging punctuation, §6 */
  --hang-bullet: 0.08em;        /* placeholder — replace with real LSB extraction */
  --bullet-indent: 14pt;        /* 1u marker column */

  /* Weight scale, §9 */
  --weight-regular: 400; --weight-emphasis: 600;

  /* Segment lines, §16 */
  --rule-color: #8c8c8c;        /* placeholder — calibrate to measured median grey, §13 */
}

@font-face {
  font-family: "ChosenText";
  src: url("./fonts/chosen-text.woff2") format("woff2");
  font-display: block; /* never allow fallback substitution mid-print */
}

body {
  font-family: "ChosenText", serif; /* confirm actual chosen family meets §14 before finalizing */
  font-size: var(--s0);
  line-height: var(--u);
  font-kerning: normal;
  font-variant-ligatures: common-ligatures;
  font-variant-numeric: oldstyle-nums proportional-nums;
  text-align: left;
  widows: 2; orphans: 2;
  hyphens: none;
}

@media print {
  body { font-variation-settings: "GRAD" -30; } /* §14a — illustrative, verify GRAD axis support */
}

/* §20 — atomic units */
.entry, .section { break-inside: avoid; }

/* §11 — unconditional entry spacing, fixes the zero-bullet bug in §0a */
.entry { margin-bottom: var(--u); }
.entry:last-of-type { margin-bottom: 0; }

/* §4 — right-flush date row geometry */
.entry-header { display: flex; justify-content: space-between; align-items: baseline; }
.entry-title {
  flex: 1 1 auto;
  max-width: calc(100% - var(--date-reserved-width) - var(--col-gutter));
  font-weight: var(--weight-emphasis);
  overflow-wrap: normal;
}
.entry-date {
  flex: 0 0 auto; white-space: nowrap;
  font-variant-numeric: tabular-nums lining-nums;
  text-align: right;
}

/* §2, §5, §5a, §9, §13a — name */
.name {
  font-size: var(--s2);
  font-weight: var(--weight-regular); /* deliberate — §9; note the §13a contrast consequence */
  line-height: calc(var(--u) * 2);
  letter-spacing: var(--track-display);
  text-wrap: balance;
  text-box-trim: trim-both;
  text-box-edge: cap alphabetic;
}
@supports not (text-box-trim: trim-both) {
  .name { margin-top: calc(-1 * var(--cap-offset-s2, 0pt)); }
}

/* §9, §11, §12 — section labels */
.section-label {
  font-variant-caps: small-caps;
  font-feature-settings: "case" 1;
  letter-spacing: var(--track-label);
  font-weight: var(--weight-regular);
  margin-top: var(--u); /* halved from 2u when a divider is present, §16 */
}
.section-divider { border: none; border-top: 0.5pt solid var(--rule-color); margin: var(--u) 0 0 0; }

/* §6, §10, §5a — bullets */
li {
  padding-left: var(--bullet-indent);
  text-wrap: pretty;
  margin-left: calc(-1 * var(--hang-bullet));
  text-box-trim: trim-both;
  text-box-edge: cap alphabetic;
}

/* §15 — links */
a { color: inherit; text-decoration: none; }
a:hover, a:focus { text-decoration: underline; }

/* §18 — screen preview only, never affects export geometry */
@media screen and (max-width: 210mm) {
  .page-wrapper { transform: scale(min(1, calc(100vw / 210mm))); transform-origin: top left; }
}
```

```html
<!-- §19 — populates PDF Title metadata via the Chromium print-to-PDF pipeline -->
<title>Kartavya Jharwal — Résumé</title>
```

---

## 22. Known Limitations — Open for Review

1. **No true Knuth–Plass global paragraph optimization in CSS.** `text-wrap: pretty` only re-scores the last ~4 lines of a block, not the whole paragraph.
2. **No HZ-style micro-justification** (per-glyph width modulation, per Zapf/URW's hz-program) exists in CSS at all.
3. **§3's 1:2 footing ratio is an inherited aesthetic**, not re-derived from single-sheet geometry — should be re-checked by eye once real content (especially a heavy header) is set; a tighter ratio (1:1.5) is equally defensible.
4. **§4 and §6's numeric placeholders (date-reserved width, hang offset) are illustrative**, pending real build-time extraction against the final chosen typeface — the protocol is formalized, the numbers still aren't measured.
5. **The accessibility/density trade-off (§14) is named, not resolved** — this spec optimizes for scan speed, not sustained readability, and says so rather than pretending otherwise.
6. **Browser print-dialog override risk and cross-engine/cross-version rendering drift (§19) are real and not fully closable** from within a CSS+browser pipeline — a non-browser PDF-generation path remains the more defensible choice for a permanently audit-grade deliverable.
7. **`text-box-trim` (§5a) lacks Firefox support** as of mid-2026 — real gap, gracefully degraded via the `@supports` fallback, not silently broken.
8. **The ΔE2000 JND threshold (§13) is a tunable convention**, deliberately not asserted as a verified physical constant.
9. **The `GRAD` axis compensation (§14a) is conditional on typeface support** and untested against the actual chosen font — illustrative value only.
10. **§13a's contrast requirement has not yet been checked against actual rendered colors** from any submitted render — a real, checkable gap, not a theoretical one.
11. **The §0a/§11 unconditional spacing fix has not yet been confirmed against a corrected render** — stated as a rule here, not yet visually verified as fixed.

---

## 23. References

- Robert Bringhurst, *The Elements of Typographic Style*
- Jan Tschichold, *The Form of the Book* (documents the Van de Graaf / Villard de Honnecourt canon)
- Jan Tschichold, *Asymmetric Typography* (German original *Typographische Gestaltung*, 1935; English translation by Ruari McLean, 1967)
- Josef Müller-Brockmann, *Grid Systems in Graphic Design*
- Karl Gerstner, *Designing Programmes* (1964, English translation) — the "morphological grid," relevant to §3–§4's *derived*, not fixed, grid logic
- Massimo Vignelli, *The Vignelli Canon* (2001) — the grid as rigid scaffold, not guide
- Kimberly Elam, *Typographic Systems* (2007) — structural frameworks beyond the modular grid, a named direction for future exploration
- Donald E. Knuth, *The Metafont Book* (1986) — parametric letterform construction, ancestor of computing with font metrics programmatically (§4, §6)
- D. E. Knuth & M. F. Plass, "Breaking Paragraphs into Lines," *Software: Practice and Experience*, 1981
- Hermann Zapf, writings on the URW hz-program
- MDN Web Docs, `text-box-trim` / `text-box-edge` / `@page` / CSS Paged wMedia specifications
- W3C, Web Content Accessibility Guidelines 2.x, Success Criterion 1.4.3 (Contrast — Minimum) — §13a
- ISO 14289-1 (PDF/UA) — accessible-PDF structural standard, §15
- ISO 19005 (PDF/A) — archival-PDF permanence standard, §19
- OpenType Font Variations specification, registered axis tags (`GRAD`) — §14a
- ITU-T Recommendation E.123 — international telephone number notation
- Unicode Standard Annex #15 — Unicode Normalization Forms (NFC)
