#!/usr/bin/env bun
/** Pin and vendor official Source Serif 4.005R TTF + WOFF2 from Adobe's GitHub release. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FONTS = resolve(ROOT, 'assets/fonts');
const CACHE = resolve(ROOT, '.build-cache/fonts-sync');
const RELEASE = '4.005R';
const DESKTOP_URL = `https://github.com/adobe-fonts/source-serif/releases/download/${RELEASE}/source-serif-4.005_Desktop.zip`;
const WOFF2_URL = `https://github.com/adobe-fonts/source-serif/releases/download/${RELEASE}/source-serif-4.005_WOFF2.zip`;
const LICENSE_URL = `https://raw.githubusercontent.com/adobe-fonts/source-serif/${RELEASE}/LICENSE.md`;

const FILES = [
  {
    role: 'variable-roman-ttf',
    zip: 'desktop',
    source: ['VAR/SourceSerif4Variable-Roman.ttf', 'TTF/VAR/SourceSerif4Variable-Roman.ttf'],
    dest: 'source-serif-4-variable-roman.ttf',
    flavor: 'truetype',
    cssFamily: null,
    opsz: 'variable',
    wght: 'variable'
  },
  {
    role: 'text-regular-ttf',
    zip: 'desktop',
    source: ['TTF/SourceSerif4-Regular.ttf', 'SourceSerif4-Regular.ttf'],
    dest: 'source-serif-4-text-regular.ttf',
    flavor: 'truetype',
    cssFamily: 'Source Serif 4 Resume Text',
    opsz: 11,
    wght: 400
  },
  {
    role: 'text-semibold-ttf',
    zip: 'desktop',
    source: ['TTF/SourceSerif4-Semibold.ttf', 'SourceSerif4-Semibold.ttf'],
    dest: 'source-serif-4-text-semibold.ttf',
    flavor: 'truetype',
    cssFamily: 'Source Serif 4 Resume Text',
    opsz: 11,
    wght: 600
  },
  {
    role: 'text-italic-ttf',
    zip: 'desktop',
    source: ['TTF/SourceSerif4-It.ttf', 'SourceSerif4-It.ttf'],
    dest: 'source-serif-4-text-italic.ttf',
    flavor: 'truetype',
    cssFamily: 'Source Serif 4 Resume Text',
    opsz: 11,
    wght: 400
  },
  {
    role: 'title-regular-ttf',
    zip: 'desktop',
    source: ['TTF/SourceSerif4Subhead-Regular.ttf', 'TTF/SourceSerif4-Regular.ttf', 'SourceSerif4Subhead-Regular.ttf'],
    dest: 'source-serif-4-title-regular.ttf',
    flavor: 'truetype',
    cssFamily: 'Source Serif 4 Resume Title',
    opsz: 16,
    wght: 400
  },
  {
    role: 'text-regular-woff2',
    zip: 'woff2',
    source: [
      'TTF/SourceSerif4-Regular.ttf.woff2',
      'WOFF2/TTF/SourceSerif4-Regular.ttf.woff2',
      'SourceSerif4-Regular.ttf.woff2'
    ],
    dest: 'source-serif-4-text-regular.woff2',
    flavor: 'woff2',
    cssFamily: 'Source Serif 4 Resume Text',
    opsz: 11,
    wght: 400
  },
  {
    role: 'text-semibold-woff2',
    zip: 'woff2',
    source: [
      'TTF/SourceSerif4-Semibold.ttf.woff2',
      'SourceSerif4-Semibold.ttf.woff2'
    ],
    dest: 'source-serif-4-text-semibold.woff2',
    flavor: 'woff2',
    cssFamily: 'Source Serif 4 Resume Text',
    opsz: 11,
    wght: 600
  },
  {
    role: 'text-italic-woff2',
    zip: 'woff2',
    source: [
      'TTF/SourceSerif4-It.ttf.woff2',
      'SourceSerif4-It.ttf.woff2'
    ],
    dest: 'source-serif-4-text-italic.woff2',
    flavor: 'woff2',
    cssFamily: 'Source Serif 4 Resume Text',
    opsz: 11,
    wght: 400
  },
  {
    role: 'title-regular-woff2',
    zip: 'woff2',
    source: [
      'TTF/SourceSerif4Subhead-Regular.ttf.woff2',
      'SourceSerif4Subhead-Regular.ttf.woff2'
    ],
    dest: 'source-serif-4-title-regular.woff2',
    flavor: 'woff2',
    cssFamily: 'Source Serif 4 Resume Title',
    opsz: 16,
    wght: 400
  }
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function download(url, dest) {
  if (existsSync(dest) && !process.argv.includes('--force')) return dest;
  mkdirSync(dirname(dest), { recursive: true });
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
  return dest;
}

function extractZip(zipPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const result = Bun.spawnSync(['tar', '-xf', zipPath, '-C', destDir], { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0) {
    const fallback = Bun.spawnSync([
      'powershell',
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`
    ], { stdout: 'pipe', stderr: 'pipe' });
    if (fallback.exitCode !== 0) {
      throw new Error(`Could not extract ${zipPath}: ${new TextDecoder().decode(result.stderr || fallback.stderr)}`);
    }
  }
}

function walk(dir, acc = []) {
  const glob = new Bun.Glob('**/*');
  for (const match of glob.scanSync({ cwd: dir, onlyFiles: true })) acc.push(join(dir, match));
  return acc;
}

