#!/usr/bin/env bun
/** Canonical TYPESETTING.md v1.5 geometry. Single source of derived numbers. */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const CANON_PATH = resolve(ROOT, 'config/typesetting.json');

export function loadCanon(path = CANON_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function ptToCssPx(pt, units) {
  return pt * (units.cssPxPerIn / units.ptPerIn);
}

export function mmToPt(mm, units) {
  return mm * (units.ptPerIn / units.mmPerIn);
}

export function mmToCssPx(mm, units) {
  return mm * (units.cssPxPerIn / units.mmPerIn);
}

export function deriveCanon(canon = loadCanon()) {
  const { units, scale, page, tracking, weight, education, optical, faces, print } = canon;
  const s0RawPt = scale.uPt / scale.lambda;
  const s1RawPt = s0RawPt * scale.r;
  const s2RawPt = s0RawPt * scale.r * scale.r;
  const unitXMm = page.widthMm / page.n;
  const marginXMm = unitXMm;
  const textWidthMm = page.widthMm * (page.n - 2) / page.n;
  const textHeightMm = textWidthMm * (page.heightMm / page.widthMm);
  const verticalMm = page.heightMm - textHeightMm;
  const footing = page.footingTop + page.footingBottom;
  const marginTopMm = verticalMm * (page.footingTop / footing);
  const marginBottomMm = verticalMm * (page.footingBottom / footing);

  return {
    spec: canon.spec,
    specVersion: canon.specVersion,
    units,
    uPt: scale.uPt,
    lambda: scale.lambda,
    r: scale.r,
    s0RawPt,
    s1RawPt,
    s2RawPt,
    s0Pt: scale.s0PtInUse,
    s1Pt: scale.s1PtInUse,
    s2Pt: scale.s2PtInUse,
    colGutterPt: scale.uPt / 2,
    microGapPt: scale.uPt / 2,
    pageWidthMm: page.widthMm,
    pageHeightMm: page.heightMm,
    n: page.n,
    marginXMm,
    marginTopMm,
    marginBottomMm,
    textWidthMm,
    textHeightMm,
    textWidthPt: mmToPt(textWidthMm, units),
    uCssPx: ptToCssPx(scale.uPt, units),
    s0CssPx: ptToCssPx(scale.s0PtInUse, units),
    s1CssPx: ptToCssPx(scale.s1PtInUse, units),
    s2CssPx: ptToCssPx(scale.s2PtInUse, units),
    tracking,
    weight,
    education: {
      detailInsetPt: education.detailInsetPt,
      afterColonEm: education.afterColonEm + (optical.eduAfterColonEm || 0),
      colonHangEm: education.colonHangEm + (optical.eduColonHangEm || 0)
    },
    optical,
    faces,
    print,
    unicode: canon.unicode
  };
}

export function formatCssNumber(value, digits = 6) {
  const text = Number(value).toFixed(digits).replace(/\.?0+$/, '');
  return text === '-0' ? '0' : text;
}

export function typesettingCustomProperties(derived, metrics = {}) {
  const hang = (metrics.bulletLsbEm ?? 0) + (derived.optical.hangBulletEm || 0);
  const dateReserved = metrics.dateReservedPt ?? 63;
  const capOffset = metrics.capOffsetPt ?? 0;
  const xHeight = metrics.xHeightEm ?? 0.5;
  const afterColon = metrics.eduAfterColonEm ?? derived.education.afterColonEm;
  const colonHang = metrics.eduColonHangEm ?? derived.education.colonHangEm;
  const ruleColor = derived.optical.ruleColor;
  const hasGrad = Boolean(metrics.hasGrad && derived.print.gradEnabled);

  return {
    '--u': `${formatCssNumber(derived.uPt)}pt`,
    '--micro-gap': `${formatCssNumber(derived.microGapPt)}pt`,
    '--s0': `${formatCssNumber(derived.s0Pt)}pt`,
    '--s1': `${formatCssNumber(derived.s1Pt)}pt`,
    '--s2': `${formatCssNumber(derived.s2Pt)}pt`,
    '--margin-x': `${formatCssNumber(derived.marginXMm, 4)}mm`,
    '--margin-top': `${formatCssNumber(derived.marginTopMm, 4)}mm`,
    '--margin-bottom': `${formatCssNumber(derived.marginBottomMm, 4)}mm`,
    '--date-reserved-width': `${formatCssNumber(dateReserved, 3)}pt`,
    '--col-gutter': `${formatCssNumber(derived.colGutterPt)}pt`,
    '--cap-offset-s2': `${formatCssNumber(capOffset, 2)}pt`,
    '--hang-bullet': `${formatCssNumber(hang, 4)}em`,
    '--font-x-height': `${formatCssNumber(xHeight, 3)}em`,
    '--track-display': `${formatCssNumber(derived.tracking.displayEm, 3)}em`,
    '--track-body': `${formatCssNumber(derived.tracking.bodyEm, 3)}em`,
    '--track-label': `${formatCssNumber(derived.tracking.labelEm, 3)}em`,
    '--weight-regular': String(derived.weight.regular),
    '--weight-emphasis': String(derived.weight.emphasis),
    '--rule-color': ruleColor,
    '--edu-detail-inset': `${formatCssNumber(derived.education.detailInsetPt)}pt`,
    '--edu-after-colon': `${formatCssNumber(afterColon, 4)}em`,
    '--edu-colon-optical-hang': `${formatCssNumber(colonHang, 4)}em`,
    '--grad-print': hasGrad ? String(derived.print.grad) : '0'
  };
}

export function renderTypesettingCss(derived, metrics = {}) {
  const props = typesettingCustomProperties(derived, metrics);
  const lines = Object.entries(props).map(([name, value]) => `  ${name}: ${value};`);
  return [
    '/* Generated from config/typesetting.json + font metrics. Do not hand-edit. */',
    ':root {',
    ...lines,
    '}',
    ''
  ].join('\n');
}

export function relativeLuminance(hex) {
  const value = hex.replace('#', '');
  const rgb = [0, 1, 2].map(index => {
    const channel = parseInt(value.slice(index * 2, index * 2 + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

export function contrastRatio(foregroundHex, backgroundHex) {
  const lighter = Math.max(relativeLuminance(foregroundHex), relativeLuminance(backgroundHex));
  const darker = Math.min(relativeLuminance(foregroundHex), relativeLuminance(backgroundHex));
  return (lighter + 0.05) / (darker + 0.05);
}
