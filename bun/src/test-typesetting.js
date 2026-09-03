#!/usr/bin/env bun
/** Unit tests for the TYPESETTING.md v1.5 canon, units, fonts, and CSS projection. */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';
import {
  contrastRatio,
  deriveCanon,
  loadCanon,
  mmToCssPx,
  mmToPt,
  ptToCssPx,
  renderTypesettingCss,
  typesettingCustomProperties
} from './typesetting.js';
import { formatDateRange, formatExpectedDate, formatPhone, nbsp, typograph, NNBSP_PIPE } from './microtype.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const canon = loadCanon();
const derived = deriveCanon(canon);

assert(derived.uPt === 14, 'u must be 14pt');
assert(Math.abs(derived.s0RawPt - 11) < 0.01, `S0 raw should be ~11pt, got ${derived.s0RawPt}`);
assert(derived.s0Pt === 11 && derived.s1Pt === 13 && derived.s2Pt === 16, 'in-use scale must be 11/13/16');
assert(derived.namePt === 20, 'name size must be 20pt');
assert(derived.rhythm.labelToContentU === 0.5, 'label gap rhythm must be 0.5u');
assert(derived.marginXMm === 15, 'n=14 must yield 15mm side margins');
assert(derived.textWidthMm === 180, 'text width must be 180mm');
assert(Math.abs(derived.marginTopMm - 11.571428571428571) < 1e-6 && Math.abs(derived.marginBottomMm - 30.857142857142858) < 1e-6, `0.75:2 footing at n=14 must be ~11.57/30.86mm, got ${derived.marginTopMm}/${derived.marginBottomMm}`);
assert(ptToCssPx(14, derived.units) === 14 * (derived.units.cssPxPerIn / derived.units.ptPerIn), '14pt conversion must use 96/72');
assert(Math.abs(ptToCssPx(14, derived.units) - 18.666666666666664) < 1e-9, '14pt ≈ 18.666 CSS px');
assert(mmToPt(25.4, derived.units) === 72, '25.4mm = 72pt');
assert(Math.abs(mmToCssPx(210, derived.units) - 793.7007874015748) < 1e-9, 'A4 width CSS px');

const css = renderTypesettingCss(derived, {
  dateReservedPt: 70,
  bulletLsbEm: 0.04,
  capOffsetPt: 1.2,
  xHeightEm: 0.48,
  eduAfterColonEm: 0.25,
  eduColonHangEm: 0,
  hasGrad: false
});
assert(css.includes('--u: 14pt'), 'CSS projection must emit 14pt u');
assert(css.includes('--s0: 11pt') && css.includes('--s1: 13pt') && css.includes('--s2: 16pt'), 'CSS projection must emit in-use scale');
assert(css.includes('--name-size: 20pt'), 'CSS projection must emit name size');
assert(css.includes('--pre-sec-margin'), 'CSS projection must emit rhythm tokens');
assert(!css.includes('--u: 11.7pt'), 'compressed u must not reappear');

const paperInk = '#111313';
const paper = '#ffffff';
assert(contrastRatio(paperInk, paper) >= 4.5, 'name/body ink must meet WCAG 4.5:1 against paper');

assert(formatDateRange('2019-01', '2021-08') === 'Jan 2019\u2013Aug 2021', 'month-inclusive dates use en dash');
assert(formatDateRange('2024-01', '') === 'Jan 2024\u2013Present', 'open ranges use Present');
assert(formatExpectedDate('2026-05') === `Expected${nbsp}May 2026`, 'expected dates use NBSP');
assert(formatPhone('+44 7762 941472') === `+44${nbsp}7762${nbsp}941472`, 'phone groups use NBSP');
assert(typograph("Kartavya's") === 'Kartavya\u2019s', 'typographic apostrophe');
assert(NNBSP_PIPE === '\u202F|\u202F', 'education/contact separator');

const manifestPath = resolve(ROOT, 'assets/fonts/font-manifest.json');
assert(existsSync(manifestPath), 'font manifest is required; run bun run fonts:sync');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert(manifest.family === 'Newsreader', 'implementation face must be Newsreader');
assert(manifest.version === '1.003', 'pinned Newsreader release must be 1.003');
assert(manifest.license === 'OFL-1.1', 'OFL licence required');
assert(existsSync(resolve(ROOT, 'assets/fonts', manifest.licenseFile)), 'OFL text must be vendored');

for (const file of manifest.files) {
  const path = resolve(ROOT, 'assets/fonts', file.filename);
  assert(existsSync(path), `missing font ${file.filename}`);
  const bytes = readFileSync(path);
  assert(createHash('sha256').update(bytes).digest('hex') === file.sha256, `${file.filename} hash drifted`);
}

