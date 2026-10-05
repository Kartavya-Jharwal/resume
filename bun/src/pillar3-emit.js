#!/usr/bin/env bun
/**
 * Pillar 3 emit — durable PDF (WeasyPrint max) + flow DOCX orchestrator.
 *
 *   bun run pillar3:emit
 *   bun run pillar3:emit -- --profile <id>
 *   bun run pillar3:emit -- --all
 *   bun run pillar3:emit -- --all --concurrency 12
 */

import { cpus } from 'node:os';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCanonSnapshot, writeCompositionBundle, prepareEmitProfile, ROOT, CACHE } from './composition.js';
import { verifyPdf } from './pdf-verify.js';
import { recordPdf } from './artifact-state.js';

const OUT = resolve(ROOT, 'tmp/pillar3-emit');
const SRC = dirname(fileURLToPath(import.meta.url));
const PUBLISH = process.argv.includes('--publish');
const NO_REBUILD = process.argv.includes('--no-rebuild');
const DOCX_ONLY = process.argv.includes('--docx-only');
const ALL_MODE = process.argv.includes('--all');
const PROFILE_ARG = process.argv.indexOf('--profile');
const CONCURRENCY_ARG = process.argv.indexOf('--concurrency');
const STRICT = process.argv.includes('--strict') || PUBLISH;
const DEFAULT_CONCURRENCY = Math.max(1, cpus()?.length || 2);
const CONCURRENCY = CONCURRENCY_ARG >= 0
  ? Math.max(1, Number(process.argv[CONCURRENCY_ARG + 1]) || DEFAULT_CONCURRENCY)
  : DEFAULT_CONCURRENCY;
const PROFILE_ID = PROFILE_ARG >= 0
  ? process.argv[PROFILE_ARG + 1]
  : '';

function docxFilenameFor(profile) {
  return String(profile.pdfFilename || `${profile.id}.pdf`).replace(/\.pdf$/i, '.docx');
}

