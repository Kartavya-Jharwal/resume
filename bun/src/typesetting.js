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
  const { units, scale, page, tracking, weight, education, optical, faces, print, rhythm = {}, bullet = {} } = canon;
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
    namePt: scale.namePtInUse ?? scale.s2PtInUse,
    nameLeadingPt: scale.uPt * 2,
    colGutterPt: scale.uPt / 2,
    bulletIndentPt: (bullet.indentU ?? 1) * scale.uPt,
    bulletTextGapEm: bullet.textGapEm ?? 0.2,
    bulletHangScale: bullet.hangScale ?? 1,
    microGapPt: scale.uPt * (rhythm.bulletGapU ?? 0.25),
    bulletLinePt: scale.uPt - (rhythm.bulletTightenPt ?? 0),
    bulletGapPt: scale.uPt * (rhythm.bulletGapU ?? 0.25) - (rhythm.bulletTightenPt ?? 0),
    nameContactGapPt: scale.uPt * (rhythm.nameToContactU ?? 0.5),
    contactToBodyGapPt: scale.uPt * (rhythm.contactToBodyU ?? 0.5),
    summaryTailGapPt: scale.uPt * (rhythm.summaryTailU ?? 0.25),
    entryTitleGapPt: scale.uPt * (rhythm.entryTitleGapU ?? 0.5),
    rhythm: {
      preSectionU: rhythm.preSectionU ?? 1,
      labelToContentU: rhythm.labelToContentU ?? 0.5,
      entryGapU: rhythm.entryGapU ?? 0.5,
      leadInToBulletU: rhythm.leadInToBulletU ?? 0.25,
      bulletGapU: rhythm.bulletGapU ?? 0.25,
      bulletTightenPt: rhythm.bulletTightenPt ?? 0,
      entryTitleGapU: rhythm.entryTitleGapU ?? 0.5,
      nameToContactU: rhythm.nameToContactU ?? 0.5,
      contactToBodyU: rhythm.contactToBodyU ?? 0.5,
      summaryTailU: rhythm.summaryTailU ?? 0.25
    },
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
  const hang = ((metrics.bulletLsbEm ?? 0) + (derived.optical.hangBulletEm || 0)) * (derived.bulletHangScale ?? 1);
  const dateReserved = metrics.dateReservedPt ?? 63;
  const capOffset = metrics.capOffsetPt ?? 0;
  const xHeight = metrics.xHeightEm ?? 0.5;
  const afterColon = metrics.eduAfterColonEm ?? derived.education.afterColonEm;
  const colonHang = metrics.eduColonHangEm ?? derived.education.colonHangEm;
  const ruleColor = derived.optical.ruleColor;
  const hasGrad = Boolean(metrics.hasGrad && derived.print.gradEnabled);
  const preSectionHalfPt = (derived.rhythm.preSectionU * derived.uPt) / 2;
  const labelGapPt = derived.rhythm.labelToContentU * derived.uPt;
  const entryGapPt = derived.rhythm.entryGapU * derived.uPt;
  const leadInGapPt = derived.rhythm.leadInToBulletU * derived.uPt;
  const contactToBodyGapPt = derived.contactToBodyGapPt;
  const summaryTailGapPt = derived.summaryTailGapPt;
  const capOffsetS0 = metrics.capOffsetS0Pt ?? 0;

  return {
    '--u': `${formatCssNumber(derived.uPt)}pt`,
    '--micro-gap': `${formatCssNumber(derived.microGapPt)}pt`,
    '--bullet-line': `${formatCssNumber(derived.bulletLinePt)}pt`,
    '--bullet-gap': `${formatCssNumber(derived.bulletGapPt)}pt`,
    '--quarter-gap': `${formatCssNumber(leadInGapPt)}pt`,
    '--pre-sec-margin': `${formatCssNumber(preSectionHalfPt)}pt`,
    '--pre-sec-pad': `${formatCssNumber(preSectionHalfPt)}pt`,
    '--label-gap': `${formatCssNumber(labelGapPt)}pt`,
    '--entry-gap': `${formatCssNumber(entryGapPt)}pt`,
    '--lead-in-gap': `${formatCssNumber(leadInGapPt)}pt`,
    '--name-contact-gap': `${formatCssNumber(derived.nameContactGapPt)}pt`,
    '--contact-to-body-gap': `${formatCssNumber(contactToBodyGapPt)}pt`,
    '--summary-tail-gap': `${formatCssNumber(summaryTailGapPt)}pt`,
    '--entry-title-gap': `${formatCssNumber(derived.entryTitleGapPt)}pt`,
    '--name-size': `${formatCssNumber(derived.namePt)}pt`,
    '--name-leading': `${formatCssNumber(derived.nameLeadingPt)}pt`,
    '--resume-text-opsz': String(derived.faces.text.opsz),
    '--resume-title-opsz': String(derived.faces.title.opsz),
    '--resume-name-opsz': String(derived.namePt),
    '--resume-variation-text': `'opsz' ${derived.faces.text.opsz}, 'wght' ${derived.weight.regular}`,
    '--resume-variation-emphasis': `'opsz' ${derived.faces.text.opsz}, 'wght' ${derived.weight.emphasis}`,
    '--resume-variation-name': `'opsz' ${derived.namePt}, 'wght' ${derived.weight.regular}`,
    '--s0': `${formatCssNumber(derived.s0Pt)}pt`,
    '--s1': `${formatCssNumber(derived.s1Pt)}pt`,
    '--s2': `${formatCssNumber(derived.s2Pt)}pt`,
    '--margin-x': `${formatCssNumber(derived.marginXMm, 4)}mm`,
    '--margin-top': `${formatCssNumber(derived.marginTopMm, 4)}mm`,
    '--margin-bottom': `${formatCssNumber(derived.marginBottomMm, 4)}mm`,
    '--date-reserved-width': `${formatCssNumber(dateReserved, 3)}pt`,
    '--col-gutter': `${formatCssNumber(derived.colGutterPt)}pt`,
    '--cap-offset-s2': `${formatCssNumber(capOffset, 2)}pt`,
    '--cap-offset-s0': `${formatCssNumber(capOffsetS0, 2)}pt`,
    '--hang-bullet': `${formatCssNumber(hang, 4)}em`,
    '--bullet-indent': `${formatCssNumber(derived.bulletIndentPt)}pt`,
    '--bullet-text-gap': `${formatCssNumber(derived.bulletTextGapEm, 3)}em`,
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
  const block = [
    '/* Generated from config/typesetting.json + font metrics. Do not hand-edit. */',
    ':root, .sheet {',
    ...lines,
    '}',
    ''
  ].join('\n');
  return block;
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
