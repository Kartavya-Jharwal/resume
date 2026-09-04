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

function assertQwertyAscii(value, path) {
  if (typeof value !== 'string') {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertQwertyAscii(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) assertQwertyAscii(child, `${path}.${key}`);
    }
    return;
  }
  for (const ch of value) {
    const code = ch.codePointAt(0);
    if (code > 127) {
      errors.push(`${path} contains non-QWERTY character U+${code.toString(16).toUpperCase()}`);
      return;
    }
  }
}

const resume = readJson('data/resume.json');
const variantsDoc = readJson('data/variants.json');
const variants = requireArray(variantsDoc.variants, 'data/variants.json#variants');
assertQwertyAscii(resume, 'data/resume.json');
assertQwertyAscii(variantsDoc, 'data/variants.json');
import {
  ALLOWED_CATEGORIES,
  ALLOWED_LIMIT_KEYS,
  BANNED_METRIC_VALUES,
  CATEGORY_BY_VARIANT_ID,
  DEPRECATED_CATEGORIES,
  METRICS_KEYS,
  collectHighlightIds,
  jaccardHighlightOverlap,
  validateThreadCoverage
} from './category-taxonomy.js';
import {
  hasAllTag,
  isAllTagDeniedForHighlight,
  isAllTagDeniedForProject
} from './all-tag-policy.js';
import { ENGAGEMENT_LABELS } from './engagement-labels.js';
import { PROOF_STATUSES, loadProofRouter } from './proof-router.js';

const ALLOWED_CATEGORY_SET = new Set(ALLOWED_CATEGORIES);

