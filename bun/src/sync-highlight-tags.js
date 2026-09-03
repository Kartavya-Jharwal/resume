#!/usr/bin/env bun
/** Sync highlight.variants tags from explicit content plans (source of truth for usage). */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { collectHighlightIds } from './category-taxonomy.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resumePath = resolve(ROOT, 'data/resume.json');
const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
const variants = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8')).variants;

const usedIn = new Map();
for (const v of variants) {
  for (const id of collectHighlightIds(v.content)) {
    if (!usedIn.has(id)) usedIn.set(id, new Set());
    usedIn.get(id).add(v.id);
  }
}

let added = 0;
function syncHighlights(entries) {
  for (const entry of entries) {
    for (const h of entry.highlights || []) {
      const used = usedIn.get(h.id);
      if (!used) continue;
      if (!Array.isArray(h.variants)) h.variants = [];
      const tagSet = new Set(h.variants);
      for (const vid of used) {
        if (!tagSet.has(vid)) {
          h.variants.push(vid);
          tagSet.add(vid);
          added += 1;
        }
      }
      h.variants.sort();
    }
  }
}

syncHighlights(resume.work || []);
syncHighlights(resume.projects || []);

writeFileSync(resumePath, `${JSON.stringify(resume, null, 2)}\n`, 'utf8');
console.log(`✓ Synced highlight tags — added ${added} variant id(s) from content plans`);