if (PROFILE_ARG >= 0 && (!PROFILE_ID || PROFILE_ID.startsWith('--'))) {
  throw new Error('--profile requires a résumé profile id');
}
if (ALL_MODE && PROFILE_ARG >= 0) {
  throw new Error('Use either --all or --profile, not both');
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

function loadAllProfiles() {
  mkdirSync(OUT, { recursive: true });
  // Compile fresh for every batch; public/data.js is a debug artifact, not authority.
  const path = resolve(OUT, 'profiles.full.js');
  runBun('bun/src/compile.js', ['--out', path]);
  return { profiles: parseProfiles(readFileSync(path, 'utf8')), source: path };
}

function resolvePython(kind) {
  const preferred = kind === 'docx'
    ? [process.env.DOCX_PYTHON, process.env.PDF_PYTHON]
    : [process.env.PDF_PYTHON, process.env.DOCX_PYTHON];
  const candidates = [
    ...preferred,
    process.env.PYTHON,
    'D:\\KJ\\Programs_Files\\Python\\Python313\\python.exe',
    'python',
    'py'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (/python27|windows-build-tools/i.test(candidate)) continue;
    if (candidate.includes('\\') || candidate.includes('/')) {
      if (!existsSync(candidate)) continue;
      return candidate;
    }
    return candidate;
  }
  return 'python';
}

async function runPython(script, args) {
  const started = performance.now();
  const python = resolvePython(script === 'emit-docx.py' || script === 'docx-fonts.py' ? 'docx' : 'pdf');
  const process = Bun.spawn([python, resolve(SRC, script), ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const timer = setTimeout(() => process.kill(), 300_000);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited
  ]).finally(() => clearTimeout(timer));
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

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function emitOne(profile, canon, { quiet = false, fullProfile = profile } = {}) {
  const wall = performance.now();
  const workDir = resolve(OUT, profile.id);
  mkdirSync(workDir, { recursive: true });
  const emitProfile = prepareEmitProfile(fullProfile, canon);

  if (DOCX_ONLY) {
    const profilePath = resolve(workDir, 'profile.json');
    const canonPath = resolve(workDir, 'canon.json');
    const docxPath = resolve(workDir, `${profile.id}.docx`);
    writeFileSync(profilePath, JSON.stringify(emitProfile));
    writeFileSync(canonPath, JSON.stringify(canon));
    await runPython('emit-docx.py', [profilePath, canonPath, docxPath]);
    return { ok: true, profileId: profile.id, artifacts: { docx: docxPath, docxBytes: assertDocx(docxPath) }, timingMs: { total: Math.round(performance.now() - wall) } };
  }
  const { htmlPath, meta } = writeCompositionBundle(emitProfile, workDir, canon);
  const profilePath = resolve(workDir, 'profile.json');
  const canonPath = resolve(workDir, 'canon.json');
  const metaPath = resolve(workDir, 'pdf-meta.json');
  const pdfPath = resolve(workDir, `${profile.id}.pdf`);
  const docxPath = resolve(workDir, `${profile.id}.docx`);

  writeFileSync(profilePath, `${JSON.stringify(emitProfile, null, 2)}\n`);
  writeFileSync(canonPath, `${JSON.stringify(canon, null, 2)}\n`);
  writeFileSync(metaPath, `${JSON.stringify({ ...meta, specVersion: canon.specVersion }, null, 2)}\n`);

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
    label: profile.id,
    expectedPageCount: null,
    expectedTitle: profile.name,
    requireTitle: true,
    requireEmbeddedTtf: true,
    forbidType3: true,
    requireTagged: true,
    requireStructure: true
  });

  const pageOk = !expectOnePage || verified.pageCount === 1;
  if (!pageOk && (STRICT || PUBLISH)) {
    throw new Error(`${profile.id}: one-page contract failed (${verified.pageCount} pages)`);
  }

  const report = {
    ok: pageOk,
    profileId: profile.id,
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
    warnings: pageOk ? [] : [`one-page contract failed (${verified.pageCount} pages)`],
    timingMs: {
      branchesParallel: Math.round(branchMs),
      pdf: Math.round(pdfResult.ms),
      docx: Math.round(docxResult.ms),
      total: Math.round(performance.now() - wall)
    }
  };
  if (PUBLISH) {
    mkdirSync(resolve(ROOT, 'dist/resumes'), { recursive: true });
    copyFileSync(pdfPath, resolve(ROOT, 'dist/resumes', profile.pdfFilename));
    copyFileSync(docxPath, resolve(ROOT, 'dist/resumes', docxFilenameFor(profile)));
    recordPdf(profile, 'weasyprint');
  }
  writeFileSync(resolve(workDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  if (!quiet) {
    const mark = pageOk ? '✓' : '!';
    console.log(`${mark} ${profile.id} · ${verified.pageCount}pg · PDF ${(report.artifacts.pdfBytes / 1024).toFixed(0)}KB · DOCX ${(docxBytes / 1024).toFixed(0)}KB · ${report.timingMs.total}ms`);
  }
  return report;
}

async function main() {
  const wall = performance.now();
  if (DOCX_ONLY && PUBLISH) throw new Error('--publish requires PDF output');
  runBun('metrics');
  if (!existsSync(resolve(ROOT, 'assets/css/composition.css'))) {
    throw new Error('Missing assets/css/composition.css');
  }

  const { profiles: allProfiles, source } = loadAllProfiles();
  
  let pdfProfiles = allProfiles;
  if (PUBLISH) {
    const fittedPath = resolve(ROOT, 'dist/public/data.js');
    if (!existsSync(fittedPath)) throw new Error('Run bun run build before --publish');
    pdfProfiles = parseProfiles(readFileSync(fittedPath, 'utf8'));
    const originalPath = resolve(CACHE, 'profiles.full.js');
    if (!existsSync(originalPath) || JSON.stringify(parseProfiles(readFileSync(originalPath, 'utf8'))) !== JSON.stringify(allProfiles)) {
      throw new Error('Site build is stale; run bun run build before --publish');
    }
  }
  const profiles = ALL_MODE ? pdfProfiles : pdfProfiles.filter(entry => PROFILE_ID ? entry.id === PROFILE_ID : entry.fallback);

  if (!profiles.length) {
    throw new Error(ALL_MODE ? 'No profiles found' : `Profile not found: ${PROFILE_ID}`);
  }

  const canon = buildCanonSnapshot();
  const fontCanon = resolve(OUT, 'font-canon.json');
  writeFileSync(fontCanon, JSON.stringify(canon));
  await runPython('docx-fonts.py', [fontCanon, resolve(OUT, 'fonts')]);
  canon.fonts.docxFaces = JSON.parse(readFileSync(resolve(OUT, 'fonts/manifest.json'), 'utf8'));
  mkdirSync(OUT, { recursive: true });

  console.log(`▶ Pillar 3 emit · ${profiles.length} profile(s) · concurrency ${CONCURRENCY}`);
  console.log(`  canon ${canon.specVersion} · source ${source}`);
  console.log(`  out ${OUT}`);

  let completed = 0;
  const results = await mapPool(profiles, CONCURRENCY, async profile => {
    try {
      const report = await emitOne(profile, canon, { quiet: ALL_MODE, fullProfile: profile });
      completed += 1;
      if (ALL_MODE) {
        const mark = report.ok ? '✓' : '!';
        console.log(`[${completed}/${profiles.length}] ${mark} ${profile.id} · ${DOCX_ONLY ? 'DOCX' : `${report.pages}pg`} · ${report.timingMs.total}ms`);
      }
      return { status: 'ok', report };
    } catch (error) {
      completed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[${completed}/${profiles.length}] ✗ ${profile.id}: ${message}`);
      return { status: 'error', profileId: profile.id, error: message };
    }
  });

  const ok = results.filter(entry => entry.status === 'ok' && entry.report.ok);
  const warned = results.filter(entry => entry.status === 'ok' && !entry.report.ok);
  const failed = results.filter(entry => entry.status === 'error');
  if (PUBLISH && failed.length === 0 && !NO_REBUILD) runBun('build');
  const totalMs = Math.round(performance.now() - wall);

  const batch = {
    ok: failed.length === 0 && warned.length === 0,
    completed: failed.length === 0,
    mode: DOCX_ONLY ? 'docx' : (PUBLISH ? 'publish' : 'preview'),
    profiles: profiles.length,
    succeeded: ok.length,
    warned: warned.length,
    failed: failed.length,
    concurrency: CONCURRENCY,
    canonVersion: canon.specVersion,
    timingMs: { total: totalMs },
    failures: failed.map(entry => ({ id: entry.profileId, error: entry.error })),
    multipage: warned.map(entry => ({
      id: entry.report.profileId,
      pages: entry.report.pages,
      warnings: entry.report.warnings
    }))
  };
  writeFileSync(resolve(OUT, 'batch-report.json'), `${JSON.stringify(batch, null, 2)}\n`);

  console.log(`▶ Batch complete in ${(totalMs / 1000).toFixed(1)}s`);
  console.log(`  ok=${ok.length} warned=${warned.length} failed=${failed.length} concurrency=${CONCURRENCY}`);
  if (failed.length || (STRICT && warned.length)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
