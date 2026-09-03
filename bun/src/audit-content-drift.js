#!/usr/bin/env bun
/** Audit resume highlights for generic / perfection-inflated drift. */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const variants = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8'));

const patterns = [
  [/\bworld-class\b/i, 'world-class'],
  [/\bbest-in-class\b/i, 'best-in-class'],
  [/\bcutting[- ]edge\b/i, 'cutting-edge'],
  [/\bseamless\b/i, 'seamless'],
  [/\brobust\b/i, 'robust'],
  [/\bleverag(e|ing)\b/i, 'leverage'],
  [/\bsynerg/i, 'synergy'],
  [/\bend[- ]to[- ]end\b/i, 'end-to-end'],
  [/\bholistic\b/i, 'holistic'],
  [/\btransformative\b/i, 'transformative'],
  [/\bpioneered\b/i, 'pioneered'],
  [/\brevolutioni[sz]/i, 'revolutionize'],
  [/\boptimis(e|ed|ing)|optimiz(e|ed|ing)\b/i, 'optimize'],
  [/\bdeliver(ed|ing)?\s+(exceptional|outstanding|superior)/i, 'deliver exceptional'],
  [/\b100%\b/, '100%'],
  [/\bzero\s+(errors?|defects?|failures?)\b/i, 'zero defects'],
  [/\bunprecedented\b/i, 'unprecedented'],
  [/\bstate[- ]of[- ]the[- ]art\b/i, 'state-of-the-art'],
  [/\bcomprehensive\b/i, 'comprehensive'],
  [/\bstrategic\s+vision\b/i, 'strategic vision'],
  [/\bproven\s+track\b/i, 'proven track'],
  [/\bmaximi[sz]ed\b/i, 'maximized'],
  [/\bstreamlined\b/i, 'streamlined'],
  [/\bcross[- ]functional\b/i, 'cross-functional'],
  [/\bkey\s+stakeholder/i, 'key stakeholder'],
  [/\bensur(e|ed|ing)\b/i, 'ensure'],
  [/\bsuccessfully\b/i, 'successfully'],
  [/\bcommittee-ready\b/i, 'committee-ready'],
  [/\bscan-ready\b/i, 'scan-ready'],
  [/\bdesk speed\b/i, 'desk speed'],
  [/\breplace hours of\b/i, 'replace hours of'],
  [/\bminutes of decision\b/i, 'minutes of decision'],
  [/\bcoherent finance narrative\b/i, 'coherent finance narrative'],
  [/\binstead of resetting\b/i, 'marketing clause'],
  [/\brather than opaque\b/i, 'contrast clause'],
  [/\brather than vendor\b/i, 'contrast clause'],
  [/\brather than black-box\b/i, 'contrast clause'],
  [/\brather than orphaned\b/i, 'contrast clause'],
  [/\bnot orphaned charts\b/i, 'contrast clause'],
  [/\bfirst-principles\b/i, 'first-principles (freq)'],
  [/\bopinionated\b/i, 'opinionated (freq)'],
  [/\bfirewalled\b/i, 'firewalled (freq)'],
  [/\bsignificantly|substantially|dramatically|greatly\b/i, 'weasel adverb'],
  [/\bled\b/i, 'led'],
  [/\bdrove\b/i, 'drove'],
  [/\bchampioned\b/i, 'championed'],
  [/\bowned\b/i, 'owned'],
  [/\barchitected\b/i, 'architected'],
  [/\btransformed\b/i, 'transformed'],
  [/\benabled\b/i, 'enabled'],
  [/\bempowered\b/i, 'empowered'],
];

const flags = [];

function scan(text, id, parent, kind) {
  for (const [re, label] of patterns) {
    if (re.test(text)) flags.push({ id, parent, kind, label, text });
  }
  if (/\b(improved|increased|reduced|enhanced|boosted|grew)\b/i.test(text) && !/\d/.test(text)) {
    flags.push({ id, parent, kind, label: 'impact verb w/o number', text });
  }
  // perfection inflation: absolute claims
  if (/\balways\b|\bnever failed\b|\bflawless\b|\bperfect\b|\bno errors\b/i.test(text)) {
    flags.push({ id, parent, kind, label: 'absolute perfection', text });
  }
  // long marketing gloss after em dash
  const dashParts = text.split(/[—–]/);
  if (dashParts.length >= 2) {
    const gloss = dashParts.slice(1).join('—');
    if (gloss.length > 90 && !/\d/.test(gloss)) {
      flags.push({ id, parent, kind, label: 'long unnumbered gloss after dash', text });
    }
  }
  // density of prestige adjectives
  const prestige = (text.match(/\b(flagship|committee-grade|investment-committee|board-level|institutional|enterprise-grade)\b/gi) || []).length;
  if (prestige >= 2) flags.push({ id, parent, kind, label: 'prestige stacking', text });
}

for (const w of resume.work || []) {
  for (const h of w.highlights || []) scan(h.text, h.id, w.id, 'work');
}
for (const p of resume.projects || []) {
  for (const h of p.highlights || []) scan(h.text, h.id, p.id, 'project');
  if (p.description) scan(p.description, `${p.id}#desc`, p.id, 'project-desc');
}

for (const v of variants.variants || []) {
  if (v.description) scan(v.description, v.id, v.id, 'variant-desc');
}

const by = {};
for (const f of flags) (by[f.label] ||= []).push(f);

console.log('=== FLAG COUNTS ===');
for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) {
  console.log(String(v.length).padStart(3), k);
}

const suspectLabels = new Set([
  'long unnumbered gloss after dash',
  'impact verb w/o number',
  'committee-ready',
  'scan-ready',
  'replace hours of',
  'minutes of decision',
  'coherent finance narrative',
  'marketing clause',
  'contrast clause',
  'prestige stacking',
  'end-to-end',
  'ensure',
  'successfully',
  'comprehensive',
  'robust',
  'seamless',
  'leverage',
  'optimize',
  'streamlined',
  'cross-functional',
  'key stakeholder',
  'weasel adverb',
  'absolute perfection',
  'world-class',
  'best-in-class',
  'cutting-edge',
  'transformative',
  'pioneered',
]);

const suspects = flags.filter(f => suspectLabels.has(f.label));
const byId = {};
for (const f of suspects) {
  (byId[f.id] ||= { id: f.id, parent: f.parent, kind: f.kind, labels: new Set(), text: f.text });
  byId[f.id].labels.add(f.label);
}

const ranked = Object.values(byId)
  .map(x => ({ ...x, labels: [...x.labels], score: x.labels.length }))
  .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

console.log('\n=== TOP SUSPECT BULLETS ===');
for (const item of ranked.slice(0, 40)) {
  console.log(`\n[${item.score}] ${item.id} (${item.kind})`);
  console.log('  labels:', item.labels.join(', '));
  console.log('  text:', item.text);
}

// first-principles frequency
const fp = flags.filter(f => f.label === 'first-principles (freq)');
console.log(`\n=== first-principles count: ${fp.length} ===`);
for (const f of fp) console.log('-', f.id);

writeFileSync(
  resolve(ROOT, 'bun/fixtures/content-drift-audit.json'),
  JSON.stringify({ counts: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.length])), suspects: ranked }, null, 2) + '\n'
);
console.log('\nWrote bun/fixtures/content-drift-audit.json');
