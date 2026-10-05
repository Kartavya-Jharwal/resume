#!/usr/bin/env bun
/** Integrity tests for the production artifact. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { A4_MEDIA_BOX } from './pdf-verify.js';
import { loadArtifactManifest, pdfIsCurrent } from './artifact-state.js';
import { formatDateRange, formatExpectedDate, NNBSP_PIPE, typograph } from './microtype.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = resolve(ROOT, 'dist');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const variants = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8')).variants;
const variantsById = new Map(variants.map(variant => [variant.id, variant]));
const payload = readFileSync(resolve(DIST, 'public/data.js'), 'utf8');
const html = readFileSync(resolve(DIST, 'index.html'), 'utf8');
const match = payload.match(/window\.PROFILES\s*=\s*(\[[\s\S]+\]);\s*$/);
const SKIP_PDFS = process.argv.includes('--skip-pdfs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectedEducationDate(education) {
  return education.expected
    ? formatExpectedDate(education.endDate)
    : formatDateRange(education.startDate, education.endDate);
}

assert(match, 'dist/public/data.js does not match the production payload format');
const expectedRevision = `${resume.meta?.version || 'unversioned'} / ${resume.meta?.lastModified || 'unknown'}`;
assert(payload.includes(`Source: ${expectedRevision}`), `dist/public/data.js is stale (expected source revision ${expectedRevision})`);
assert(payload.includes('window.VARIANT_ALIASES'), 'production payload must include variant alias map');
assert(payload.includes('window.PROOF_ROUTER'), 'production payload must include proof router for leave-site OG previews');
const profiles = JSON.parse(match[1]);
assert(profiles.length === variants.length, 'production profile count must match variant count');
assert(new Set(profiles.map(profile => profile.id)).size === profiles.length, 'profile ids must be unique');
assert(profiles.some(profile => profile.fallback), 'a canonical fallback profile is required');
if (!SKIP_PDFS) {
  assert(
    profiles.find(profile => profile.fallback).omissions.every(omission => [
      'experienceHighlight',
      'projectHighlight',
      'skill',
      'summary',
      'coursework',
      'educationHighlight',
      'certification',
      'language'
    ].includes(omission.type)),
    'the universal resume may trim only optional bullets, excess skills, or its summary'
  );
}

assert(html.includes('newsreader-variable-roman.woff2'), 'production HTML must preload roman WOFF2');
assert(html.includes('assets/css/typesetting.css'), 'production HTML must load typesetting.css');
assert(existsSync(resolve(DIST, 'assets/css/typesetting.css')), 'dist must ship typesetting.css');
const typesettingCss = readFileSync(resolve(DIST, 'assets/css/typesetting.css'), 'utf8');
assert(/(--u:\s*14pt|--u:14pt)/.test(typesettingCss), 'dist typesetting.css must expose the 14pt unit grid');
assert(typesettingCss.includes(':root') && typesettingCss.includes('.sheet'), 'typesetting tokens must bind to the sheet surface');

const localReferences = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
  .map(result => result[1])
  .filter(reference => reference && !/^(?:https?:|#|mailto:|tel:)/.test(reference));
for (const reference of localReferences) {
  const path = reference.replace(/^\.\//, '').split(/[?#]/)[0];
  assert(existsSync(resolve(DIST, path)), `production HTML references missing asset: ${reference}`);
}

const artifactManifest = loadArtifactManifest();
const rendererHashes = {};
for (const profile of profiles) {
  assert(profile.additional?.visible === false, `${profile.id}: additional information must stay off the one-page résumé`);
  assert(Array.isArray(profile.omissions) && profile.omissions.length === 0, `${profile.id}: shorten copy rather than silently deleting content`);
  assert(profile.pdfAvailable === pdfIsCurrent(profile, artifactManifest, rendererHashes), `${profile.id}: PDF availability must reflect current content and renderer`);
  const effectiveLimits = { ...resume.custom.limits, ...(variantsById.get(profile.id)?.limits || {}) };
  assert(profile.name && profile.role && profile.family && profile.industry, `${profile.id}: identity fields are required`);
  assert(profile.family === profile.role, `${profile.id}: selector family must match role title`);
  assert(profile.category, `${profile.id}: backend category is required`);
  assert(profile.contact?.email, `${profile.id}: email is required`);
  assert(Array.isArray(profile.experience), `${profile.id}: experience must be an array`);
  profile.experience.forEach((entry, index) => {
    assert(entry.headerOrder === 'company-first' || entry.headerOrder === 'role-first',
      `${profile.id}: experience[${index}] must compile headerOrder`);
  });
  assert(profile.experience.every(entry => entry.highlights?.length), `${profile.id}: experience entries need highlights`);
  for (const entry of profile.experience) {
    if (entry.location) {
      assert(typeof entry.roleLine === 'string' && entry.roleLine.includes(entry.location),
        `${profile.id}: roleLine must include location when present`);
    }
  }
  assert(Array.isArray(profile.projects), `${profile.id}: projects must be an array`);
  assert(profile.projects.every(entry => entry.highlights?.length), `${profile.id}: project entries need highlights`);
  profile.projects.forEach((entry, index) => {
    if (entry.date) {
      assert(typeof entry.date === 'string' && entry.date.length > 0, `${profile.id}: project[${index}] must compile a date string`);
    }
  });
  const evidenceComposition = `${profile.experience.length}:${profile.projects.length}`;
  if (profile.isMasterCV) {
    assert(profile.id === 'all', `${profile.id}: only the all profile may be the master CV`);
    assert(profile.experience.length === resume.work.length, `${profile.id}: master CV must include every work entry`);
    assert(profile.projects.length === resume.projects.length, `${profile.id}: master CV must include every project`);
  } else {
    assert(profile.experience.length + profile.projects.length >= 2, `${profile.id}: curated evidence must include at least two sections`);
    assert(profile.experience.length <= effectiveLimits.experience, `${profile.id}: too many experience entries`);
    assert(profile.projects.length <= effectiveLimits.projects, `${profile.id}: too many project entries`);
    const bulletCount = profile.experience.reduce((sum, entry) => sum + entry.highlights.length, 0)
      + profile.projects.reduce((sum, entry) => sum + entry.highlights.length, 0);
    assert(bulletCount >= 4, `${profile.id}: curated evidence must include at least four bullets`);
    const allowedCompositions = new Set([
      'two-experience',
      'experience-project',
      'experience-project-rich',
      'two-projects',
      'curated'
    ]);
    assert(allowedCompositions.has(profile.composition), `${profile.id}: composition metadata is invalid`);
  }
  assert(Array.isArray(profile.education) && profile.education.length > 0, `${profile.id}: education is required`);
  assert(profile.education.length === resume.education.length, `${profile.id}: every source education entry must be compiled`);
  profile.education.forEach((entry, index) => {
    const source = resume.education[index];
    const sourceCourseNames = new Set((source.courses || []).map(course => typograph(typeof course === 'string' ? course : course.name)));
    assert(entry.institution === typograph(source.institution), `${profile.id}: education institution drifted from source`);
    assert(entry.url === (source.url || '') && entry.location === typograph(source.location || ''), `${profile.id}: education link metadata drifted from source`);
    assert(entry.studyType === typograph(source.studyType) && entry.area === typograph(source.area || (source.majors || []).join(' and ')), `${profile.id}: education degree content drifted from source`);
    assert(entry.date === expectedEducationDate(source), `${profile.id}: education date drifted from source`);
    const expectedScore = [source.score, source.academicStanding].filter(Boolean).map(typograph).join(NNBSP_PIPE) || '';
    assert(entry.score === expectedScore, `${profile.id}: education score drifted from source`);
    assert(entry.honors.every(honor => (source.highlights || []).some(value => typograph(value.replace(/\.$/, '')) === honor)), `${profile.id}: education honors drifted from source`);
    assert(entry.honors.length <= effectiveLimits.educationHighlights, `${profile.id}: too many education highlights`);
    assert(entry.courses.every(course => sourceCourseNames.has(course)), `${profile.id}: compiled coursework is not present in source`);
    assert(entry.courses.length <= effectiveLimits.coursework, `${profile.id}: too many coursework entries`);
  });
  assert(profile.additional && Array.isArray(profile.additional.skills), `${profile.id}: skills must be an array`);
  assert(Array.isArray(profile.additional.skillMap), `${profile.id}: categorized skill map must be an array`);
  const expectedTechnicalQualifications = variantsById.get(profile.id)?.content?.skills?.length
    ? true
    : (resume.skills || []).some(skill => (
      Array.isArray(skill.variants) && skill.variants.includes(profile.id)
    ));
  assert(profile.additional.enabled === expectedTechnicalQualifications, `${profile.id}: technical-qualification visibility drifted from source tags`);
  assert(
    profile.additional.skills.join('\0') === profile.additional.skillMap.flatMap(group => group.keywords).join('\0'),
    `${profile.id}: flat skills and categorized skill map must stay synchronized`
  );
  assert(profile.additional.skills.length <= effectiveLimits.skills, `${profile.id}: too many skills`);
  assert(profile.additional.skillMap.length <= effectiveLimits.skillGroups, `${profile.id}: too many skill groups`);
  assert(profile.additional.skillMap.every(group => group.keywords.length <= effectiveLimits.skillsPerGroup), `${profile.id}: too many skills in a group`);
  assert(profile.additional.leadership.length <= effectiveLimits.leadership, `${profile.id}: too many leadership entries`);
  if (expectedTechnicalQualifications) {
    assert(profile.additional.skillMap.length > 0, `${profile.id}: enabled technical qualifications require categorized skills`);
    assert(profile.additional.languages.length <= effectiveLimits.languages, `${profile.id}: too many languages`);
    assert(profile.additional.certifications.length <= effectiveLimits.certifications, `${profile.id}: too many certifications`);
  } else {
    assert(profile.additional.skillMap.length === 0, `${profile.id}: nontechnical profiles must not include a skill map`);
    assert(profile.additional.languages.length === 0, `${profile.id}: nontechnical profiles must not include languages`);
    assert(profile.additional.certifications.length === 0, `${profile.id}: nontechnical profiles must not include certifications`);
  }
  if (profile.isMasterCV) {
    assert(profile.experience.every((entry, index) => entry.highlights.length === resume.work[index].highlights.length), `${profile.id}: master CV must retain every work highlight`);
    assert(profile.projects.every((entry, index) => entry.highlights.length === resume.projects[index].highlights.length), `${profile.id}: master CV must retain every project highlight`);
  } else {
    assert(profile.experience.length <= effectiveLimits.experience, `${profile.id}: targeted resumes exceed the configured experience limit`);
    assert(profile.experience.every(entry => entry.highlights.length <= effectiveLimits.experienceHighlights), `${profile.id}: experience entries exceed the configured bullet limit`);
    assert(profile.projects.every(entry => entry.highlights.length <= effectiveLimits.projectHighlights), `${profile.id}: project entries exceed the configured bullet limit`);
  }
  if (!SKIP_PDFS) assert(profile.pdfAvailable, `${profile.id}: generated PDF must be marked available`);
  assert(variantsById.get(profile.id)?.pdfFilename === profile.pdfFilename, `${profile.id}: PDF filename drifted from variant source`);
  if (!SKIP_PDFS) assert(Array.isArray(profile.omissions), `${profile.id}: build-time omissions must be auditable`);
  assert(
    !JSON.stringify({ experience: profile.experience, projects: profile.projects }).includes('"score"'),
    `${profile.id}: compiler-only ranking fields leaked into evidence entries`
  );

  if (!SKIP_PDFS) {
    const path = resolve(DIST, 'resumes', profile.pdfFilename);
    assert(existsSync(path), `${profile.id}: PDF is missing`);
    const pdf = await PDFDocument.load(readFileSync(path));
    if (profile.isMasterCV) {
      assert(pdf.getPageCount() >= 2, `${profile.id}: master CV must remain multi-page`);
    } else {
      assert(pdf.getPageCount() === 1, `${profile.id}: targeted PDF must be one page`);
    }
    const size = pdf.getPage(0).getSize();
    assert(Math.abs(size.width - A4_MEDIA_BOX.width) < 0.5 && Math.abs(size.height - A4_MEDIA_BOX.height) < 0.5, `${profile.id}: PDF must be A4`);
  }
}

assert(readFileSync(resolve(DIST, 'CNAME'), 'utf8').trim() === 'resume.kartavya.tech', 'dist/CNAME is incorrect');
assert(!existsSync(resolve(DIST, 'roles')), 'role index and individual role pages must not be emitted');
const sitemap = readFileSync(resolve(DIST, 'sitemap.xml'), 'utf8');
const sitemapUrls = (sitemap.match(/<url>/g) || []).length;
assert(sitemapUrls >= 1, 'sitemap must include the frontend microsite gateway');
assert(sitemapUrls <= 24, 'sitemap should stay curated (gateway + fallback + priority variants)');
assert(sitemap.includes('<loc>https://resume.kartavya.tech/</loc>'), 'sitemap must contain the frontend microsite');
const robots = readFileSync(resolve(DIST, 'robots.txt'), 'utf8');
assert(robots.includes('https://resume.kartavya.tech/sitemap.xml'), 'robots.txt must advertise the sitemap');
assert(robots.includes('OAI-SearchBot'), 'robots.txt must allow OpenAI search bot');
assert(robots.includes('Claude-SearchBot'), 'robots.txt must allow Claude search bot');
assert(robots.includes('Google-Extended'), 'robots.txt must allow Google-Extended');
const llms = readFileSync(resolve(DIST, 'llms.txt'), 'utf8');
assert(existsSync(resolve(DIST, 'llms.txt')), 'llms.txt must be published at site root');
assert(/do not invent/i.test(llms), 'llms.txt must state anti-hallucination policy');
assert(llms.includes('kartavya.tech'), 'llms.txt must name parent domain');
assert(llms.includes('Preferred sources'), 'llms.txt must list preferred sources');
const ogPath = resolve(DIST, 'assets/img/og-default.png');
assert(existsSync(ogPath), 'og-default.png must be published for share cards');
assert(readFileSync(ogPath).byteLength > 1000, 'og-default.png must be a non-empty image');
assert(html.includes('profileJsonLd'), 'index.html must include Person JSON-LD');
assert(html.includes('leaveDialogPreview'), 'index.html must include leave-dialog OG preview mount');
assert(html.includes('og:image'), 'index.html must include og:image meta');
assert(html.includes('og:site_name'), 'index.html must include og:site_name');
assert(html.includes('name="keywords"') || html.includes("name=keywords") || html.includes('id="metaKeywords"'), 'index.html must include keywords meta');
assert(html.includes('agent-provenance'), 'index.html must include cold agent provenance');
assert(html.includes('ai-meta'), 'index.html must include AI metadata strip');
assert(html.includes('nojs-gate'), 'index.html must include no-JS gate');
assert(html.includes('gh-pages/resumes'), 'no-JS path must link GitHub PDF folder');
assert(/query is ignored|Query without JS/i.test(html), 'cold HTML must note query ignored without JS');
assert(/aria-busy=["']false["']/.test(html), 'cold sheet must not claim aria-busy when prefilled');
assert(existsSync(resolve(DIST, '404.html')), '404.html must be published');
assert(html.includes('Kartavya Jharwal'), 'cold HTML must identify Kartavya Jharwal');
assert(/\bKartavya\b/.test(html), 'cold HTML must include bare Kartavya alias');
assert(/polymath/i.test(html), 'cold HTML must include polymath framing');
assert(html.includes('https://kartavya.tech'), 'cold HTML must link parent domain');
assert(/rel=["']me["']/.test(html), 'index.html must include rel=me identity links');
assert(!/<section[^>]*id=["']seo-entity["'][^>]*>\s*<h1/i.test(html), 'seo-entity must not own a competing H1');
assert(/id=["']r-name["']/.test(html), 'sheet r-name remains the résumé H1');
assert(/Without JavaScript|query is ignored/i.test(llms), 'llms.txt must note query ignored without JS');
assert(llms.includes('gh-pages/resumes') || llms.includes('GITHUB_PDFS') || /github.com\/Kartavya-Jharwal\/resume/.test(llms), 'llms.txt must point humans without JS to PDF folder');

const fallbackProfile = profiles.find(profile => profile.fallback) || profiles[0];
assert(fallbackProfile, 'compiled profiles must include a fallback');
assert(html.includes(fallbackProfile.role), `cold HTML must include fallback role (${fallbackProfile.role})`);
assert(html.includes('r-name-inner'), 'cold HTML must prefill résumé name');
assert(/Kartavya Jharwal \(Kartavya\)/.test(html), 'title/entity copy must front-load Kartavya alias');

const jsonLdMatch = html.match(/<script[^>]*id=["']profileJsonLd["'][^>]*>([\s\S]*?)<\/script>/i);
assert(jsonLdMatch, 'profileJsonLd script must be present');
let jsonLd;
try {
  jsonLd = JSON.parse(jsonLdMatch[1]);
} catch (error) {
  throw new Error(`profileJsonLd must parse as JSON: ${error.message}`);
}
const graph = Array.isArray(jsonLd['@graph']) ? jsonLd['@graph'] : [jsonLd];
const person = graph.find(node => node['@type'] === 'Person');
assert(person, 'JSON-LD must include Person');
assert(person['@id'] === 'https://resume.kartavya.tech/#person', 'Person must use stable @id');
assert(person.givenName === 'Kartavya', 'Person must include givenName Kartavya');
assert(Array.isArray(person.alternateName) && person.alternateName.includes('Kartavya'), 'Person must alternateName Kartavya');
assert(Array.isArray(person.sameAs) && person.sameAs.some(url => String(url).includes('kartavya.tech')), 'Person sameAs must include parent domain');
assert(graph.some(node => node['@type'] === 'ProfilePage'), 'JSON-LD must include ProfilePage');
assert(graph.some(node => node['@type'] === 'WebSite'), 'JSON-LD must include WebSite');
assert(graph.some(node => node['@type'] === 'BreadcrumbList'), 'JSON-LD must include BreadcrumbList');

const liveProofUrl = 'https://kartavya.tech/HAC';
assert(html.includes(liveProofUrl) || html.includes('proof-hac') || llms.includes('Hult AI Collective') || llms.includes(liveProofUrl), 'cold surface must expose at least one live proof');
assert(/polymath/i.test(llms), 'llms.txt must explain polymath framing');

console.log(`✓ ${profiles.length} profiles${SKIP_PDFS ? '' : '/PDFs'} and discoverability assets passed production tests`);