const proofRouterDoc = readJson('data/proof-router.json');
assertQwertyAscii(proofRouterDoc, 'data/proof-router.json');
const proofRouter = loadProofRouter(proofRouterDoc);
const proofIds = new Set();
for (const [index, proof] of proofRouter.entries()) {
  requireText(proof.id, `proof-router.proofs[${index}].id`);
  if (proofIds.has(proof.id)) errors.push(`proof-router.proofs contains duplicate id "${proof.id}"`);
  proofIds.add(proof.id);
  if (!PROOF_STATUSES.has(proof.status)) {
    errors.push(`proof-router.proofs[${index}].status must be one of: ${[...PROOF_STATUSES].join(', ')}`);
  }
  if (proof.status === 'live') {
    if (!isWebUrl(proof.url)) errors.push(`proof-router.proofs[${index}].url must be an absolute http(s) URL when status is live`);
    requireText(proof.ogImage, `proof-router.proofs[${index}].ogImage`);
    if (proof.ogImage && !existsSync(resolve(ROOT, proof.ogImage))) {
      errors.push(`proof-router.proofs[${index}].ogImage missing on disk: ${proof.ogImage}`);
    }
  }
  for (const projectId of proof.projectIds) {
    if (!(resume.projects || []).some(project => project.id === projectId)) {
      errors.push(`proof-router.proofs[${index}] references unknown project "${projectId}"`);
    }
  }
  for (const workId of proof.workIds) {
    if (!(resume.work || []).some(work => work.id === workId)) {
      errors.push(`proof-router.proofs[${index}] references unknown work "${workId}"`);
    }
  }
}

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
for (const field of ['projectDescriptions', 'includeWorkAuthorization', 'includeSummary']) {
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
  if (!ALLOWED_CATEGORY_SET.has(variant.category)) {
    errors.push(`${path}.category "${variant.category}" is not a recognised backend category`);
  }
  if (DEPRECATED_CATEGORIES.has(variant.category)) {
    errors.push(`${path}.category "${variant.category}" is deprecated — use v2 taxonomy`);
  }
  const expectedCategory = CATEGORY_BY_VARIANT_ID[variant.id];
  if (expectedCategory && variant.category !== expectedCategory) {
    errors.push(`${path}.category "${variant.category}" should be "${expectedCategory}" per category-taxonomy map`);
  }
  if (variant.family !== undefined) {
    errors.push(`${path}.family must not be set in source — compile derives family from role`);
  }
  requireText(variant.industry, `${path}.industry`);
  requireText(variant.description, `${path}.description`);
  requireText(variant.pdfFilename, `${path}.pdfFilename`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variant.id || '')) errors.push(`${path}.id must be a lowercase kebab-case slug`);
  if (typeof variant.targeted !== 'boolean') errors.push(`${path}.targeted must be a boolean`);
  if (!Number.isFinite(variant.weight) || variant.weight < 0) errors.push(`${path}.weight must be a non-negative number`);
  if (!Array.isArray(variant.requiredKeywords)) errors.push(`${path}.requiredKeywords must be an array`);
  if (variant.metrics !== undefined) {
    const metrics = variant.metrics;
    if (typeof metrics !== 'object' || metrics === null || Array.isArray(metrics)) {
      errors.push(`${path}.metrics must be an object with four string keys`);
    } else {
      for (const key of METRICS_KEYS) {
        if (typeof metrics[key] !== 'string' || !metrics[key].trim()) {
          errors.push(`${path}.metrics.${key} must be a non-empty string`);
        } else if (BANNED_METRIC_VALUES.has(metrics[key].trim())) {
          errors.push(`${path}.metrics.${key} uses banned generic value "${metrics[key]}"`);
        }
      }
      for (const key of Object.keys(metrics)) {
        if (!METRICS_KEYS.includes(key)) errors.push(`${path}.metrics contains unknown key "${key}"`);
      }
    }
  }
  if (variant.limits !== undefined) {
    if (typeof variant.limits !== 'object' || variant.limits === null || Array.isArray(variant.limits)) {
      errors.push(`${path}.limits must be an object`);
    } else {
      for (const key of Object.keys(variant.limits)) {
        if (!ALLOWED_LIMIT_KEYS.has(key)) errors.push(`${path}.limits contains unknown key "${key}"`);
      }
    }
  }
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
  if (work.location != null && work.location !== '' && typeof work.location !== 'string') {
    errors.push(`resume.work[${index}].location must be a string when provided`);
  }
  requireText(work.id, `resume.work[${index}].id`);
  if (!work.headerOrder) {
    errors.push(`resume.work[${index}].headerOrder is required (company-first | role-first)`);
  } else if (work.headerOrder !== 'company-first' && work.headerOrder !== 'role-first') {
    errors.push(`resume.work[${index}].headerOrder must be company-first or role-first`);
  }
  if (!validDate(work.startDate || '') || !validDate(work.endDate || '')) errors.push(`resume.work[${index}] contains an invalid date`);
  for (const [highlightIndex, highlight] of requireArray(work.highlights, `resume.work[${index}].highlights`).entries()) {
    requireText(highlight.text, `resume.work[${index}].highlights[${highlightIndex}].text`);
    requireText(highlight.id, `resume.work[${index}].highlights[${highlightIndex}].id`);
    checkTags(highlight.variants, `resume.work[${index}].highlights[${highlightIndex}].variants`);
    if (hasAllTag(highlight.variants) && isAllTagDeniedForHighlight(highlight.id, work.id)) {
      errors.push(`resume.work[${index}].highlights[${highlightIndex}] carries forbidden "all" tag for parent "${work.id}"`);
    }
  }
}

