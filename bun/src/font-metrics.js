#!/usr/bin/env bun
/** Extract the typeface constants required by TYPESETTING.md v1.5. */

import * as fontkit from 'fontkit';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveCanon, loadCanon, renderTypesettingCss } from './typesetting.js';
import { formatDateRange, formatExpectedDate } from './microtype.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const BUILD = resolve(ROOT, '.build-cache');
const FONT_PATH = resolve(ROOT, 'assets/fonts/source-serif-4-variable-roman.ttf');
const TEXT_FONT_PATH = resolve(ROOT, 'assets/fonts/source-serif-4-text-regular.ttf');
const RESUME_PATH = resolve(ROOT, 'data/resume.json');
const REQUIRED_FEATURES = ['case', 'liga', 'lnum', 'onum', 'pnum', 'smcp', 'tnum'];

const canon = loadCanon();
const derived = deriveCanon(canon);

if (!existsSync(FONT_PATH) && !existsSync(TEXT_FONT_PATH)) {
  throw new Error('Pinned Source Serif files are missing. Run bun run fonts:sync');
}

const inspectionPath = existsSync(FONT_PATH) ? FONT_PATH : TEXT_FONT_PATH;
const baseFont = fontkit.openSync(inspectionPath);
const axes = baseFont.variationAxes || {};
const hasOpsz = Boolean(axes.opsz);
const hasWght = Boolean(axes.wght);
const hasGrad = Boolean(axes.GRAD);
const font = hasOpsz && hasWght
  ? baseFont.getVariation({ wght: 400, opsz: derived.s0Pt })
  : baseFont;
const features = new Set(baseFont.availableFeatures || []);
const missingFeatures = REQUIRED_FEATURES.filter(feature => !features.has(feature));

if (missingFeatures.length) {
  throw new Error(`Typeface is missing required OpenType features: ${missingFeatures.join(', ')}`);
}
if (!hasOpsz && !existsSync(TEXT_FONT_PATH)) {
  throw new Error('Typeface must expose an opsz axis or provide separate Text/Title masters.');
}

const resume = JSON.parse(readFileSync(RESUME_PATH, 'utf8'));
const dateSamples = [
  ...(resume.work || []).map(entry => formatDateRange(entry.startDate, entry.endDate)),
  ...(resume.education || []).map(entry => (
    entry.expected ? formatExpectedDate(entry.endDate) : formatDateRange(entry.startDate, entry.endDate)
  ))
];
const measuredDates = dateSamples.map(text => {
  const run = font.layout(text, ['tnum', 'lnum']);
  const units = run.positions.reduce((sum, position) => sum + position.xAdvance, 0);
  return { text, widthPt: (units / font.unitsPerEm) * derived.s0Pt };
});
const widestDate = measuredDates.sort((a, b) => b.widthPt - a.widthPt)[0];
const dateWidthPt = widestDate.widthPt;
const halfUnitPt = derived.uPt / 2;
const dateReservedPt = Math.ceil(dateWidthPt / halfUnitPt) * halfUnitPt;

const bullet = font.glyphForCodePoint(0x2022);
const bulletLsbEm = bullet.bbox.minX / font.unitsPerEm;
const colon = font.glyphForCodePoint(0x003A);
const colonAdvanceEm = colon.advanceWidth / font.unitsPerEm;
const colonRsbEm = (colon.advanceWidth - colon.bbox.maxX) / font.unitsPerEm;
const eduAfterColonEm = Math.max(0.18, colonRsbEm + 0.12) + (derived.optical.eduAfterColonEm || 0);
const eduColonHangEm = Math.max(0, -colon.bbox.minX / font.unitsPerEm) + (derived.optical.eduColonHangEm || 0);
const titleFont = hasOpsz && hasWght
  ? baseFont.getVariation({ wght: 400, opsz: derived.s2Pt })
  : font;
const capOffsetPt = ((titleFont.ascent - titleFont.capHeight) / titleFont.unitsPerEm) * derived.s2Pt;
const xHeightEm = font.xHeight / font.unitsPerEm;

const resumeText = JSON.stringify(resume).normalize('NFC');
const unsupportedCodePoints = [...new Set([...resumeText]
  .map(character => character.codePointAt(0))
  .filter(codePoint => codePoint > 0x7f && !font.hasGlyphForCodePoint(codePoint)))]
  .map(codePoint => `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`);

if (unsupportedCodePoints.length) {
  throw new Error(`Typeface does not cover resume code points: ${unsupportedCodePoints.join(', ')}`);
}

const metrics = {
  family: baseFont.fullName,
  inspectionPath: inspectionPath.slice(ROOT.length + 1).replaceAll('\\', '/'),
  unitsPerEm: font.unitsPerEm,
  variation: hasOpsz && hasWght ? { wght: 400, opsz: derived.s0Pt } : null,
  hasOpsz,
  hasWght,
  hasGrad,
  availableFeatures: [...features].sort(),
  dateSample: widestDate.text,
  dateMeasuredPt: Number(dateWidthPt.toFixed(3)),
  dateReservedPt,
  dateMeasuredFontUnits: Number((dateWidthPt / derived.s0Pt * font.unitsPerEm).toFixed(3)),
  bulletLsbEm: Number((bulletLsbEm + (derived.optical.hangBulletEm || 0)).toFixed(4)),
  bulletLsbEmRaw: Number(bulletLsbEm.toFixed(4)),
  capOffsetPt: Number(capOffsetPt.toFixed(2)),
  xHeightEm: Number(xHeightEm.toFixed(3)),
  colonAdvanceEm: Number(colonAdvanceEm.toFixed(4)),
  colonRsbEm: Number(colonRsbEm.toFixed(4)),
  eduAfterColonEm: Number(eduAfterColonEm.toFixed(4)),
  eduColonHangEm: Number(eduColonHangEm.toFixed(4)),
  unsupportedCodePoints
};

const css = renderTypesettingCss(derived, metrics);

mkdirSync(BUILD, { recursive: true });
writeFileSync(resolve(BUILD, 'font-metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);
writeFileSync(resolve(BUILD, 'typesetting.css'), css);
writeFileSync(resolve(ROOT, 'assets/css/typesetting.css'), css);

console.log(`✓ Extracted font metrics: date ${metrics.dateMeasuredPt}pt → ${metrics.dateReservedPt}pt, bullet LSB ${metrics.bulletLsbEmRaw}em`);
