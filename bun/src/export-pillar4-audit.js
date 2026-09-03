#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { EVIDENCE_THREADS, THREAD_ANCHORS } from './category-taxonomy.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const variantsDoc = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8'));
const variants = variantsDoc.variants;
const payload = readFileSync(resolve(ROOT, 'dist/public/data.js'), 'utf8');
const profiles = JSON.parse(payload.match(/window\.PROFILES\s*=\s*(\[[\s\S]+\]);/)[1]);

const categories = {};
for (const variant of variants) {
  const category = variant.category || variant.role;
  if (!categories[category]) categories[category] = { pairs: [] };
  const profile = profiles.find(entry => entry.id === variant.id);
  const workIds = (variant.content?.experience || []).map(entry => entry.id);
  const projectIds = (variant.content?.projects || []).map(entry => entry.id);
  categories[category].pairs.push({
    id: variant.id,
    role: variant.role,
    industry: variant.industry,
    work: profile.experience.map(entry => entry.company),
    workIds,
    projects: profile.projects.map(entry => entry.name),
    projectIds,
    bullets: profile.experience.reduce((sum, entry) => sum + entry.highlights.length, 0)
      + profile.projects.reduce((sum, entry) => sum + entry.highlights.length, 0),
    chars: [profile.summary, ...profile.experience.flatMap(entry => entry.highlights), ...profile.projects.flatMap(entry => entry.highlights)].join(' ').length,
    skills: profile.additional?.skillMap?.length || 0,
    composition: profile.composition
  });
}

const usedProjectIds = new Set();
const usedWorkIds = new Set();
for (const variant of variants) {
  for (const entry of variant.content?.experience || []) usedWorkIds.add(entry.id);
  for (const entry of variant.content?.projects || []) usedProjectIds.add(entry.id);
}

const orphanProjects = (resume.projects || [])
  .map(entry => entry.id)
  .filter(id => !usedProjectIds.has(id));

const audit = {
  sourceRevision: `${resume.meta?.version} / ${resume.meta?.lastModified}`,
  master: {
    work: resume.work.map(entry => ({ id: entry.id, name: entry.name, bullets: entry.highlights.length, engagementCategory: entry.engagementCategory || null })),
    projects: resume.projects.map(entry => ({
      id: entry.id,
      name: entry.name,
      bullets: entry.highlights.length,
      engagementLabel: entry.engagementLabel || null,
      engagementGroup: entry.engagementGroup || null,
      url: entry.url || null
    })),
    leadership: (resume.volunteer || []).map(entry => ({ id: entry.id, name: entry.organization }))
  },
  categories: Object.entries(categories).map(([name, data]) => ({
    name,
    pairCount: data.pairs.length,
    pairs: data.pairs.sort((a, b) => a.role.localeCompare(b.role) || a.industry.localeCompare(b.industry))
  })).sort((a, b) => a.name.localeCompare(b.name)),
  variantAliases: variantsDoc.variantAliases || {},
  orphanProjects,
  evidenceThreads: {
    threads: EVIDENCE_THREADS,
    anchors: THREAD_ANCHORS
  },
  totals: {
    categories: Object.keys(categories).length,
    pairs: variants.length,
    work: resume.work.length,
    projects: resume.projects.length,
    avgBullets: Math.round(profiles.filter(profile => !profile.isMasterCV).reduce((sum, profile) => sum + profile.experience.reduce((a, e) => a + e.highlights.length, 0) + profile.projects.reduce((a, e) => a + e.highlights.length, 0), 0) / Math.max(1, profiles.filter(profile => !profile.isMasterCV).length)),
    avgChars: Math.round(profiles.filter(profile => !profile.isMasterCV).reduce((sum, profile) => sum + [profile.summary, ...profile.experience.flatMap(e => e.highlights), ...profile.projects.flatMap(e => e.highlights)].join(' ').length, 0) / Math.max(1, profiles.filter(profile => !profile.isMasterCV).length))
  },
  taxonomyNotes: [
    'Public selector remains Role → Industry; backend category (v2, 22 buckets) structures validation, audit, and coursework ranking only.',
    'VC is a category/employer archetype (industry), not a role — platform roles bifurcate as role × industry pairs.',
    'MBB, Tier-2, Turnarounds, IB, VC, Family Office, and PropTech are separate backend categories (not one Strategy blob).',
    'Product Management merged under Product Management & Platform; design split into UI/UX, Spatial, and Creative Technology categories.',
    'Evidence threads (10) guarded by per-anchor highlight requirements — see bun/src/category-taxonomy.js THREAD_ANCHORS.',
    'All 87 pairs use explicit curated content plans; shared evidence across roles is intentional.',
    'v1.15.0: `all` tag discipline — denylisted narrow-domain bullets; role-specific descriptions; see DATA_LAYER.md.',
    'Bucket depth v1.14.0: Creative Strategy & Brand (6), VC (5), Legal (3), PropTech (3), Spatial (3), AI Engineering (5).',
    'Culinary buckets A–C split stagiaire, menu/BOH consulting, and event hosting; Menu COGS project and Siya h2 never co-occur in one profile.',
    'Pillar 2 TODO: optional selectorGroup for coarse role-family collapse — family currently equals role at compile time.'
  ]
};

writeFileSync(resolve(ROOT, 'tmp/pillar4-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(`✓ Exported tmp/pillar4-audit.json (${variants.length} pairs, ${Object.keys(categories).length} categories)`);