for (const [index, project] of requireArray(resume.projects, 'resume.projects').entries()) {
  requireText(project.name, `resume.projects[${index}].name`);
  requireText(project.id, `resume.projects[${index}].id`);
  if (project.displayName !== undefined) requireText(project.displayName, `resume.projects[${index}].displayName`);
  if (project.engagementLabel !== undefined) {
    if (!ENGAGEMENT_LABELS.has(project.engagementLabel)) {
      errors.push(`resume.projects[${index}].engagementLabel must be one of: ${[...ENGAGEMENT_LABELS].join(', ')}`);
    }
    if (project.engagementLabel === 'Pro Bono Advisor' && (project.keywords || []).includes('client work')) {
      errors.push(`resume.projects[${index}] cannot carry keyword "client work" with Pro Bono Advisor label`);
    }
    const visibleCopy = [project.description || '', ...(project.highlights || []).map(h => h.text || '')].join('\n');
    if (/\bcoursework\b|\bcase study\b|\bcase studies\b/i.test(visibleCopy)) {
      warnings.push(`resume.projects[${index}] ("${project.id}") with engagementLabel still uses coursework/case-study language in visible copy`);
    }
  }
  if (project.engagementGroup !== undefined) requireText(project.engagementGroup, `resume.projects[${index}].engagementGroup`);
  if (project.proofId !== undefined) {
    requireText(project.proofId, `resume.projects[${index}].proofId`);
    if (!proofIds.has(project.proofId)) {
      errors.push(`resume.projects[${index}].proofId "${project.proofId}" is not in data/proof-router.json`);
    }
  }
  if (project.url && !isWebUrl(project.url)) errors.push(`resume.projects[${index}].url must be an absolute http(s) URL`);
  requireText(project.startDate, `resume.projects[${index}].startDate`);
  if (!validDate(project.startDate || '') || !validDate(project.endDate || '')) {
    errors.push(`resume.projects[${index}] contains an invalid date`);
  }
  checkTags(project.variants, `resume.projects[${index}].variants`);
  if (hasAllTag(project.variants) && isAllTagDeniedForProject(project.id)) {
    errors.push(`resume.projects[${index}] carries forbidden "all" tag on denylisted project "${project.id}"`);
  }
  for (const [highlightIndex, highlight] of requireArray(project.highlights || [], `resume.projects[${index}].highlights`).entries()) {
    requireText(highlight.text, `resume.projects[${index}].highlights[${highlightIndex}].text`);
    requireText(highlight.id, `resume.projects[${index}].highlights[${highlightIndex}].id`);
    checkTags(highlight.variants, `resume.projects[${index}].highlights[${highlightIndex}].variants`);
    if (hasAllTag(highlight.variants) && isAllTagDeniedForHighlight(highlight.id, project.id)) {
      errors.push(`resume.projects[${index}].highlights[${highlightIndex}] carries forbidden "all" tag for parent "${project.id}"`);
    }
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
  if (education.canvasCourseCount !== undefined) {
    const canvasLen = (education.canvasCourses || []).length;
    if (education.canvasCourseCount !== canvasLen) {
      warnings.push(`resume.education[${index}].canvasCourseCount (${education.canvasCourseCount}) does not match canvasCourses.length (${canvasLen})`);
    }
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
const projectHighlightIds = new Map();
const highlightVariants = new Map();
for (const work of resume.work || []) {
  for (const highlight of work.highlights || []) {
    workHighlightIds.set(highlight.id, work.id);
    highlightVariants.set(highlight.id, highlight.variants || []);
  }
}
for (const project of resume.projects || []) {
  for (const highlight of project.highlights || []) {
    projectHighlightIds.set(highlight.id, project.id);
    highlightVariants.set(highlight.id, highlight.variants || []);
  }
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
  const variantLimits = { ...limits, ...(variant.limits || {}) };
  if (!experience.length && !projects.length) {
    errors.push(`${path}.content must include at least one experience or project selection`);
  }
  const bulletCount = experience.reduce((sum, entry) => sum + requireArray(entry.highlights, `${path}.content.experience highlights`).length, 0)
    + projects.reduce((sum, entry) => sum + requireArray(entry.highlights, `${path}.content.projects highlights`).length, 0);
  if (bulletCount < 4) errors.push(`${path}.content resolves to fewer than four evidence bullets`);
  if (experience.length > variantLimits.experience) errors.push(`${path}.content.experience exceeds limit ${variantLimits.experience}`);
  if (projects.length > variantLimits.projects) errors.push(`${path}.content.projects exceeds limit ${variantLimits.projects}`);

  const seenWorkIds = new Set();
  const seenProjectIds = new Set();
  const signature = [];
  for (const [entryIndex, entry] of experience.entries()) {
    requireText(entry.id, `${path}.content.experience[${entryIndex}].id`);
    if (!workIds.has(entry.id)) errors.push(`${path}.content.experience[${entryIndex}].id references unknown work "${entry.id}"`);
    if (seenWorkIds.has(entry.id)) {
      errors.push(`${path}.content.experience lists work "${entry.id}" more than once`);
    }
    seenWorkIds.add(entry.id);
    signature.push(entry.id);
    const entryHighlights = requireArray(entry.highlights, `${path}.content.experience[${entryIndex}].highlights`);
    if (entryHighlights.length > variantLimits.experienceHighlights) {
      errors.push(`${path}.content.experience[${entryIndex}].highlights exceeds limit ${variantLimits.experienceHighlights}`);
    }
    for (const [highlightIndex, highlightId] of entryHighlights.entries()) {
      requireText(highlightId, `${path}.content.experience[${entryIndex}].highlights[${highlightIndex}]`);
      if (workHighlightIds.get(highlightId) !== entry.id) {
        errors.push(`${path}.content.experience[${entryIndex}].highlights[${highlightIndex}] does not belong to work "${entry.id}"`);
      }
    }
  }
  for (const [entryIndex, entry] of projects.entries()) {
    requireText(entry.id, `${path}.content.projects[${entryIndex}].id`);
    if (seenProjectIds.has(entry.id)) {
      errors.push(`${path}.content.projects lists project "${entry.id}" more than once`);
    }
    seenProjectIds.add(entry.id);
    signature.push(entry.id);
    const entryHighlights = requireArray(entry.highlights, `${path}.content.projects[${entryIndex}].highlights`);
    if (entryHighlights.length > variantLimits.projectHighlights) {
      errors.push(`${path}.content.projects[${entryIndex}].highlights exceeds limit ${variantLimits.projectHighlights}`);
    }
    for (const [highlightIndex, highlightId] of entryHighlights.entries()) {
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

  const menuDesignProject = (content.projects || []).find(entry => entry.id === 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform');
  const siyaWork = (content.experience || []).find(entry => entry.id === 'work-siya-the-restaurant-srbs-group');
  if (menuDesignProject && siyaWork?.highlights?.includes('work-siya-the-restaurant-srbs-group-h2')) {
    errors.push(`${path}.content must not combine Menu Design project with work-siya h2 summary bullet`);
  }

  const etaProject = (content.projects || []).find(entry => entry.id === 'proj-leased-hotel-turnaround-and-operating-model-strategy');
  const saviWork = (content.experience || []).find(entry => entry.id === 'work-savi-hotels-resorts-jaipur-india');
  const etaCapitalAnchors = new Set([
    'executive-translation-lead-private-equity-operations',
    'proptech-underwriter-designer-high-end-real-estate-pe',
    'real-estate-investment-analyst-hospitality-asset-management',
    'management-consultant-mbb-standard-corporate-turnarounds',
    'family-office-analyst-private-wealth-family-enterprise',
    'chief-of-staff-founder-led-family-owned-enterprises',
    'early-stage-operator-yc-alumni-startups',
    'founders-associate-healthcare-startup-ecosystems'
  ]);
  if (etaProject && etaCapitalAnchors.has(variant.id) && !saviWork) {
    warnings.push(`${path}.content includes leased-hotel ETA project without Savi work evidence`);
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

  const selectedHighlightIds = collectHighlightIds(content);
  const selectedList = [...selectedHighlightIds];
  const withAll = selectedList.filter(id => hasAllTag(highlightVariants.get(id)));
  const directTagged = selectedList.filter(id => highlightVariants.get(id)?.includes(variant.id));
  if (selectedList.length && directTagged.length < 2) {
    warnings.push(`${path}.content has fewer than two bullets directly tagged for this variant`);
  }
  if (selectedList.length && withAll.length / selectedList.length > 0.7) {
    warnings.push(`${path}.content relies on globally eligible ("all") bullets for ${Math.round((withAll.length / selectedList.length) * 100)}% of evidence`);
  }
}

const OVERLAP_THRESHOLD = 0.8;
for (let i = 0; i < variants.length; i += 1) {
  for (let j = i + 1; j < variants.length; j += 1) {
    const overlap = jaccardHighlightOverlap(variants[i], variants[j]);
    if (overlap >= OVERLAP_THRESHOLD) {
      warnings.push(
        `variants "${variants[i].id}" and "${variants[j].id}" share ${Math.round(overlap * 100)}% highlight overlap`
      );
    }
  }
}

validateThreadCoverage(variants, (level, message) => {
  if (level === 'error') errors.push(message);
  else warnings.push(message);
});

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
