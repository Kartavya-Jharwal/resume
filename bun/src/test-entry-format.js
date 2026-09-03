#!/usr/bin/env bun
/** v1.5.1 entry format: centered name header and role, city, country subtitle lines. */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const style = readFileSync(resolve(ROOT, 'assets/css/style.css'), 'utf8');
const typesetting = readFileSync(resolve(ROOT, 'assets/css/typesetting.css'), 'utf8');
const compile = readFileSync(resolve(ROOT, 'bun/src/compile.js'), 'utf8');
const app = readFileSync(resolve(ROOT, 'assets/js/app.js'), 'utf8');

assert(style.includes('.r-name') && /text-align:\s*center/.test(style), 'name must be centered');
assert(style.includes('font-size: var(--name-size)'), 'name must use dedicated name size token');
assert(style.includes('justify-content: center') && style.includes('.r-ctc'), 'contact row must center');
assert(style.includes('margin-top: var(--name-contact-gap)'), 'contact row must clear name descenders');
assert(style.includes('.exp-block .r-item-hdr .r-role') && style.includes('font-style: italic'), 'experience subtitle must be italic inline');
assert(style.includes('font-size: var(--s0)') && style.includes('.r-role'), 'experience subtitle uses S0');
assert(style.includes('var(--pre-sec-margin)') && style.includes('var(--label-gap)'), 'tight rhythm tokens must be wired in CSS');
assert(typesetting.includes('--name-size: 20pt') || typesetting.includes('--name-size:20pt'), 'name size must project to 20pt');
assert(typesetting.includes('--lead-in-gap'), 'lead-in gap token must exist');
assert(compile.includes('formatExperienceEntry') && compile.includes('roleLine'), 'compiler must emit roleLine');
assert(compile.includes('work.headerOrder'), 'compiler must read headerOrder from source work');
assert(app.includes('syncExperienceHeaderLayouts'), 'renderer must resolve long-title header collisions');
assert(app.includes('r-item-lead'), 'experience header must wrap company and role in a lead band');
assert(app.includes('experienceLeadLines'), 'renderer must swap lead lines by headerOrder');
assert(app.includes('pr.engagementLabel'), 'project header must render engagement label inline');

const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const withLocation = (resume.work || []).filter(entry => entry.location);
assert(withLocation.length >= 8, 'work entries must carry location metadata');
assert((resume.work || []).every(entry => entry.headerOrder === 'company-first' || entry.headerOrder === 'role-first'),
  'every work entry must declare headerOrder in source data');
const hult = (resume.work || []).find(entry => entry.id === 'work-hult-ai-collective');
assert(hult?.headerOrder === 'role-first', 'Hult AI Collective must be role-first in source');
const srbs = (resume.work || []).find(entry => entry.id === 'work-srbs-group-jaipur-india');
assert(srbs?.headerOrder === 'company-first', 'SRBS Group must be company-first in source');

console.log('✓ v1.5.1 header and experience entry-format fixtures passed');
