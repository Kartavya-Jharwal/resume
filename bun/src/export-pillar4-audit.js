#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const variants = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8')).variants;
const payload = readFileSync(resolve(ROOT, 'dist/public/data.js'), 'utf8');
const profiles = JSON.parse(payload.match(/window\.PROFILES\s*=\s*([\s\S]+);\s*$/)[1]);

const families = {};
for (const variant of variants) {
  const family = variant.family || variant.role;
  if (!families[family]) families[family] = { role: variant.role, pairs: [] };
  const profile = profiles.find(entry => entry.id === variant.id);
  families[family].pairs.push({
    industry: variant.industry,
    id: variant.id,
    work: profile.experience.map(entry => entry.company),
    projects: profile.projects.map(entry => entry.name),
    bullets: profile.experience.reduce((sum, entry) => sum + entry.highlights.length, 0)
      + profile.projects.reduce((sum, entry) => sum + entry.highlights.length, 0),
    chars: [profile.summary, ...profile.experience.flatMap(entry => entry.highlights), ...profile.projects.flatMap(entry => entry.highlights)].join(' ').length,
    skills: profile.additional?.skillMap?.length || 0
  });
}

const audit = {
  master: {
    work: resume.work.map(entry => ({ id: entry.id, name: entry.name, bullets: entry.highlights.length })),
    projects: resume.projects.map(entry => ({ id: entry.id, name: entry.name, bullets: entry.highlights.length })),
    leadership: (resume.volunteer || []).map(entry => ({ id: entry.id, name: entry.organization }))
  },
  families: Object.entries(families).map(([name, data]) => ({ name, role: data.role, pairCount: data.pairs.length, pairs: data.pairs })),
  totals: {
    families: Object.keys(families).length,
    pairs: variants.length,
    work: resume.work.length,
    projects: resume.projects.length,
    avgBullets: Math.round(profiles.reduce((sum, profile) => sum + profile.experience.reduce((a, e) => a + e.highlights.length, 0) + profile.projects.reduce((a, e) => a + e.highlights.length, 0), 0) / profiles.length),
    avgChars: Math.round(profiles.reduce((sum, profile) => sum + [profile.summary, ...profile.experience.flatMap(e => e.highlights), ...profile.projects.flatMap(e => e.highlights)].join(' ').length, 0) / profiles.length)
  },
  taxonomyNotes: [
    'Strategy & Investment remains the largest navigation cluster with nine industries across four role titles.',
    'Consultant groups Data Visualization and Organizational Design under one family label; consider splitting if the selector feels overloaded.',
    'Agricultural Technology is agri-food evidence (PACA / PACAKATVA), not farm hardware; rename before external use if needed.',
    'All 59 pairs now use explicit curated content: typically three work entries and two projects with unique evidence signatures.'
  ]
};

writeFileSync(resolve(ROOT, 'tmp/pillar4-audit.json'), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log('✓ Exported tmp/pillar4-audit.json');
