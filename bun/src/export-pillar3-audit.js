#!/usr/bin/env bun
/** Export pillar 3 PDF-engine audit: fit metrics, filename drift, and on-disk inventory. */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = resolve(ROOT, 'dist');
const FIT_REPORT = resolve(ROOT, '.build-cache/fit-report.json');
const variants = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8')).variants;
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));

const pdfsOnDisk = existsSync(resolve(DIST, 'resumes'))
  ? readdirSync(resolve(DIST, 'resumes')).filter(name => name.endsWith('.pdf'))
  : [];
const pdfSet = new Set(pdfsOnDisk);

const fitReports = existsSync(FIT_REPORT)
  ? JSON.parse(readFileSync(FIT_REPORT, 'utf8'))
  : [];
const fitById = new Map(fitReports.map(report => [report.id, report]));

const profiles = existsSync(resolve(DIST, 'public/data.js'))
  ? JSON.parse(readFileSync(resolve(DIST, 'public/data.js'), 'utf8').match(/window\.PROFILES\s*=\s*(\[[\s\S]+\]);/)?.[1] || '[]')
  : [];

const pairs = variants.map(variant => {
  const fit = fitById.get(variant.id);
  const profile = profiles.find(entry => entry.id === variant.id);
  const pdfOnDisk = pdfSet.has(variant.pdfFilename);
  return {
    id: variant.id,
    role: variant.role,
    industry: variant.industry,
    category: variant.category,
    pdfFilename: variant.pdfFilename,
    pdfOnDisk,
    pdfAvailable: Boolean(profile?.pdfAvailable),
    fit: fit
      ? {
          passes: fit.passes,
          omissionCount: fit.omissions.length,
          heavy: fit.passes > 6 || fit.omissions.length > 8,
          omissionTypes: fit.omissions.reduce((counts, omission) => {
            counts[omission.type] = (counts[omission.type] || 0) + 1;
            return counts;
          }, {})
        }
      : null
  };
});

const missing = pairs.filter(pair => !pair.pdfOnDisk);
const orphan = pdfsOnDisk.filter(filename => !variants.some(variant => variant.pdfFilename === filename));
const heavy = pairs.filter(pair => pair.fit?.heavy);
const fitMeasured = fitReports.length > 0;

const omissionTotals = fitReports.reduce((totals, report) => {
  for (const omission of report.omissions) {
    totals[omission.type] = (totals[omission.type] || 0) + 1;
  }
  return totals;
}, {});

const audit = {
  sourceRevision: `${resume.meta?.version} / ${resume.meta?.lastModified}`,
  generatedAt: new Date().toISOString(),
  totals: {
    variants: variants.length,
    pdfsOnDisk: pdfsOnDisk.length,
    missingPdfs: missing.length,
    orphanPdfs: orphan.length,
    pdfAvailableInPayload: pairs.filter(pair => pair.pdfAvailable).length,
    fitMeasured,
    fitProfiles: fitReports.length,
    heavyFitting: heavy.length,
    maxFitPasses: fitMeasured ? Math.max(...fitReports.map(report => report.passes)) : 0,
    maxOmissions: fitMeasured ? Math.max(...fitReports.map(report => report.omissions.length)) : 0,
    totalOmissions: fitMeasured ? fitReports.reduce((sum, report) => sum + report.omissions.length, 0) : 0
  },
  omissionTotals,
  gates: {
    allVariantsFit: fitMeasured && fitReports.length === variants.length,
    filenameDriftResolved: missing.length === 0 && orphan.length === 0,
    allPdfsOnDisk: missing.length === 0,
    payloadMatchesDisk: pairs.every(pair => pair.pdfAvailable === pair.pdfOnDisk),
    heavyFittingUnderControl: heavy.length === 0
  },
  heavyFitting: heavy
    .sort((a, b) => (b.fit.passes - a.fit.passes) || (b.fit.omissionCount - a.fit.omissionCount))
    .map(pair => ({
      id: pair.id,
      role: pair.role,
      industry: pair.industry,
      passes: pair.fit.passes,
      omissions: pair.fit.omissionCount,
      omissionTypes: pair.fit.omissionTypes
    })),
  missingPdfs: missing.map(pair => ({
    id: pair.id,
    pdfFilename: pair.pdfFilename,
    fit: pair.fit
  })),
  orphanPdfs: orphan.sort(),
  pairs
};

writeFileSync(resolve(ROOT, 'tmp/pillar3-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');

const gateLines = [
  `# Pillar 3 Audit Gates (${new Date().toISOString().slice(0, 10)})`,
  '',
  `Baseline: \`tmp/pillar3-audit.json\` — **${audit.totals.variants} variants**, ${audit.totals.pdfsOnDisk} PDFs on disk, ${audit.totals.missingPdfs} missing, ${audit.totals.orphanPdfs} orphan.`,
  '',
  '## Gate status',
  '',
  `| Gate | Status | Notes |`,
  `|------|--------|-------|`,
  `| A4 fit measured for every variant | ${audit.gates.allVariantsFit ? '**PASS**' : '**BLOCKED**'} | ${fitMeasured ? `${fitReports.length}/${variants.length} profiles measured` : 'run \`bun run fit:measure\` first'} |`,
  `| PDF filename drift resolved | ${audit.gates.filenameDriftResolved ? '**PASS**' : '**FAIL**'} | ${missing.length} missing, ${orphan.length} orphan (pillar 4 ATS renames) |`,
  `| All variant PDFs on disk | ${audit.gates.allPdfsOnDisk ? '**PASS**' : '**FAIL**'} | ${variants.length - missing.length}/${variants.length} present |`,
  `| \`pdfAvailable\` consistent with disk | ${audit.gates.payloadMatchesDisk ? '**PASS**' : '**FAIL**'} | ${audit.totals.pdfAvailableInPayload}/${variants.length} marked available |`,
  `| Heavy fitting under control | ${audit.gates.heavyFittingUnderControl ? '**PASS**' : '**WARN**'} | ${heavy.length} profile(s) exceed 6 passes or 8 omissions |`,
  '',
  '## Engine backlog (not variant filenames)',
  '',
  '- Omission policy: coursework/honors tails before evidence bullets (implemented in `removeNextOptional`).',
  '- PDF verification extracted to `bun/src/pdf-verify.js` (A4, fonts, raster ban, Title metadata).',
  '- Deferred: PDF/UA validator (TS-15-03), glyph-placed PDF/A engine (TS-19-04 / TS-DEF-05).',
  '',
  '## Heavy fitting (top 10)',
  '',
  '| Variant ID | Passes | Omissions |',
  '|------------|--------|-----------|',
  ...audit.heavyFitting.slice(0, 10).map(entry => `| \`${entry.id}\` | ${entry.passes} | ${entry.omissions} |`),
  '',
  '## Omission totals (all profiles)',
  '',
  ...Object.entries(omissionTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `- **${type}**: ${count}`),
  '',
  '## Next actions',
  '',
  '1. Re-run `bun run fit:measure` after engine changes and compare heavy-fit counts.',
  '2. `bun run build:pdf --yes` when variant filenames are ready (~45 min).',
  '3. `bun run test:pdf` for full verification.',
  '4. Triage remaining heavy-fitting profiles via pillar 4 content trims if needed.',
  ''
];

writeFileSync(resolve(ROOT, 'tmp/pillar3-audit-gates.md'), gateLines.join('\n'), 'utf8');

console.log(`✓ Exported tmp/pillar3-audit.json (${variants.length} variants, ${missing.length} missing PDFs, ${heavy.length} heavy-fit)`);
console.log(`✓ Wrote tmp/pillar3-audit-gates.md`);
