#!/usr/bin/env bun
/** Bun-side header stacking decision matching Pillar 1 42% role min-width rule. */

import * as fontkit from 'fontkit';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './typesetting.js';

const ROMAN = resolve(ROOT, 'assets/fonts/newsreader-variable-roman.ttf');
const ITALIC = resolve(ROOT, 'assets/fonts/newsreader-variable-italic.ttf');
const METRICS = resolve(ROOT, '.build-cache/font-metrics.json');

let cached = null;

function mmToPt(mm) {
  return mm * 72 / 25.4;
}

function loadMeasureContext(canon) {
  if (cached && cached.specVersion === canon.specVersion) return cached;
  if (!existsSync(ROMAN) || !existsSync(ITALIC)) {
    throw new Error('Newsreader fonts missing for header stacking measure');
  }
  const metrics = existsSync(METRICS) ? JSON.parse(readFileSync(METRICS, 'utf8')) : {};
  const s0 = canon.scale.s0Pt;
  const opsz = s0;
  const romanBase = fontkit.openSync(ROMAN);
  const italicBase = fontkit.openSync(ITALIC);
  const emphasis = romanBase.getVariation
    ? romanBase.getVariation({ wght: canon.weight?.emphasis ?? 600, opsz })
    : romanBase;
  const italic = italicBase.getVariation
    ? italicBase.getVariation({ wght: canon.weight?.regular ?? 400, opsz })
    : italicBase;
  cached = {
    specVersion: canon.specVersion,
    emphasis,
    italic,
    s0,
    dateReservedPt: metrics.dateReservedPt ?? canon.metrics?.dateReservedPt ?? 105,
    colGutterPt: canon.scale.colGutterPt,
    entryTitleGapPt: canon.rhythm.entryTitleGapPt,
    textWidthPt: mmToPt(canon.margins.textWidthMm)
  };
  return cached;
}

function advancePt(font, text, sizePt) {
  if (!text) return 0;
  const run = font.layout(String(text));
  const units = run.positions.reduce((sum, position) => sum + position.xAdvance, 0);
  return (units / font.unitsPerEm) * sizePt;
}

/**
 * Stack when company/role cannot share one lead row under the 42% role floor
 * (same intent as style.css flex: 1 1 42% / min-width: 42%).
 */
export function shouldStackHeader(primary, secondary, canon) {
  const secondaryText = String(secondary || '').trim();
  if (!secondaryText) return false;
  const primaryText = String(primary || '').trim();
  if (!primaryText) return false;

  const ctx = loadMeasureContext(canon);
  const leadWidthPt = Math.max(40, ctx.textWidthPt - ctx.dateReservedPt - ctx.colGutterPt);
  const primaryWidth = advancePt(ctx.emphasis, primaryText, ctx.s0);
  const secondaryWidth = advancePt(ctx.italic, secondaryText, ctx.s0);
  const gap = ctx.entryTitleGapPt;

  if (primaryWidth > leadWidthPt) return true;
  const remaining = leadWidthPt - primaryWidth - gap;
  if (remaining < leadWidthPt * 0.42) return true;
  if (primaryWidth + gap + secondaryWidth > leadWidthPt) return true;
  return false;
}

export function experienceLeadParts(entry) {
  const headerOrder = entry.headerOrder || 'company-first';
  if (headerOrder === 'role-first') {
    return {
      primary: entry.role || '',
      secondary: entry.companyLine || entry.company || ''
    };
  }
  return {
    primary: entry.company || '',
    secondary: entry.roleLine || entry.role || ''
  };
}

export function projectLeadParts(entry) {
  return {
    primary: entry.name || '',
    secondary: entry.engagementLabel || ''
  };
}

export function annotateStackedFlags(profile, canon) {
  const next = structuredClone(profile);
  for (const entry of next.experience || []) {
    const parts = experienceLeadParts(entry);
    entry.stacked = shouldStackHeader(parts.primary, parts.secondary, canon);
  }
  for (const entry of next.projects || []) {
    const parts = projectLeadParts(entry);
    entry.stacked = shouldStackHeader(parts.primary, parts.secondary, canon);
  }
  return next;
}
