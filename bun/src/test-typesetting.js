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
assert(derived.marginXMm === 17.5, 'n=12 must yield 17.5mm side margins');
assert(derived.textWidthMm === 175, 'text width must be 175mm');
assert(Math.abs(derived.textHeightMm - 247.5) < 1e-9, `text height must be 247.5mm, got ${derived.textHeightMm}`);
assert(Math.abs(derived.marginTopMm - 16.5) < 1e-9 && Math.abs(derived.marginBottomMm - 33) < 1e-9, `1:2 footing must be 16.5/33mm, got ${derived.marginTopMm}/${derived.marginBottomMm}`);
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
assert(css.includes('--margin-x: 17.5mm'), 'CSS projection must emit derived margins');
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
assert(manifest.version === '4.005R', 'pinned Source Serif release must be 4.005R');
assert(manifest.license === 'OFL-1.1', 'OFL licence required');
assert(existsSync(resolve(ROOT, 'assets/fonts', manifest.licenseFile)), 'OFL text must be vendored');

for (const file of manifest.files) {
  const path = resolve(ROOT, 'assets/fonts', file.filename);
  assert(existsSync(path), `missing font ${file.filename}`);
  const bytes = readFileSync(path);
  assert(createHash('sha256').update(bytes).digest('hex') === file.sha256, `${file.filename} hash drifted`);
}

const ttf = fontkit.openSync(resolve(ROOT, 'assets/fonts/source-serif-4-text-regular.ttf'));
const woff2 = fontkit.openSync(resolve(ROOT, 'assets/fonts/source-serif-4-text-regular.woff2'));
assert(ttf.numGlyphs === woff2.numGlyphs, 'TTF/WOFF2 glyph counts must match');
assert(ttf.unitsPerEm === woff2.unitsPerEm, 'TTF/WOFF2 unitsPerEm must match');
const required = ['case', 'liga', 'lnum', 'onum', 'pnum', 'smcp', 'tnum'];
const features = new Set(ttf.availableFeatures || []);
for (const feature of required) {
  assert(features.has(feature), `Text Regular missing ${feature}`);
}

const tokens = typesettingCustomProperties(derived);
assert(tokens['--edu-detail-inset'] === '0pt', 'education inset default is 0');
assert(Number(tokens['--col-gutter'].replace('pt', '')) === 7, 'gutter is u/2');

const cssFile = readFileSync(resolve(ROOT, 'assets/css/typesetting.css'), 'utf8');
assert(cssFile.includes('--u: 14pt'), 'committed typesetting.css must match canon');

const style = readFileSync(resolve(ROOT, 'assets/css/style.css'), 'utf8');
assert(!style.includes('font-optical-sizing: none'), 'optical sizing must be on');
assert(style.includes('font-display: block'), 'résumé faces must use font-display:block');
assert(!style.includes('source-serif-4-display'), 'Display optical size is unused at résumé sizes');
assert(style.includes('border-top: 0.5pt solid var(--rule-color)'), 'section rule subdivides 2u');
assert(style.includes('left: calc(-1 * var(--hang-bullet))'), 'bullet hang uses extracted LSB');
assert(!style.includes('.edu-details {\n  margin-left: var(--u);'), 'education must not steal a full u inset');

console.log('✓ Typesetting unit, canon, font, and CSS projection tests passed');
