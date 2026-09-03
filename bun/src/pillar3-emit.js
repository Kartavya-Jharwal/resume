#!/usr/bin/env bun
/**
 * Pillar 3 emit — durable PDF (WeasyPrint max) + flow DOCX orchestrator.
 *
 *   bun run pillar3:emit
 *   bun run pillar3:emit -- --profile <id>
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCanonSnapshot, writeCompositionBundle, ROOT, CACHE } from './composition.js';
import { verifyPdf } from './pdf-verify.js';

const OUT = resolve(ROOT, 'tmp/pillar3-emit');
const SRC = dirname(fileURLToPath(import.meta.url));
const PROFILE_ARG = process.argv.indexOf('--profile');
const PROFILE_ID = PROFILE_ARG >= 0
  ? process.argv[PROFILE_ARG + 1]
  : 'early-stage-operator-yc-alumni-startups';

if (PROFILE_ARG >= 0 && (!PROFILE_ID || PROFILE_ID.startsWith('--'))) {
  throw new Error('--profile requires a résumé profile id');
}

function runBun(script, args = []) {
  const result = Bun.spawnSync(['bun', 'run', script, ...args], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit'
  });
  if (result.exitCode !== 0) throw new Error(`${script} failed (${result.exitCode})`);
}

function parseProfiles(source) {
  const match = source.match(/window\.PROFILES\s*=\s*(\[[\s\S]*\])\s*;?/);
  if (!match) throw new Error('Compiler payload format is invalid');
  return JSON.parse(match[1]);
}

function loadProfile(id) {
  const candidates = [
    resolve(ROOT, 'public/data.js'),
    resolve(ROOT, 'dist/public/data.js')
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const profile = parseProfiles(readFileSync(path, 'utf8')).find(entry => entry.id === id);
    if (profile) return { profile, source: path };
  }
  runBun('compile');
  const path = resolve(ROOT, 'public/data.js');
  const profile = parseProfiles(readFileSync(path, 'utf8')).find(entry => entry.id === id);
  if (!profile) throw new Error(`Profile not found: ${id}`);
  return { profile, source: path };
}

async function runPython(script, args) {
  const started = performance.now();
  const process = Bun.spawn(['python', resolve(SRC, script), ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited
  ]);
  if (exitCode !== 0) {
    throw new Error(`${script} failed (${exitCode}): ${stderr.trim() || stdout.trim()}`);
  }
  return { ms: performance.now() - started, stdout: stdout.trim() };
}

function parseCapability(stdout) {
  const match = stdout.match(/capability:(\{.*\})/);
  return match ? JSON.parse(match[1]) : null;
}

function assertDocx(path) {
  if (!existsSync(path)) throw new Error(`DOCX missing: ${path}`);
  const bytes = statSync(path).size;
  if (bytes < 40_000) throw new Error(`DOCX too small (${bytes} B) — font embed likely failed`);
  return bytes;
}

async function main() {
  const wall = performance.now();
  if (!existsSync(resolve(CACHE, 'typesetting.css'))) runBun('metrics');
  if (!existsSync(resolve(ROOT, 'assets/css/composition.css'))) {
    throw new Error('Missing assets/css/composition.css');
  }

  const { profile, source } = loadProfile(PROFILE_ID);
  const workDir = resolve(OUT, PROFILE_ID);
  mkdirSync(workDir, { recursive: true });

  const canon = buildCanonSnapshot();
  const { htmlPath, meta } = writeCompositionBundle(profile, workDir, canon);
  const profilePath = resolve(workDir, 'profile.json');
  const canonPath = resolve(workDir, 'canon.json');
  const metaPath = resolve(workDir, 'pdf-meta.json');
  const pdfPath = resolve(workDir, `${PROFILE_ID}.pdf`);
  const docxPath = resolve(workDir, `${PROFILE_ID}.docx`);

  writeFileSync(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
  writeFileSync(canonPath, `${JSON.stringify(canon, null, 2)}\n`);
  writeFileSync(metaPath, `${JSON.stringify({ ...meta, specVersion: canon.specVersion }, null, 2)}\n`);

  console.log(`✓ Composition ready (${PROFILE_ID}) · canon ${canon.specVersion}`);
  console.log(`  source ${source}`);

  const branchStart = performance.now();
  const [pdfResult, docxResult] = await Promise.all([
    runPython('emit-pdf.py', [htmlPath, pdfPath, metaPath]),
    runPython('emit-docx.py', [profilePath, canonPath, docxPath])
  ]);
  const branchMs = performance.now() - branchStart;

  const capability = parseCapability(pdfResult.stdout);
  const docxBytes = assertDocx(docxPath);
  const expectOnePage = !profile.isMasterCV;

  const verified = await verifyPdf(pdfPath, {
    label: PROFILE_ID,
    expectedPageCount: expectOnePage ? 1 : null,
    expectedTitle: profile.name,
    requireTitle: true,
    requireEmbeddedTtf: true,
    forbidType3: true,
    requireTagged: true,
    requireStructure: true
  });

  if (expectOnePage && verified.pageCount !== 1) {
    throw new Error(`${PROFILE_ID}: one-page contract failed (${verified.pageCount} pages). Run bun run fit:measure and re-emit.`);
  }

  const report = {
    ok: true,
    profileId: PROFILE_ID,
    canonVersion: canon.specVersion,
    engine: {
      pdf: 'weasyprint-max',
      docx: 'python-docx',
      gtk: (pdfResult.stdout.match(/gtk:(.+)/) || [])[1] || null
    },
    capability,
    structure: verified.structure,
    metadata: {
      title: verified.title,
      author: verified.author,
      subject: verified.subject
    },
    artifacts: {
      html: htmlPath,
      pdf: pdfPath,
      docx: docxPath,
      pdfBytes: statSync(pdfPath).size,
      docxBytes
    },
    pages: verified.pageCount,
    timingMs: {
      branchesParallel: Math.round(branchMs),
      pdf: Math.round(pdfResult.ms),
      docx: Math.round(docxResult.ms),
      total: Math.round(performance.now() - wall)
    }
  };
  writeFileSync(resolve(workDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const s = verified.structure;
  console.log(`✓ PDF  ${capability?.variant || 'tagged'} · PDF ${s.pdfVersion || '?'} · ${verified.pageCount}pg · ${(report.artifacts.pdfBytes / 1024).toFixed(0)} KB · ${pdfResult.ms.toFixed(0)}ms`);
  console.log(`  tagged=${s.tagged} lang=${s.lang} xmp=${s.xmp} outlines=${s.outlines} ua=${s.pdfUa} fonts=${s.embeddedTtf}`);
  console.log(`✓ DOCX ${(docxBytes / 1024).toFixed(0)} KB · ${docxResult.ms.toFixed(0)}ms`);
  console.log(`✓ Pillar 3 emit OK in ${report.timingMs.total}ms`);
  console.log(`  ${pdfPath}`);
  console.log(`  ${docxPath}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
