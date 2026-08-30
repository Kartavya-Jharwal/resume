#!/usr/bin/env bun
/** Validate source data before compiling the public profile payload. */

import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const errors = [];
const warnings = [];

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return {};
  }
}

function requireText(value, path) {
  if (typeof value !== 'string' || !value.trim()) errors.push(`${path} must be a non-empty string`);
}

function requireArray(value, path) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return [];
  }
  return value;
}

function checkUnique(values, path) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) errors.push(`${path} contains duplicate value "${value}"`);
    seen.add(value);
  }
}

function validDate(value) {
  return value === '' || /^\d{4}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/.test(value);
}

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const resume = readJson('data/resume.json');
const variantsDoc = readJson('data/variants.json');
const variants = requireArray(variantsDoc.variants, 'data/variants.json#variants');
const ALLOWED_CATEGORIES = new Set([
  'Executive Operations & Chief of Staff',
  'Strategy, Investment & Private Wealth',
  'Innovation Programs & Events',
  'AI Engineering',
  'Product Management',
  'Product, UX & Experience Design',
  'Growth, Content & Developer Community',
  'Data & Decision Intelligence',
  'Technical Delivery, Infrastructure & Solutions',
  'Organizational & Systems Design',
  'Hospitality & Culinary Operations',
  'Risk, Compliance & Responsible AI',
  'Legal Operations & Transaction Support'
]);

requireText(resume.meta?.version, 'resume.meta.version');
requireText(resume.meta?.lastModified, 'resume.meta.lastModified');
requireText(resume.basics?.name, 'resume.basics.name');
requireText(resume.basics?.email, 'resume.basics.email');

const limits = resume.custom?.limits || {};
for (const field of ['experience', 'experienceHighlights', 'projects', 'projectHighlights', 'skills', 'skillGroups', 'skillsPerGroup', 'educationHighlights', 'coursework']) {
  if (!Number.isInteger(limits[field]) || limits[field] < 1) {
    errors.push(`resume.custom.limits.${field} must be a positive integer`);
  }
}
for (const field of ['certifications', 'languages', 'leadership']) {
  if (!Number.isInteger(limits[field]) || limits[field] < 0) {
    errors.push(`resume.custom.limits.${field} must be a non-negative integer`);
  }
}
for (const field of ['projectDescriptions', 'includeWorkAuthorization']) {
  if (typeof limits[field] !== 'boolean') {
    errors.push(`resume.custom.limits.${field} must be a boolean`);
  }
}

for (const [field, value] of [['email', resume.basics?.email], ['phone', resume.basics?.phone]]) {
  if (/dummy|example\.com|000000/i.test(String(value || ''))) {
    errors.push(`resume.basics.${field} contains placeholder contact information`);
  }
}

const ids = variants.map((variant, index) => {
  const path = `variants[${index}]`;
  requireText(variant.id, `${path}.id`);
  requireText(variant.role, `${path}.role`);
  requireText(variant.category, `${path}.category`);
  if (!ALLOWED_CATEGORIES.has(variant.category)) {
    errors.push(`${path}.category "${variant.category}" is not a recognised backend category`);
  }
  if (variant.family !== undefined) requireText(variant.family, `${path}.family`);
  requireText(variant.industry, `${path}.industry`);
  requireText(variant.description, `${path}.description`);
  requireText(variant.pdfFilename, `${path}.pdfFilename`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant.id || '')) errors.push(`${path}.id must be a lowercase kebab-case slug`);
  if (typeof variant.targeted !== 'boolean') errors.push(`${path}.targeted must be a boolean`);
  if (!Number.isFinite(variant.weight) || variant.weight < 0) errors.push(`${path}.weight must be a non-negative number`);
  if (!Array.isArray(variant.requiredKeywords)) errors.push(`${path}.requiredKeywords must be an array`);
  return variant.id;
});

