#!/usr/bin/env bun
/** Rhythm token projection and Chromium px probes for TYPESETTING v1.5.1. */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { deriveCanon, loadCanon, typesettingCustomProperties } from './typesetting.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PROBE_PATH = '/bun/fixtures/rhythm-probe.html';
const PX_TOLERANCE = 1.5;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pt(value) {
  return Number(String(value).replace('pt', ''));
}

function near(actual, expected, label) {
  assert(Math.abs(actual - expected) <= PX_TOLERANCE, `${label}: expected ~${expected.toFixed(2)}px, got ${actual.toFixed(2)}px`);
}

async function runChromium(args) {
  const process = Bun.spawn([chromium.executablePath(), '--headless', '--no-sandbox', '--disable-gpu', ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited
  ]);
  if (exitCode !== 0) throw new Error(`Chromium exited ${exitCode}: ${stderr.trim()}`);
  return { stdout, stderr };
}

const derived = deriveCanon(loadCanon());
const tokens = typesettingCustomProperties(derived, {
  dateReservedPt: 105,
  bulletLsbEm: 0.042,
  capOffsetPt: 5.86,
  capOffsetS0Pt: 1.2,
  eduAfterColonEm: 0.25,
  hasGrad: false
});

assert(derived.namePt === 20, 'name size must be 20pt');
assert(derived.rhythm.preSectionU === 1, 'pre-section rhythm must be 1u total');
assert(derived.rhythm.labelToContentU === 0.5, 'label gap must be 0.5u');
assert(derived.rhythm.entryGapU === 0.75, 'entry gap must be 0.75u');
assert(derived.rhythm.leadInToBulletU === 0, 'lead-in gap must be 0u');
assert(derived.rhythm.bulletTightenPt === 1, 'bullet tighten must be 1pt');
assert(derived.rhythm.nameToContactU === 0.5, 'name → contact gap must be 0.5u');

assert(pt(tokens['--pre-sec-margin']) === 7, 'pre-section margin must be 0.5u');
assert(pt(tokens['--pre-sec-pad']) === 7, 'pre-section padding must be 0.5u');
assert(pt(tokens['--label-gap']) === 7, 'label gap must be 7pt');
assert(pt(tokens['--entry-gap']) === 10.5, 'entry gap must be 10.5pt');
assert(pt(tokens['--lead-in-gap']) === 0, 'lead-in gap must be 0pt');
assert(pt(tokens['--micro-gap']) === 3.5, 'general micro-gap must stay 3.5pt');
assert(pt(tokens['--bullet-line']) === 13, 'bullet line height must be 13pt');
assert(pt(tokens['--bullet-gap']) === 2.5, 'bullet gap must be 2.5pt');
assert(pt(tokens['--name-contact-gap']) === 7, 'name → contact gap must be 7pt');
assert(tokens['--name-size'] === '20pt', 'name-size token must be 20pt');
assert(Number(tokens['--bullet-indent'].replace('pt', '')) === 10.5, 'bullet indent must be 0.75u');
assert(tokens['--bullet-text-gap'] === '0.2em', 'bullet text gap must default to 0.2em');

const cssFile = readFileSync(resolve(ROOT, 'assets/css/typesetting.css'), 'utf8');
assert(cssFile.includes('--pre-sec-margin'), 'generated CSS must include rhythm variables');

async function probeRenderedRhythm() {
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    async fetch(request) {
      const url = new URL(request.url);
      const relativePath = decodeURIComponent(url.pathname).replace(/^\//, '') || PROBE_PATH.replace(/^\//, '');
      const filePath = resolve(ROOT, relativePath);
      if (!filePath.startsWith(ROOT)) {
        return new Response('Forbidden', { status: 403 });
      }
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return new Response('Not found', { status: 404 });
      }
      const type = filePath.endsWith('.css')
        ? 'text/css'
        : filePath.endsWith('.html')
          ? 'text/html'
          : filePath.endsWith('.woff2')
            ? 'font/woff2'
            : filePath.endsWith('.ttf')
              ? 'font/ttf'
              : 'application/octet-stream';
      return new Response(file, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store' } });
    }
  });

  try {
    const probeUrl = `http://127.0.0.1:${server.port}${PROBE_PATH}`;
    const dump = await runChromium(['--virtual-time-budget=5000', '--dump-dom', probeUrl]);
    const match = dump.stdout.match(/<pre[^>]+id="rhythm-output"[^>]*>([\s\S]*?)<\/pre>/);
    assert(match, 'Chromium rhythm probe did not emit rhythm-output');
    const metrics = JSON.parse(match[1].trim());
    assert(!metrics.error, metrics.error || 'rhythm probe script failed');

    near(metrics.labelGap, metrics.expectedLabelGap, 'label → first entry header');
    near(metrics.entryGap, metrics.expectedEntryGap, 'entry → entry');
    near(metrics.leadInGap, metrics.expectedLeadInGap, 'role → bullets');
    near(metrics.nameContactGap, metrics.expectedNameContactGap, 'name → contact');
    near(metrics.nameSizePx, metrics.expectedNameSizePx, 'name size');
    assert(metrics.nameAlign === 'center', 'name must render centered');
    assert(metrics.roleItalic === 'italic', 'experience subtitle must render italic');
  } finally {
    server.stop(true);
  }
}

await probeRenderedRhythm();

console.log('✓ v1.5.1 rhythm token projection passed');
console.log('✓ v1.5.1 rhythm Chromium px probes passed');
