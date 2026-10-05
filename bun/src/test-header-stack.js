#!/usr/bin/env bun
/** Header stacking measure matches the Pillar 1 42% role floor. */

import assert from 'node:assert/strict';
import { buildCanonSnapshot } from './composition.js';
import { shouldStackHeader } from './header-stack.js';

const canon = buildCanonSnapshot();

assert.equal(shouldStackHeader('Acme', '', canon), false);
assert.equal(shouldStackHeader('', 'Role', canon), false);

const shortInline = shouldStackHeader('Acme Corp', 'Operator', canon);
assert.equal(shortInline, false, 'short company + role should stay inline');

const longPrimary = shouldStackHeader(
  'International Consortium for Distributed Systems Engineering Group',
  'Principal Product Manager',
  canon
);
assert.equal(longPrimary, true, 'long primary must stack');

const squeezed = shouldStackHeader(
  'Very Long Company Name That Consumes Most Of The Lead Column',
  'Senior Strategy Consultant',
  canon
);
assert.equal(squeezed, true, 'remaining lead under 42% must stack');

console.log('✓ header stacking measure');