checkUnique(ids, 'variant ids');
checkUnique(variants.map(variant => variant.pdfFilename), 'variant PDF filenames');
checkUnique(variants.map(variant => `${variant.role}\0${variant.industry}`), 'selector role/context pairs');
checkUnique(variants.map(variant => variant.description.trim()), 'variant descriptions');
const fallbackVariants = variants.filter(variant => variant.fallback === true);
if (fallbackVariants.length === 0) errors.push('exactly one variant must set fallback: true');
if (fallbackVariants.length > 1) errors.push('only one variant may set fallback: true');
const knownIds = new Set(ids);

const variantAliases = variantsDoc.variantAliases || {};
for (const [alias, target] of Object.entries(variantAliases)) {
  if (!knownIds.has(target)) errors.push(`variantAliases["${alias}"] points to unknown variant "${target}"`);
  if (knownIds.has(alias)) errors.push(`variantAliases["${alias}"] collides with an active variant id`);
}

function checkTags(tags, path) {
  for (const tag of requireArray(tags, path)) {
    if (tag !== 'all' && !knownIds.has(tag)) errors.push(`${path} references undefined variant "${tag}"`);
  }
}

for (const [index, work] of requireArray(resume.work, 'resume.work').entries()) {
  requireText(work.name, `resume.work[${index}].name`);
  requireText(work.position, `resume.work[${index}].position`);
  requireText(work.id, `resume.work[${index}].id`);
  if (!validDate(work.startDate || '') || !validDate(work.endDate || '')) errors.push(`resume.work[${index}] contains an invalid date`);
  for (const [highlightIndex, highlight] of requireArray(work.highlights, `resume.work[${index}].highlights`).entries()) {
    requireText(highlight.text, `resume.work[${index}].highlights[${highlightIndex}].text`);
    requireText(highlight.id, `resume.work[${index}].highlights[${highlightIndex}].id`);
    checkTags(highlight.variants, `resume.work[${index}].highlights[${highlightIndex}].variants`);
  }
}

for (const [index, project] of requireArray(resume.projects, 'resume.projects').entries()) {
  requireText(project.name, `resume.projects[${index}].name`);
  requireText(project.id, `resume.projects[${index}].id`);
  if (project.displayName !== undefined) requireText(project.displayName, `resume.projects[${index}].displayName`);
  checkTags(project.variants, `resume.projects[${index}].variants`);
  for (const [highlightIndex, highlight] of requireArray(project.highlights || [], `resume.projects[${index}].highlights`).entries()) {
    requireText(highlight.text, `resume.projects[${index}].highlights[${highlightIndex}].text`);
    requireText(highlight.id, `resume.projects[${index}].highlights[${highlightIndex}].id`);
    checkTags(highlight.variants, `resume.projects[${index}].highlights[${highlightIndex}].variants`);
  }
}

for (const [index, education] of requireArray(resume.education, 'resume.education').entries()) {
  requireText(education.institution, `resume.education[${index}].institution`);
  requireText(education.studyType, `resume.education[${index}].studyType`);
  if (education.url && !isWebUrl(education.url)) errors.push(`resume.education[${index}].url must be an absolute http(s) URL`);
  if (education.location !== undefined) requireText(education.location, `resume.education[${index}].location`);
  if (!validDate(education.startDate || '') || !validDate(education.endDate || '')) errors.push(`resume.education[${index}] contains an invalid date`);
  if (education.expected !== undefined && typeof education.expected !== 'boolean') {
    errors.push(`resume.education[${index}].expected must be a boolean when provided`);
  }
  if (education.score !== undefined && education.score !== '') requireText(education.score, `resume.education[${index}].score`);
  const courseNames = [];
  for (const [courseIndex, course] of requireArray(education.courses || [], `resume.education[${index}].courses`).entries()) {
    const coursePath = `resume.education[${index}].courses[${courseIndex}]`;
    if (typeof course === 'string') {
      requireText(course, coursePath);
      courseNames.push(course);
    } else {
      requireText(course?.name, `${coursePath}.name`);
      courseNames.push(course?.name);
      const keywords = requireArray(course?.keywords, `${coursePath}.keywords`);
      if (!keywords.length) {
        errors.push(`${coursePath}.keywords must contain at least one relevance keyword`);
      }
      for (const [keywordIndex, keyword] of keywords.entries()) {
        requireText(keyword, `${coursePath}.keywords[${keywordIndex}]`);
      }
      checkUnique(keywords, `${coursePath}.keywords`);
    }
  }
  checkUnique(courseNames, `resume.education[${index}].courses`);
  for (const [highlightIndex, highlight] of requireArray(education.highlights || [], `resume.education[${index}].highlights`).entries()) {
    requireText(highlight, `resume.education[${index}].highlights[${highlightIndex}]`);
  }
}

