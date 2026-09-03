#!/usr/bin/env bun
/** Pin Newsreader variable TTF + derived WOFF2 from google/fonts (OFL). */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compress } from 'wawoff2';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FONTS = resolve(ROOT, 'assets/fonts');
const CACHE = resolve(ROOT, '.build-cache/fonts-sync');
const VERSION = '1.003';
const COMMIT = '1ece6a8bfe5db1a2b90c76cc1fe5d3b2eed5dcf3';
const REPO_BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader';
const ROMAN_URL = `${REPO_BASE}/Newsreader%5Bopsz%2Cwght%5D.ttf`;
const ITALIC_URL = `${REPO_BASE}/Newsreader-Italic%5Bopsz%2Cwght%5D.ttf`;
const LICENSE_URL = `${REPO_BASE}/OFL.txt`;

const SOURCES = [
  {
    role: 'variable-roman-ttf',
    url: ROMAN_URL,
    dest: 'newsreader-variable-roman.ttf',
    woff2Dest: 'newsreader-variable-roman.woff2',
    flavor: 'truetype',
    cssFamily: 'Newsreader Resume Text',
    style: 'normal',
    axes: ['opsz', 'wght'],
    preload: true
  },
  {
    role: 'variable-italic-ttf',
    url: ITALIC_URL,
    dest: 'newsreader-variable-italic.ttf',
    woff2Dest: 'newsreader-variable-italic.woff2',
    flavor: 'truetype',
    cssFamily: 'Newsreader Resume Text',
    style: 'italic',
    axes: ['opsz', 'wght'],
    preload: false
  }
];

const LEGACY_PREFIXES = [
  'source-serif-4-',
  'literata-',
  'OFL-Source-Serif-4.md',
  'OFL-Literata.txt'
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function download(url, dest) {
  if (existsSync(dest) && !process.argv.includes('--force')) return readFileSync(dest);
  mkdirSync(dirname(dest), { recursive: true });
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(dest, bytes);
  return bytes;
}

function removeLegacyFonts() {
  for (const entry of readdirSync(FONTS)) {
    if (LEGACY_PREFIXES.some(prefix => entry.startsWith(prefix) || entry === prefix)) {
      rmSync(resolve(FONTS, entry), { force: true });
    }
  }
}

mkdirSync(FONTS, { recursive: true });
mkdirSync(CACHE, { recursive: true });
removeLegacyFonts();

await download(LICENSE_URL, resolve(FONTS, 'OFL-Newsreader.txt'));

const files = [];
for (const spec of SOURCES) {
  const cachePath = resolve(CACHE, spec.dest);
  const bytes = await download(spec.url, cachePath);
  const ttfPath = resolve(FONTS, spec.dest);
  writeFileSync(ttfPath, bytes);
  files.push({
    role: spec.role,
    filename: spec.dest,
    flavor: spec.flavor,
    cssFamily: spec.cssFamily,
    style: spec.style,
    axes: spec.axes,
    preload: spec.preload,
    sha256: sha256(bytes),
    bytes: bytes.length,
    sourcePath: spec.url
  });
  console.log(`✓ ${spec.dest} (${bytes.length} bytes)`);

  const woff2Bytes = Buffer.from(await compress(bytes));
  const woff2Path = resolve(FONTS, spec.woff2Dest);
  writeFileSync(woff2Path, woff2Bytes);
  files.push({
    role: spec.role.replace('-ttf', '-woff2'),
    filename: spec.woff2Dest,
    flavor: 'woff2',
    cssFamily: spec.cssFamily,
    style: spec.style,
    axes: spec.axes,
    preload: spec.preload,
    derivedFrom: spec.dest,
    sha256: sha256(woff2Bytes),
    bytes: woff2Bytes.length,
    sourcePath: spec.dest
  });
  console.log(`✓ ${spec.woff2Dest} (${woff2Bytes.length} bytes, ${(woff2Bytes.length / bytes.length * 100).toFixed(1)}% of TTF)`);
}

const newsreaderNames = new Set(files.map(file => file.filename));
const previousManifestPath = resolve(FONTS, 'font-manifest.json');
let preservedUi = [];
if (existsSync(previousManifestPath)) {
  try {
    const previous = JSON.parse(readFileSync(previousManifestPath, 'utf8'));
    preservedUi = (previous.files || []).filter(file =>
      !newsreaderNames.has(file.filename) &&
      (String(file.role || '').startsWith('ui-') || String(file.filename || '').startsWith('Satoshi-'))
    );
    for (const file of preservedUi) {
      if (!existsSync(resolve(FONTS, file.filename))) {
        throw new Error(`fonts:sync would drop missing UI face ${file.filename}; keep Satoshi files in assets/fonts/`);
      }
    }
  } catch (error) {
    if (error instanceof SyntaxError) throw error;
    if (String(error.message || '').includes('fonts:sync would drop')) throw error;
  }
}
files.push(...preservedUi);

const manifest = {
  family: 'Newsreader',
  version: VERSION,
  commit: COMMIT,
  license: 'OFL-1.1',
  licenseFile: 'OFL-Newsreader.txt',
  source: {
    repository: 'https://github.com/productiontype/Newsreader',
    distribution: 'https://github.com/google/fonts/tree/main/ofl/newsreader',
    roman: ROMAN_URL,
    italic: ITALIC_URL,
    license: LICENSE_URL
  },
  notes: 'Newsreader variable (opsz, wght) for the A4 sheet. Satoshi UI faces in this manifest are preserved across sync (not re-downloaded here). TTF is canonical for metrics; WOFF2 is the cold-load face. Roman is preloaded; italic loads on first subtitle line. No GRAD axis.',
  files
};

writeFileSync(resolve(FONTS, 'font-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ Wrote assets/fonts/font-manifest.json (${files.length} files${preservedUi.length ? `, kept ${preservedUi.length} UI` : ''})`);

