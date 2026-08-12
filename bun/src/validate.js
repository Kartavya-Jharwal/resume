#!/usr/bin/env bun
/** Validate source data before compiling the public profile payload. */

import { readFileSync } from 'fs';
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
checkUnique(variants.map(variant => `${variant.family || variant.role}\0${variant.industry}`), 'selector role/context pairs');
const knownIds = new Set(ids);

function checkTags(tags, path) {
  for (const tag of requireArray(tags, path)) {
    if (tag !== 'all' && !knownIds.has(tag)) errors.push(`${path} references undefined variant "${tag}"`);
  }
}

for (const [index, work] of requireArray(resume.work, 'resume.work').entries()) {
  requireText(work.name, `resume.work[${index}].name`);
  requireText(work.position, `resume.work[${index}].position`);
  if (!validDate(work.startDate || '') || !validDate(work.endDate || '')) errors.push(`resume.work[${index}] contains an invalid date`);
  for (const [highlightIndex, highlight] of requireArray(work.highlights, `resume.work[${index}].highlights`).entries()) {
    requireText(highlight.text, `resume.work[${index}].highlights[${highlightIndex}].text`);
    checkTags(highlight.variants, `resume.work[${index}].highlights[${highlightIndex}].variants`);
  }
}

for (const [index, project] of requireArray(resume.projects, 'resume.projects').entries()) {
  requireText(project.name, `resume.projects[${index}].name`);
  if (project.displayName !== undefined) requireText(project.displayName, `resume.projects[${index}].displayName`);
  checkTags(project.variants, `resume.projects[${index}].variants`);
  for (const [highlightIndex, highlight] of requireArray(project.highlights || [], `resume.projects[${index}].highlights`).entries()) {
    requireText(highlight.text, `resume.projects[${index}].highlights[${highlightIndex}].text`);
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
    checkTags(entry.variants, `resume.${field}[${index}].variants`);
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

if (warnings.length) warnings.forEach(message => console.warn(`warning: ${message}`));
if (errors.length) {
  errors.forEach(message => console.error(`error: ${message}`));
  console.error(`\nValidation failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(`✓ Validated ${variants.length} variants and ${(resume.work || []).length} work entries (${warnings.length} warning(s))`);
