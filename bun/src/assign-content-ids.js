#!/usr/bin/env bun
/** Assign stable ids to resume.json work, projects, skills, volunteer, and highlights. */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resumePath = resolve(ROOT, 'data/resume.json');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function ensureUniqueId(base, used) {
  let id = base;
  let index = 2;
  while (used.has(id)) {
    id = `${base}-${index++}`;
  }
  used.add(id);
  return id;
}

const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
const used = new Set();

for (const work of resume.work || []) {
  work.id = ensureUniqueId(`work-${slugify(work.name)}`, used);
  work.highlights = (work.highlights || []).map((highlight, index) => ({
    ...highlight,
    id: highlight.id || `${work.id}-h${index}`
  }));
}

for (const project of resume.projects || []) {
  project.id = ensureUniqueId(`proj-${slugify(project.name)}`, used);
  project.highlights = (project.highlights || []).map((highlight, index) => ({
    ...highlight,
    id: highlight.id || `${project.id}-h${index}`
  }));
}

for (const skill of resume.skills || []) {
  skill.id = ensureUniqueId(`skill-${slugify(skill.name)}`, used);
}

for (const entry of resume.volunteer || []) {
  entry.id = ensureUniqueId(`lead-${slugify(entry.organization)}`, used);
}

for (const certificate of resume.certificates || []) {
  certificate.id = ensureUniqueId(`cert-${slugify(certificate.name)}`, used);
}

writeFileSync(resumePath, `${JSON.stringify(resume, null, 2)}\n`, 'utf8');
console.log(`✓ Assigned content ids in data/resume.json (${used.size} records)`);
