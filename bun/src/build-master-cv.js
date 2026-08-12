#!/usr/bin/env bun
/** Build the private canonical master CV with the production CSS renderer. */

import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HTML_OUTPUT = resolve(ROOT, 'Kartavya_Jharwal_Master_CV_ATS.html');
const PDF_OUTPUT = resolve(ROOT, 'Kartavya_Jharwal_Master_CV_ATS.pdf');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const asciiDashes = value => String(value).replace(/[\u2013\u2014\u2011]/g, '-');

function formatDate(value) {
  if (!value) return 'Present';
  const [year, month] = String(value).split('-');
  if (!month) return year;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(month) - 1]} ${year}`;
}

function formatDateRange(start, end) {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function textHighlights(items) {
  return (items || []).map(item => typeof item === 'string' ? item : item.text).filter(Boolean);
}

function buildMasterProfile() {
  const work = (resume.work || []).map(item => ({
    company: item.name,
    role: item.position,
    date: formatDateRange(item.startDate, item.endDate),
    highlights: textHighlights(item.highlights)
  }));

  const leadership = (resume.volunteer || []).map(item => ({
    company: item.organization,
    role: item.position,
    date: formatDateRange(item.startDate, item.endDate),
    highlights: [item.summary].filter(Boolean)
  }));

  return {
    id: '__canonical_master__',
    role: 'Canonical Master CV',
    family: 'Canonical Master CV',
    industry: 'Private source preview',
    isMasterCV: true,
    composition: 'master',
    name: resume.basics.name,
    contact: {
      location: resume.basics.location?.city || '',
      email: resume.basics.email || '',
      phone: resume.basics.phone || '',
      url: resume.basics.url || '',
      profiles: resume.basics.profiles || []
    },
    summary: resume.basics.summary || '',
    experience: [...work, ...leadership],
    projects: (resume.projects || [])
      .slice()
      .sort((a, b) => (a.masterOrder || 0) - (b.masterOrder || 0))
      .map(item => ({
      name: item.displayName || item.name,
      description: item.description || '',
      highlights: textHighlights(item.highlights)
      })),
    education: (resume.education || []).map(item => ({
      institution: item.institution,
      school: item.school || '',
      url: item.url || '',
      location: item.location || '',
      area: (item.majors || []).join(' and ') || item.area || '',
      studyType: item.studyType || '',
      date: item.expected ? `Expected ${formatDate(item.endDate)}` : formatDateRange(item.startDate, item.endDate),
      score: [item.score, item.academicStanding].filter(Boolean).join(' | '),
      summary: item.summary || '',
      honors: textHighlights(item.highlights).map(value => value.replace(/\.$/, '')),
      courses: [
        ...(item.canvasCourses || []),
        ...(item.additionalCourses || [])
      ]
    })),
    additional: {
      skillMap: (resume.skills || []).map(group => ({
        name: group.name,
        label: group.label || group.name,
        level: group.level || '',
        keywords: group.keywords || []
      })),
      skills: [],
      languages: (resume.languages || []).map(item => `${item.language} (${item.fluency})`),
      certifications: (resume.certificates || []).map(item => `${item.name}${item.issuer ? `, ${item.issuer}` : ''}`),
      workAuthorization: resume.basics.workAuthorization || '',
      leadership: []
    },
    pdfFilename: '',
    pdfAvailable: false
  };
}

const bundle = await Bun.build({
  entrypoints: [resolve(ROOT, 'assets/js/app.js')],
  target: 'browser',
  minify: true,
  sourcemap: 'none',
  write: false
});
if (!bundle.success) throw new Error(bundle.logs.map(log => log.message).join('\n'));
const appSource = asciiDashes(await bundle.outputs[0].text()).replace(/<\/script/gi, '<\\/script');
const profileSource = asciiDashes(JSON.stringify([buildMasterProfile()])).replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>${resume.basics.name} | Canonical Master CV</title>
  <link rel="stylesheet" href="assets/css/tokens.css">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="master-preview">
  <div class="app">
    <main class="stage">
      <div class="wrap" id="wrap">
        <div class="sheet is-master-cv" id="sheet" data-sheet-format="a4" data-a4-mode="master" data-a4-truncated="false">
          <h1 id="r-name" class="r-name"></h1>
          <div id="r-ctc" class="r-ctc"></div>
          <section id="r-summary" class="r-sec" aria-labelledby="r-summary-label"></section>
          <section id="r-experience" class="r-sec" aria-labelledby="r-experience-label"></section>
          <section id="r-projects" class="r-sec" aria-labelledby="r-projects-label"></section>
          <section id="r-education" class="r-sec" aria-labelledby="r-education-label"></section>
          <section id="r-additional" class="r-sec" aria-labelledby="r-additional-label"></section>
        </div>
      </div>
    </main>
  </div>
  <script>window.PROFILES=${profileSource};</script>
  <script type="module">${appSource}</script>
</body>
</html>
`;

writeFileSync(HTML_OUTPUT, html);

const python = resolve(process.env.USERPROFILE || 'C:/Users/KJ', '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
if (!existsSync(python)) throw new Error(`Bundled Python runtime not found: ${python}`);
const typeset = Bun.spawnSync([python, resolve(ROOT, 'bun/src/typeset-master-cv.py')], {
  cwd: ROOT,
  stdout: 'inherit',
  stderr: 'inherit'
});
if (typeset.exitCode !== 0) throw new Error(`Master PDF typesetting failed with exit code ${typeset.exitCode}`);

for (const stalePublicCopy of [
  resolve(ROOT, 'public/resumes/Kartavya_Jharwal_Master_CV_ATS.pdf'),
  resolve(ROOT, 'dist/resumes/Kartavya_Jharwal_Master_CV_ATS.pdf')
]) {
  if (existsSync(stalePublicCopy)) rmSync(stalePublicCopy);
}

console.log('Wrote the private canonical master HTML and root-only PDF. The HTML uses the production CSS renderer; the PDF uses the dedicated paginated master layout.');