function findSource(root, candidates) {
  const files = walk(root);
  for (const candidate of candidates) {
    const match = files.find(file => file.replaceAll('\\', '/').endsWith(candidate) || file.replaceAll('\\', '/').endsWith(candidate.split('/').pop()));
    if (match) return match;
  }
  return null;
}

mkdirSync(FONTS, { recursive: true });
mkdirSync(CACHE, { recursive: true });

const desktopZip = await download(DESKTOP_URL, join(CACHE, 'source-serif-4.005_Desktop.zip'));
const woff2Zip = await download(WOFF2_URL, join(CACHE, 'source-serif-4.005_WOFF2.zip'));
await download(LICENSE_URL, resolve(FONTS, 'OFL-Source-Serif-4.md'));

const desktopDir = join(CACHE, 'desktop');
const woff2Dir = join(CACHE, 'woff2');
rmSync(desktopDir, { recursive: true, force: true });
rmSync(woff2Dir, { recursive: true, force: true });
extractZip(desktopZip, desktopDir);
extractZip(woff2Zip, woff2Dir);

const files = [];
for (const spec of FILES) {
  const root = spec.zip === 'desktop' ? desktopDir : woff2Dir;
  const found = findSource(root, spec.source);
  if (!found) {
    const listing = walk(root).map(file => file.slice(root.length + 1)).slice(0, 40).join('\n');
    throw new Error(`Missing ${spec.role} in ${spec.zip} zip. First files:\n${listing}`);
  }
  const dest = resolve(FONTS, spec.dest);
  copyFileSync(found, dest);
  const bytes = readFileSync(dest);
  files.push({
    role: spec.role,
    filename: spec.dest,
    flavor: spec.flavor,
    cssFamily: spec.cssFamily,
    opsz: spec.opsz,
    wght: spec.wght,
    sha256: sha256(bytes),
    bytes: bytes.length,
    sourcePath: found.slice(root.length + 1).replaceAll('\\', '/')
  });
  console.log(`✓ ${spec.dest} ← ${files.at(-1).sourcePath}`);
}

const manifest = {
  family: 'Source Serif 4',
  version: RELEASE,
  license: 'OFL-1.1',
  licenseFile: 'OFL-Source-Serif-4.md',
  source: {
    desktop: DESKTOP_URL,
    woff2: WOFF2_URL,
    license: LICENSE_URL
  },
  notes: 'Official Adobe release. TTF is canonical for metrics and a future glyph PDF; WOFF2 is the Chromium face. Display optical size is intentionally unused at résumé sizes.',
  files
};

writeFileSync(resolve(FONTS, 'font-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`✓ Wrote assets/fonts/font-manifest.json (${files.length} files)`);
