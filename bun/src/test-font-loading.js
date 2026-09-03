#!/usr/bin/env bun
/** Cold-load font pipeline: WOFF2 pairs, preload hints, and variation tokens. */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fontkit from 'fontkit';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const manifest = JSON.parse(readFileSync(resolve(ROOT, 'assets/fonts/font-manifest.json'), 'utf8'));
const romanTtf = manifest.files.find(file => file.filename === 'newsreader-variable-roman.ttf');
const romanWoff2 = manifest.files.find(file => file.filename === 'newsreader-variable-roman.woff2');
const italicWoff2 = manifest.files.find(file => file.filename === 'newsreader-variable-italic.woff2');
assert(romanTtf && romanWoff2 && italicWoff2, 'manifest must list Newsreader TTF + WOFF2 faces');

for (const file of [romanTtf, romanWoff2, italicWoff2]) {
  const path = resolve(ROOT, 'assets/fonts', file.filename);
  const bytes = readFileSync(path);
  assert(createHash('sha256').update(bytes).digest('hex') === file.sha256, `${file.filename} hash drifted`);
}

const ttf = fontkit.openSync(resolve(ROOT, 'assets/fonts/newsreader-variable-roman.ttf'));
const woff2 = fontkit.openSync(resolve(ROOT, 'assets/fonts/newsreader-variable-roman.woff2'));
assert(ttf.numGlyphs === woff2.numGlyphs, 'roman TTF/WOFF2 glyph counts must match');
assert(ttf.unitsPerEm === woff2.unitsPerEm, 'roman TTF/WOFF2 unitsPerEm must match');

const style = readFileSync(resolve(ROOT, 'assets/css/style.css'), 'utf8');
const typesetting = readFileSync(resolve(ROOT, 'assets/css/typesetting.css'), 'utf8');
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

assert(style.includes('newsreader-variable-roman.woff2') && style.includes('format(\'woff2\')'), 'roman WOFF2 must be first in @font-face');
assert(style.includes('newsreader-variable-italic.woff2'), 'italic WOFF2 must be declared');
assert(style.includes('unicode-range:'), 'font faces must declare latin unicode-range');
assert(style.includes('font-variation-settings: var(--resume-variation-text)'), 'sheet must use variation token');
assert(style.includes('font-optical-sizing: none'), 'explicit opsz axis must replace auto optical sizing');
assert(typesetting.includes('--resume-variation-text'), 'typesetting projection must emit variation shorthand');
assert(typesetting.includes('--resume-variation-emphasis'), 'emphasis variation token must exist');
assert(html.includes('rel="preload"') && html.includes('newsreader-variable-roman.woff2'), 'index must preload roman WOFF2');
assert(html.includes('fetchpriority="high"'), 'roman preload must be high priority');
assert(!html.includes('literata-variable-roman.woff2'), 'legacy Literata preload must not remain');
assert(!html.includes('newsreader-variable-italic.woff2'), 'italic must not be preloaded');

const app = readFileSync(resolve(ROOT, 'assets/js/app.js'), 'utf8');
assert(app.includes('preloadResumeFonts'), 'app must gate cold render on font preload');
assert(app.includes('bootResumeDocument'), 'app must expose boot path for font-ready reveal');

console.log('✓ Cold-load font pipeline fixtures passed');