for (const [index, skill] of requireArray(resume.skills || [], 'resume.skills').entries()) {
  requireText(skill.name, `resume.skills[${index}].name`);
  requireText(skill.id, `resume.skills[${index}].id`);
  if (skill.label !== undefined) requireText(skill.label, `resume.skills[${index}].label`);
  const keywords = requireArray(skill.keywords, `resume.skills[${index}].keywords`);
  if (!keywords.length) {
    errors.push(`resume.skills[${index}].keywords must contain at least one skill`);
  }
  for (const [keywordIndex, keyword] of keywords.entries()) {
    requireText(keyword, `resume.skills[${index}].keywords[${keywordIndex}]`);
  }
  checkUnique(keywords, `resume.skills[${index}].keywords`);
}

for (const field of ['skills', 'certificates', 'volunteer']) {
  for (const [index, entry] of requireArray(resume[field] || [], `resume.${field}`).entries()) {
    if (entry.id !== undefined) requireText(entry.id, `resume.${field}[${index}].id`);
    checkTags(entry.variants, `resume.${field}[${index}].variants`);
  }
}

const workIds = new Set((resume.work || []).map(entry => entry.id));
const projectIds = new Set((resume.projects || []).map(entry => entry.id));
const skillIds = new Set((resume.skills || []).map(entry => entry.id));
const leadershipIds = new Set((resume.volunteer || []).map(entry => entry.id));
const workHighlightIds = new Map();
for (const work of resume.work || []) {
  for (const highlight of work.highlights || []) workHighlightIds.set(highlight.id, work.id);
}
const projectHighlightIds = new Map();
for (const project of resume.projects || []) {
  for (const highlight of project.highlights || []) projectHighlightIds.set(highlight.id, project.id);
}

