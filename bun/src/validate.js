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

const resume = readJson('data/resume.json');
const variantsDoc = readJson('data/variants.json');
const variants = requireArray(variantsDoc.variants, 'data/variants.json#variants');

requireText(resume.meta?.version, 'resume.meta.version');
requireText(resume.meta?.lastModified, 'resume.meta.lastModified');
requireText(resume.basics?.name, 'resume.basics.name');
requireText(resume.basics?.email, 'resume.basics.email');

const limits = resume.custom?.limits || {};
for (const field of ['experience', 'experienceHighlights', 'projects', 'projectHighlights', 'skills']) {
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
  checkTags(project.variants, `resume.projects[${index}].variants`);
  for (const [highlightIndex, highlight] of requireArray(project.highlights || [], `resume.projects[${index}].highlights`).entries()) {
    requireText(highlight.text, `resume.projects[${index}].highlights[${highlightIndex}].text`);
    checkTags(highlight.variants, `resume.projects[${index}].highlights[${highlightIndex}].variants`);
  }
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
