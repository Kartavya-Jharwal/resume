#!/usr/bin/env bun
/** Integrity tests for the production artifact. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = resolve(ROOT, 'dist');
const variants = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8')).variants;
const payload = readFileSync(resolve(DIST, 'public/data.js'), 'utf8');
const html = readFileSync(resolve(DIST, 'index.html'), 'utf8');
const match = payload.match(/window\.PROFILES=([\s\S]+);\s*$/);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(match, 'dist/public/data.js does not match the production payload format');
const profiles = JSON.parse(match[1]);
assert(profiles.length === variants.length, 'production profile count must match variant count');
assert(new Set(profiles.map(profile => profile.id)).size === profiles.length, 'profile ids must be unique');
assert(profiles.some(profile => profile.fallback), 'a canonical fallback profile is required');

const localReferences = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)]
  .map(result => result[1])
  .filter(reference => reference && !/^(?:https?:|#|mailto:|tel:)/.test(reference));
for (const reference of localReferences) {
  const path = reference.replace(/^\.\//, '').split(/[?#]/)[0];
  assert(existsSync(resolve(DIST, path)), `production HTML references missing asset: ${reference}`);
}

for (const profile of profiles) {
  assert(profile.name && profile.role && profile.industry, `${profile.id}: identity fields are required`);
  assert(profile.contact?.email, `${profile.id}: email is required`);
  assert(Array.isArray(profile.experience) && profile.experience.length > 0, `${profile.id}: experience is required`);
  assert(profile.experience.every(entry => entry.highlights?.length), `${profile.id}: experience entries need highlights`);
  assert(Array.isArray(profile.education) && profile.education.length > 0, `${profile.id}: education is required`);
  assert(profile.additional && Array.isArray(profile.additional.skills), `${profile.id}: skills must be an array`);
  assert(profile.pdfAvailable, `${profile.id}: generated PDF must be marked available`);
  assert(Array.isArray(profile.omissions), `${profile.id}: build-time omissions must be auditable`);
  assert(!JSON.stringify(profile).includes('"score"'), `${profile.id}: compiler-only ranking fields leaked into output`);

  const path = resolve(DIST, 'resumes', profile.pdfFilename);
  assert(existsSync(path), `${profile.id}: PDF is missing`);
  const pdf = await PDFDocument.load(readFileSync(path));
  assert(pdf.getPageCount() === 1, `${profile.id}: PDF must be one page`);
  const size = pdf.getPage(0).getSize();
  assert(Math.abs(size.width - 595.276) < 0.5 && Math.abs(size.height - 841.89) < 0.5, `${profile.id}: PDF must be A4`);
}

assert(readFileSync(resolve(DIST, 'CNAME'), 'utf8').trim() === 'resume.kartavya.tech', 'dist/CNAME is incorrect');
const expectedRoles = new Set(profiles.map(profile => profile.role));
const roleDirectories = readdirSync(resolve(DIST, 'roles'), { withFileTypes: true }).filter(entry => entry.isDirectory());
assert(roleDirectories.length === expectedRoles.size, 'one SEO landing directory is required per role');
const sitemap = readFileSync(resolve(DIST, 'sitemap.xml'), 'utf8');
assert((sitemap.match(/<url>/g) || []).length === expectedRoles.size + 2, 'sitemap must contain root, role index, and every role page');
assert(readFileSync(resolve(DIST, 'robots.txt'), 'utf8').includes('https://resume.kartavya.tech/sitemap.xml'), 'robots.txt must advertise the sitemap');
console.log(`✓ ${profiles.length} profiles/PDFs and ${expectedRoles.size} SEO role pages passed production tests`);