const roman = fontkit.openSync(resolve(ROOT, 'assets/fonts/newsreader-variable-roman.ttf'));
const italic = fontkit.openSync(resolve(ROOT, 'assets/fonts/newsreader-variable-italic.ttf'));
assert(roman.unitsPerEm === italic.unitsPerEm, 'Newsreader roman/italic unitsPerEm must match');
const axes = Object.keys(roman.variationAxes || {});
assert(axes.includes('opsz') && axes.includes('wght'), 'Newsreader must expose opsz and wght axes');
assert(!axes.includes('GRAD'), 'Newsreader does not ship a GRAD axis; print grade stays gated off');
const required = ['case', 'liga', 'pnum', 'tnum'];
const features = new Set(roman.availableFeatures || []);
const italicFeatures = new Set(italic.availableFeatures || []);
for (const feature of required) {
  assert(features.has(feature), `Newsreader roman missing ${feature}`);
}
assert(italicFeatures.has('liga'), 'Newsreader italic must expose ligatures');
const romanAtS0 = roman.getVariation({ wght: 400, opsz: derived.s0Pt });
const italicAtS0 = italic.getVariation({ wght: 400, opsz: derived.s0Pt });
const liningRun = romanAtS0.layout('1', ['tnum', 'lnum']);
const oldstyleRun = romanAtS0.layout('1', ['onum', 'pnum']);
assert(liningRun.glyphs[0].id !== oldstyleRun.glyphs[0].id, 'Newsreader must support distinct lining and oldstyle figure sets');
const italicGlyph = italicAtS0.glyphForCodePoint(0x0061);
const romanGlyph = romanAtS0.glyphForCodePoint(0x0061);
assert(italicGlyph.path.toSVG() !== romanGlyph.path.toSVG(), 'Newsreader italic must differ from roman');

const tokens = typesettingCustomProperties(derived);
assert(tokens['--edu-detail-inset'] === '7pt', 'education fact inset is 0.5u');
assert(Number(tokens['--col-gutter'].replace('pt', '')) === 7, 'gutter is u/2');

const cssFile = readFileSync(resolve(ROOT, 'assets/css/typesetting.css'), 'utf8');
assert(cssFile.includes('--u: 14pt'), 'committed typesetting.css must match canon');
assert(cssFile.includes(':root, .sheet'), 'typesetting tokens must bind to the sheet surface');

const style = readFileSync(resolve(ROOT, 'assets/css/style.css'), 'utf8');
assert(style.includes('font-optical-sizing: none'), 'explicit opsz axis must replace auto optical sizing');
assert(style.includes('font-display: block'), 'résumé faces must use font-display:block');
assert(!style.includes('source-serif-4-display'), 'legacy Source Serif display face must not remain');
assert(!style.includes('literata-variable-roman'), 'legacy Literata face must not remain');
assert(style.includes('newsreader-variable-roman.ttf'), 'résumé must load Newsreader variable roman');
assert(style.includes('font-variation-settings: var(--resume-variation-text)'), 'sheet must pin Newsreader text variation');
assert(style.includes('border-bottom: 0.5pt solid var(--rule-color)') && style.includes('.r-lbl'), 'section rule must sit below label');
assert(style.includes('.exp-block .r-item-lead'), 'experience header must wrap company and role in a lead band');
assert(style.includes('.proj-block .r-item-lead'), 'project header must wrap name and engagement label in a lead band');
assert(style.includes('.r-item-hdr--stacked'), 'long experience titles must stack role below company');
assert(style.includes('column-gap: var(--entry-title-gap)'), 'company and role must have a visual title gap');
assert(style.includes('.r-sec-body') && style.includes('gap: var(--entry-gap)'), 'entry separation must use flex gap on section bodies');
assert(style.includes('text-align: center') && style.includes('.r-name'), 'name must be centered');
assert(style.includes('padding-left: var(--bullet-indent)'), 'bullets must use grid-locked hanging indent');
assert(style.includes('padding-right: var(--bullet-text-gap)'), 'bullet marker must use canon text gap');
assert(style.includes('line-height: var(--bullet-line)') && style.includes('.r-ul li'), 'bullets must use tightened line height');
assert(style.includes('margin-top: var(--bullet-gap)') && style.includes('.r-ul li + li'), 'bullet list gaps must use tightened rhythm');
assert(style.includes('left: calc(-1 * var(--hang-bullet))'), 'bullet marker must hang from extracted LSB');
assert(style.includes('text-transform: uppercase') && style.includes('.r-lbl'), 'section labels must use tracked uppercase without synthetic small caps');
assert(!style.includes('.edu-details {\n  margin-left: var(--u);'), 'education must not steal a full u inset');

console.log('✓ Typesetting unit, canon, font, and CSS projection tests passed');
