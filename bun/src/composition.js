#!/usr/bin/env bun
/** Pillar 3 composition: canon snapshot + self-contained HTML for PDF emit. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deriveCanon, loadCanon, ROOT } from './typesetting.js';
import { renderCompositionBody } from './composition-render.js';
import { annotateStackedFlags } from './header-stack.js';
import { typograph, NNBSP_PIPE } from './microtype.js';

const CACHE = resolve(ROOT, '.build-cache');
const ROMAN = resolve(ROOT, 'assets/fonts/newsreader-variable-roman.ttf');
const ITALIC = resolve(ROOT, 'assets/fonts/newsreader-variable-italic.ttf');

export function buildCanonSnapshot() {
  const canon = loadCanon();
  const derived = deriveCanon(canon);
  const metricsPath = resolve(CACHE, 'font-metrics.json');
  const metrics = existsSync(metricsPath)
    ? JSON.parse(readFileSync(metricsPath, 'utf8'))
    : {};

  return {
    specVersion: derived.specVersion,
    fonts: {
      familyText: canon.faces.text.cssFamily,
      familyTitle: canon.faces.title.cssFamily,
      roman: ROMAN,
      italic: ITALIC
    },
    scale: {
      uPt: derived.uPt,
      s0Pt: derived.s0Pt,
      s1Pt: derived.s1Pt,
      s2Pt: derived.s2Pt,
      namePt: derived.namePt,
      nameLeadingPt: derived.nameLeadingPt,
      colGutterPt: derived.colGutterPt
    },
    margins: {
      marginXMm: derived.marginXMm,
      marginTopMm: derived.marginTopMm,
      marginBottomMm: derived.marginBottomMm,
      textWidthMm: derived.textWidthMm
    },
    rhythm: {
      preSectionPt: derived.rhythm.preSectionU * derived.uPt,
      labelGapPt: derived.rhythm.labelToContentU * derived.uPt,
      entryGapPt: derived.rhythm.entryGapU * derived.uPt,
      leadInGapPt: derived.rhythm.leadInToBulletU * derived.uPt,
      nameContactGapPt: derived.nameContactGapPt,
      contactToBodyGapPt: derived.contactToBodyGapPt,
      summaryTailGapPt: derived.summaryTailGapPt,
      entryTitleGapPt: derived.entryTitleGapPt
    },
    tracking: canon.tracking,
    weight: canon.weight,
    bullet: {
      indentPt: derived.bulletIndentPt,
      hangEm: (
        (metrics.bulletLsbEmRaw ?? metrics.bulletLsbEm ?? 0) + (derived.optical.hangBulletEm || 0)
      ) * (derived.bulletHangScale ?? 1),
      textGapEm: derived.bulletTextGapEm,
      linePt: derived.bulletLinePt,
      gapPt: derived.bulletGapPt
    },
    education: {
      detailInsetPt: derived.education.detailInsetPt,
      afterColonEm: metrics.eduAfterColonEm ?? derived.education.afterColonEm,
      colonHangEm: metrics.eduColonHangEm ?? derived.education.colonHangEm
    },
    metrics: {
      dateReservedPt: metrics.dateReservedPt ?? 105,
      capOffsetPt: metrics.capOffsetPt ?? 0,
      capOffsetS0Pt: metrics.capOffsetS0Pt ?? 0
    },
    optical: { ruleColor: derived.optical.ruleColor },
    page: { widthMm: derived.pageWidthMm, heightMm: derived.pageHeightMm }
  };
}

function fontFaceBlock() {
  const roman = pathToFileURL(ROMAN).href;
  const italic = pathToFileURL(ITALIC).href;
  return [
    `@font-face{font-family:'Newsreader Resume Text';src:url('${roman}') format('truetype');font-style:normal;font-weight:200 800;font-display:block;}`,
    `@font-face{font-family:'Newsreader Resume Text';src:url('${italic}') format('truetype');font-style:italic;font-weight:200 800;font-display:block;}`,
    `@font-face{font-family:'Newsreader Resume Title';src:url('${roman}') format('truetype');font-style:normal;font-weight:200 800;font-display:block;}`
  ].join('\n');
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function typographDeep(value) {
  if (value == null) return value;
  if (typeof value === 'string') return typograph(value);
  if (Array.isArray(value)) return value.map(typographDeep);
  if (typeof value === 'object') {
    const out = {};
    for (const [key, entry] of Object.entries(value)) out[key] = typographDeep(entry);
    return out;
  }
  return value;
}

/** One microtype + stacking pass shared by WeasyPrint HTML and DOCX. */
export function prepareEmitProfile(profile, canonSnapshot = null) {
  const canon = canonSnapshot || buildCanonSnapshot();
  const typed = typographDeep(structuredClone(profile));
  if (Array.isArray(typed.additional?.leadership)) {
    typed.additional.leadership = typed.additional.leadership.map(item => typograph(item));
  }
  // Preserve pipe separators already compiled with NNBSP.
  void NNBSP_PIPE;
  return annotateStackedFlags(typed, canon);
}

export function writeCompositionBundle(profile, workDir, canonSnapshot = null) {
  mkdirSync(workDir, { recursive: true });
  if (!existsSync(resolve(CACHE, 'typesetting.css'))) {
    throw new Error('Missing .build-cache/typesetting.css — run: bun run metrics');
  }

  const canon = canonSnapshot || buildCanonSnapshot();
  const emitProfile = prepareEmitProfile(profile, canon);
  const typesetting = readFileSync(resolve(CACHE, 'typesetting.css'), 'utf8');
  const composition = readFileSync(resolve(ROOT, 'assets/css/composition.css'), 'utf8');
  const css = [
    fontFaceBlock(),
    typesetting.replace(':root, .sheet {', '.sheet {'),
    composition.replace(/@font-face[\s\S]*?}\n/g, '')
  ].join('\n');

  writeFileSync(resolve(workDir, 'composition.css'), css, 'utf8');

  const title = `${emitProfile.name} — ${emitProfile.role || 'Resume'}`;
  const description = [
    emitProfile.role,
    emitProfile.industry,
    emitProfile.summary ? String(emitProfile.summary).slice(0, 220) : ''
  ].filter(Boolean).join(' · ');
  const keywords = [
    emitProfile.role,
    emitProfile.industry,
    emitProfile.category,
    ...(emitProfile.additional?.skills || []).slice(0, 12)
  ].filter(Boolean);

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <title>${escapeAttr(title)}</title>
  <meta name="author" content="${escapeAttr(emitProfile.name)}">
  <meta name="description" content="${escapeAttr(description)}">
  <meta name="keywords" content="${escapeAttr(keywords.join(', '))}">
  <meta name="generator" content="Kartavya Resume Engine · WeasyPrint">
  <meta name="dcterms.created" content="${new Date().toISOString()}">
  <link rel="stylesheet" href="composition.css">
</head>
<body>
  <main class="sheet" id="sheet" role="main" aria-label="${escapeAttr(title)}">${renderCompositionBody(emitProfile)}</main>
</body>
</html>
`;
  const htmlPath = resolve(workDir, 'composition.html');
  writeFileSync(htmlPath, html, 'utf8');
  return {
    htmlPath,
    cssPath: resolve(workDir, 'composition.css'),
    emitProfile,
    meta: {
      title,
      author: emitProfile.name,
      authors: [emitProfile.name],
      description,
      keywords,
      lang: 'en-GB',
      profileId: emitProfile.id,
      specVersion: canon.specVersion,
      generator: 'Kartavya Resume Engine · WeasyPrint'
    }
  };
}

export { ROOT, CACHE };
