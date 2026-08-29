#!/usr/bin/env bun
/** Integrity tests for the production artifact. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = resolve(ROOT, 'dist');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const variants = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8')).variants;
const variantsById = new Map(variants.map(variant => [variant.id, variant]));
const payload = readFileSync(resolve(DIST, 'public/data.js'), 'utf8');
const html = readFileSync(resolve(DIST, 'index.html'), 'utf8');
const match = payload.match(/window\.PROFILES=([\s\S]+);\s*$/);
const SKIP_PDFS = process.argv.includes('--skip-pdfs');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function formatDate(value) {
  if (!value) return 'Present';
  const [year, month] = value.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return month ? `${months[Number(month) - 1]} ${year}` : year;
}

function expectedEducationDate(education) {
  return education.expected
    ? `Expected ${formatDate(education.endDate)}`
    : `${formatDate(education.startDate)} to ${formatDate(education.endDate)}`;
}

assert(match, 'dist/public/data.js does not match the production payload format');
const profiles = JSON.parse(match[1]);
assert(profiles.length === variants.length, 'production profile count must match variant count');
assert(new Set(profiles.map(profile => profile.id)).size === profiles.length, 'profile ids must be unique');
assert(profiles.some(profile => profile.fallback), 'a canonical fallback profile is required');
if (!SKIP_PDFS) {
  assert(
    profiles.find(profile => profile.fallback).omissions.every(omission => ['experienceHighlight', 'projectHighlight', 'skill', 'summary'].includes(omission.type)),
    'the universal resume may trim only optional bullets, excess skills, or its summary'
  );
}

const localReferences = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
  .map(result => result[1])
  .filter(reference => reference && !/^(?:https?:|#|mailto:|tel:)/.test(reference));
for (const reference of localReferences) {
  const path = reference.replace(/^\.\//, '').split(/[?#]/)[0];
  assert(existsSync(resolve(DIST, path)), `production HTML references missing asset: ${reference}`);
}

for (const profile of profiles) {
  const effectiveLimits = { ...resume.custom.limits, ...(variantsById.get(profile.id)?.limits || {}) };
  assert(profile.name && profile.role && profile.family && profile.industry, `${profile.id}: identity fields are required`);
  assert(profile.family === (variantsById.get(profile.id)?.family || profile.role), `${profile.id}: role family drifted from variant source`);
  assert(profile.contact?.email, `${profile.id}: email is required`);
  assert(Array.isArray(profile.experience), `${profile.id}: experience must be an array`);
  assert(profile.experience.every(entry => entry.highlights?.length), `${profile.id}: experience entries need highlights`);
  assert(Array.isArray(profile.projects), `${profile.id}: projects must be an array`);
  assert(profile.projects.every(entry => entry.highlights?.length), `${profile.id}: project entries need highlights`);
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
    const sourceCourseNames = new Set((source.courses || []).map(course => typeof course === 'string' ? course : course.name));
    assert(entry.institution === source.institution, `${profile.id}: education institution drifted from source`);
    assert(entry.url === (source.url || '') && entry.location === (source.location || ''), `${profile.id}: education link metadata drifted from source`);
    assert(entry.studyType === source.studyType && entry.area === source.area, `${profile.id}: education degree content drifted from source`);
    assert(entry.date === expectedEducationDate(source), `${profile.id}: education date drifted from source`);
    const expectedScore = [source.score, source.academicStanding].filter(Boolean).join(' | ') || '';
    assert(entry.score === expectedScore, `${profile.id}: education score drifted from source`);
    assert(entry.honors.every(honor => (source.highlights || []).some(value => value.replace(/\.$/, '') === honor)), `${profile.id}: education honors drifted from source`);
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
    assert(Math.abs(size.width - 595.276) < 0.5 && Math.abs(size.height - 841.89) < 0.5, `${profile.id}: PDF must be A4`);
  }
}

assert(readFileSync(resolve(DIST, 'CNAME'), 'utf8').trim() === 'resume.kartavya.tech', 'dist/CNAME is incorrect');
assert(!existsSync(resolve(DIST, 'roles')), 'role index and individual role pages must not be emitted');
const sitemap = readFileSync(resolve(DIST, 'sitemap.xml'), 'utf8');
assert((sitemap.match(/<url>/g) || []).length === 1, 'sitemap must expose only the frontend microsite gateway');
assert(sitemap.includes('<loc>https://resume.kartavya.tech/</loc>'), 'sitemap must contain the frontend microsite');
assert(readFileSync(resolve(DIST, 'robots.txt'), 'utf8').includes('https://resume.kartavya.tech/sitemap.xml'), 'robots.txt must advertise the sitemap');
console.log(`✓ ${profiles.length} profiles${SKIP_PDFS ? '' : '/PDFs'} and the single microsite gateway passed production tests`);
