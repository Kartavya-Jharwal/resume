#!/usr/bin/env bun
/** Education subsystem fixture: separators, run-in labels, hanging indent CSS, hidden rows. */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NNBSP_PIPE, formatDateRange, formatExpectedDate } from './microtype.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const app = readFileSync(resolve(ROOT, 'assets/js/app.js'), 'utf8');
const css = readFileSync(resolve(ROOT, 'assets/css/style.css'), 'utf8');
const typesetting = readFileSync(resolve(ROOT, 'assets/css/typesetting.css'), 'utf8');
const compile = readFileSync(resolve(ROOT, 'bun/src/compile.js'), 'utf8');

assert(app.includes('\\u202f|\\u202f') || app.includes('\u202f|\u202f'), 'education separators must be NNBSP-pipe');
assert(!app.includes('aria-hidden="true"> - <'), 'ASCII hyphen location separator is forbidden');
assert(!app.includes('aria-hidden="true"> | <'), 'ASCII spaced pipe is forbidden');
assert(app.includes('Double Major:</span>'), 'colon stays attached to the education label');
assert(!app.includes('GPA: </span>') && !app.includes('GPA: <'), 'no literal space after education colon');

assert(css.includes('float: left'), 'education labels hang via per-row float, not a global column');
assert(css.includes('--edu-after-colon'), 'colon gap token is used');
assert(css.includes('--edu-colon-optical-hang'), 'colon optical hang token is used');
assert(css.includes('margin-left: var(--edu-detail-inset)'), 'education inset is the named token');
assert(css.includes('[hidden] { display: none !important; }'), 'hidden fact rows consume no box');
assert(!css.includes('.edu-fact {\n  display: grid;\n  grid-template-columns: max-content minmax(0, 1fr);'), 'global coursework-width column is rejected');
assert(css.includes('a.edu-institution:hover'), 'institution underline is hover/focus only');
assert(!/a\.edu-institution \{\s*text-decoration: underline/.test(css), 'no standing institution underline');

assert(typesetting.includes('--edu-detail-inset: 0pt'), 'mathematical education inset is 0');
assert(compile.includes('formatExpectedDate') && compile.includes('NNBSP_PIPE'), 'compiler emits education microtype');

const fixture = {
  institution: 'Northeastern University',
  location: 'London, United Kingdom',
  date: formatDateRange('2023-09', '2026-05'),
  expected: formatExpectedDate('2026-05'),
  labels: ['Double Major:', 'GPA:', 'Focus:', 'Honors:', 'Relevant Coursework:']
};
assert(fixture.date.includes('\u2013'), 'fixture dates are en-dashed');
assert(fixture.labels.every(label => label.endsWith(':') && !label.endsWith(': ')), 'labels carry the colon only');
assert(NNBSP_PIPE.length === 3, 'separator is three code points');

console.log('✓ Education hanging-indent / colon / separator fixture passed');