const evidenceSignatures = new Map();
for (const [index, variant] of variants.entries()) {
  const path = `variants[${index}]`;
  if (!variant.content) {
    errors.push(`${path}.content is required for explicit variant selection`);
    continue;
  }
  const content = variant.content;
  const experience = requireArray(content.experience, `${path}.content.experience`);
  const projects = requireArray(content.projects, `${path}.content.projects`);
  if (!experience.length && !projects.length) {
    errors.push(`${path}.content must include at least one experience or project selection`);
  }
  const bulletCount = experience.reduce((sum, entry) => sum + requireArray(entry.highlights, `${path}.content.experience highlights`).length, 0)
    + projects.reduce((sum, entry) => sum + requireArray(entry.highlights, `${path}.content.projects highlights`).length, 0);
  if (bulletCount < 4) errors.push(`${path}.content resolves to fewer than four evidence bullets`);
  if (experience.length > limits.experience) errors.push(`${path}.content.experience exceeds resume.custom.limits.experience`);
  if (projects.length > limits.projects) errors.push(`${path}.content.projects exceeds resume.custom.limits.projects`);

  const signature = [];
  for (const [entryIndex, entry] of experience.entries()) {
    requireText(entry.id, `${path}.content.experience[${entryIndex}].id`);
    if (!workIds.has(entry.id)) errors.push(`${path}.content.experience[${entryIndex}].id references unknown work "${entry.id}"`);
    signature.push(entry.id);
    for (const [highlightIndex, highlightId] of requireArray(entry.highlights, `${path}.content.experience[${entryIndex}].highlights`).entries()) {
      requireText(highlightId, `${path}.content.experience[${entryIndex}].highlights[${highlightIndex}]`);
      if (workHighlightIds.get(highlightId) !== entry.id) {
        errors.push(`${path}.content.experience[${entryIndex}].highlights[${highlightIndex}] does not belong to work "${entry.id}"`);
      }
    }
  }
  for (const [entryIndex, entry] of projects.entries()) {
    requireText(entry.id, `${path}.content.projects[${entryIndex}].id`);
    signature.push(entry.id);
    for (const [highlightIndex, highlightId] of requireArray(entry.highlights, `${path}.content.projects[${entryIndex}].highlights`).entries()) {
      requireText(highlightId, `${path}.content.projects[${entryIndex}].highlights[${highlightIndex}]`);
      if (projectHighlightIds.get(highlightId) !== entry.id) {
        errors.push(`${path}.content.projects[${entryIndex}].highlights[${highlightIndex}] does not belong to project "${entry.id}"`);
      }
    }
  }
  const signatureKey = signature.join('|');
  if (evidenceSignatures.has(signatureKey)) {
    warnings.push(`${path}.content duplicates evidence signature used by "${evidenceSignatures.get(signatureKey)}"`);
  } else {
    evidenceSignatures.set(signatureKey, variant.id);
  }

  for (const [skillIndex, skillId] of requireArray(content.skills || [], `${path}.content.skills`).entries()) {
    requireText(skillId, `${path}.content.skills[${skillIndex}]`);
    if (!skillIds.has(skillId)) errors.push(`${path}.content.skills[${skillIndex}] references unknown skill group "${skillId}"`);
  }
  for (const [leadershipIndex, leadershipId] of requireArray(content.leadership || [], `${path}.content.leadership`).entries()) {
    requireText(leadershipId, `${path}.content.leadership[${leadershipIndex}]`);
    if (!leadershipIds.has(leadershipId)) errors.push(`${path}.content.leadership[${leadershipIndex}] references unknown leadership entry "${leadershipId}"`);
  }

  const menuCogsProject = (content.projects || []).find(entry => entry.id === 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform');
  const siyaWork = (content.experience || []).find(entry => entry.id === 'work-siya-the-restaurant-srbs-group');
  if (menuCogsProject && siyaWork?.highlights?.includes('work-siya-the-restaurant-srbs-group-h2')) {
    errors.push(`${path}.content must not combine Menu COGS project with work-siya h2 summary bullet`);
  }

  const margadarshakaEntry = (content.experience || []).find(entry => entry.id === 'work-margadarshaka');
  const margHighlights = margadarshakaEntry?.highlights || [];
  const margAllowH0H1 = new Set([
    'forward-deployed-innovator-enterprise-ai',
    'agentic-systems-architect-autonomous-ai-labs',
    'core-ai-pipeline-engineer-biotech',
    'customer-facing-founding-engineer-pre-seed-saas',
    'ai-governance-ethics-officer-medtech',
    'autodidact-skunkworks-researcher-corporate-rd-labs',
    'systematic-organizational-designer-deeptech-skunkworks',
    'devops-associate-startup-accelerators'
  ]);
  if (margHighlights.includes('work-margadarshaka-h0') && margHighlights.includes('work-margadarshaka-h1') && !margAllowH0H1.has(variant.id)) {
    warnings.push(`${path}.content uses default Margadarshaka h0+h1 pair outside AI-engineering clusters`);
  }

  const culinaryBucketIds = new Set([
    'culinary-stagiaire-michelin-fine-dining-kitchens',
    'back-of-house-logistics-coordinator-high-volume-catering',
    'gastronomic-systems-operator-culinary-consulting',
    'front-of-house-reception-associate-hotels-restaurants',
    'event-hospitality-experience-host-corporate-events-luxury-hospitality'
  ]);
  if (culinaryBucketIds.has(variant.id)) {
    for (const entry of content.experience || []) {
      if (entry.id === 'work-margadarshaka' || entry.id === 'work-astropatshala') {
        warnings.push(`${path}.content includes non-hospitality work "${entry.id}" in culinary bucket`);
      }
    }
  }
}

const LEGAL_CLAIM_RE = /\b(?:legal advice|represented client|attorney|solicitor|advocate)\b/i;
for (const project of resume.projects || []) {
  if (!project.id?.includes('legal-documentation')) continue;
  for (const highlight of project.highlights || []) {
    if (LEGAL_CLAIM_RE.test(highlight.text || '')) {
      errors.push(`${project.id} highlight "${highlight.id}" contains regulated legal-practice language`);
    }
  }
}

const universal = resume.custom?.universal || {};
const sourceNames = {
  experience: new Set((resume.work || []).map(entry => entry.name)),
  projects: new Set((resume.projects || []).map(entry => entry.name)),
  skills: new Set((resume.skills || []).flatMap(entry => entry.keywords || []))
};
for (const field of ['experience', 'projects', 'skills']) {
  const values = requireArray(universal[field], `resume.custom.universal.${field}`);
  checkUnique(values, `resume.custom.universal.${field}`);
  for (const value of values) {
    if (!sourceNames[field].has(value)) {
      errors.push(`resume.custom.universal.${field} references unknown value "${value}"`);
    }
  }
  if (values.length > limits[field]) {
    errors.push(`resume.custom.universal.${field} contains more values than resume.custom.limits.${field}`);
  }
}

const referencedIds = new Set();
const collect = tags => (tags || []).forEach(tag => tag !== 'all' && referencedIds.add(tag));
for (const work of resume.work || []) for (const highlight of work.highlights || []) collect(highlight.variants);
for (const project of resume.projects || []) {
  collect(project.variants);
  for (const highlight of project.highlights || []) collect(highlight.variants);
}
for (const field of ['skills', 'certificates', 'volunteer']) for (const entry of resume[field] || []) collect(entry.variants);
for (const id of ids) {
  if (id !== 'all' && !referencedIds.has(id)) warnings.push(`variant "${id}" has no directly tagged content and will rely on global fallbacks`);
}

const expectedRevision = `${resume.meta?.version || 'unversioned'} / ${resume.meta?.lastModified || 'unknown'}`;
const distDataPath = resolve(ROOT, 'dist/public/data.js');
if (existsSync(distDataPath)) {
  const payload = readFileSync(distDataPath, 'utf8');
  if (!payload.includes(`Source: ${expectedRevision}`)) {
    warnings.push(`dist/public/data.js is stale (expected source revision ${expectedRevision})`);
  }
  if (!payload.includes('window.VARIANT_ALIASES')) {
    warnings.push('dist/public/data.js is missing window.VARIANT_ALIASES');
  }
  const profileMatch = payload.match(/window\.PROFILES\s*=\s*(\[[\s\S]+\]);/);
  const revisionStale = !payload.includes(`Source: ${expectedRevision}`);
  if (profileMatch) {
    const compiledProfiles = JSON.parse(profileMatch[1]);
    if (compiledProfiles.length !== variants.length) {
      const message = `dist/public/data.js profile count (${compiledProfiles.length}) does not match source variants (${variants.length})`;
      if (revisionStale) warnings.push(`${message} — run bun run build`);
      else errors.push(message);
    }
    const compiledById = new Map(compiledProfiles.map(profile => [profile.id, profile]));
    for (const variant of variants) {
      const profile = compiledById.get(variant.id);
      if (!profile) {
        const message = `dist/public/data.js is missing compiled profile "${variant.id}"`;
        if (revisionStale) warnings.push(message);
        else errors.push(message);
        continue;
      }
      if (profile.role !== variant.role || profile.industry !== variant.industry || profile.category !== variant.category) {
        const message = `dist/public/data.js profile "${variant.id}" drifted from source role/category/industry metadata`;
        if (revisionStale) warnings.push(message);
        else errors.push(message);
      }
    }
  } else {
    warnings.push('dist/public/data.js does not expose window.PROFILES for freshness comparison');
  }
}

if (warnings.length) warnings.forEach(message => console.warn(`warning: ${message}`));
if (errors.length) {
  errors.forEach(message => console.error(`error: ${message}`));
  console.error(`\nValidation failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(`✓ Validated ${variants.length} variants and ${(resume.work || []).length} work entries (${warnings.length} warning(s))`);
