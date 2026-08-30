#!/usr/bin/env bun
/** Every TYPESETTING.md requirement ID must have an owner file that exists. */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ledger = readFileSync(resolve(ROOT, 'TYPESETTING_CONFORMANCE.md'), 'utf8');
const catalog = JSON.parse(readFileSync(resolve(ROOT, 'config/typesetting-requirements.json'), 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ledgerIds = [...ledger.matchAll(/\bTS-[A-Z0-9-]+\b/g)].map(match => match[0]);
const uniqueLedgerIds = [...new Set(ledgerIds)];
const catalogIds = catalog.requirements.map(item => item.id);

for (const id of uniqueLedgerIds) {
  if (id === 'TS-DEF' || id.startsWith('TS-DEF-') || id.match(/^TS-\d+$/)) continue;
  assert(catalogIds.includes(id), `ledger ID ${id} is missing from config/typesetting-requirements.json`);
}

for (const requirement of catalog.requirements) {
  assert(ledger.includes(requirement.id), `${requirement.id} is not documented in TYPESETTING_CONFORMANCE.md`);
  assert(Array.isArray(requirement.owners) && requirement.owners.length, `${requirement.id} has no owner`);
  for (const owner of requirement.owners) {
    assert(existsSync(resolve(ROOT, owner)), `${requirement.id} owner missing: ${owner}`);
  }
}

const deferred = catalog.requirements.filter(item => item.status === 'defer').map(item => item.id);
assert(deferred.includes('TS-DEF-05'), 'glyph-placed PDF must remain an explicit deferral');

console.log(`✓ ${catalog.requirements.length} typesetting requirements have owners (${deferred.length} deferred)`);
