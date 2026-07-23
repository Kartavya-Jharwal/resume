#!/usr/bin/env bun
/**
 * compile.js — adaptive resume profile compiler
 *
 * Reads data/resume.json + data/variants.json and generates
 * public/data.js — the compiled runtime profile payload that
 * drives the frontend renderer.
 *
 * Usage: bun run bun/src/compile.js [--out path] [--pdf-ready]
 * Output: public/data.js by default
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

/* ── Load sources ── */
const resume  = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf-8'));
const variantsDoc = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf-8'));
const variants = variantsDoc.variants;

const limits = resume.custom?.limits || {};
const universal = resume.custom?.universal || {};

/* ── Derive profile for each variant ── */
const profiles = variants.map(v => {
  const vid = v.id;
  const keywordBank = normaliseKeywordBank(v.requiredKeywords || []);

  /* Filter work entries: prefer exact-role highlights, then backfill with global "all" */
  const work = pickPreferredEntries(
    (resume.work || []).map(w => {
      const split = splitVariantItems(w.highlights || [], vid);
      const highlights = (split.direct.length ? split.direct : split.global)
        .slice(0, limitOrInfinity(limits.experienceHighlights))
        .map(h => h.text);
      if (!highlights.length) return null;

      return {
        company: w.name,
        role: w.position,
        date: formatDateRange(w.startDate, w.endDate),
        highlights,
        direct: split.direct.length > 0,
        global: split.direct.length === 0 && split.global.length > 0,
        featured: getFeaturedRank(universal.experience, w.name, vid),
        score: scoreEntry(keywordBank, [w.name, w.position, w.summary, ...(w.keywords || []), ...highlights]),
        recency: toComparableDate(w.endDate || '9999-12-31')
      };
    })
      .filter(Boolean)
      .sort((a, b) => (a.featured - b.featured) || Number(b.direct) - Number(a.direct) || (b.score - a.score) || (b.recency - a.recency)),
    limits.experience
  ).map(({ score, recency, direct, global, featured, ...entry }) => entry);

  /* Filter projects tagged for this variant or globally tagged with "all" */
  const projects = pickPreferredEntries(
    (resume.projects || []).map(p => {
      const projectScope = variantScope(p.variants, vid);
      if (!projectScope.direct && !projectScope.global) return null;

      const split = splitVariantItems(p.highlights || [], vid);
      const highlights = (split.direct.length ? split.direct : split.global)
        .slice(0, limitOrInfinity(limits.projectHighlights))
        .map(h => h.text);

      return {
        name: p.name,
        description: limits.projectDescriptions === false ? '' : p.description,
        highlights,
        direct: projectScope.direct || split.direct.length > 0,
        global: !(projectScope.direct || split.direct.length > 0) && (projectScope.global || split.global.length > 0),
        featured: getFeaturedRank(universal.projects, p.name, vid),
        score: scoreEntry(keywordBank, [p.name, p.description, ...(p.keywords || []), ...highlights])
      };
    })
      .filter(Boolean)
      .sort((a, b) => (a.featured - b.featured) || Number(b.direct) - Number(a.direct) || (b.score - a.score)),
    limits.projects
  ).map(({ score, direct, global, featured, ...entry }) => entry);

  /* Education (non-optional) — all education entries */
  const education = (resume.education || []).map(e => ({
    institution: e.institution,
    area: e.area,
    studyType: e.studyType,
    date: formatDateRange(e.startDate, e.endDate),
    summary: e.summary || ''
  }));

  /* Skills filtered by variant */
  const skillBuckets = partitionEntriesByVariant(
    (resume.skills || []).map(s => ({
      direct: hasExactVariant(s.variants, vid),
      global: isGlobalVariant(s.variants),
      keywords: s.keywords || []
    }))
  );
  const availableSkills = unique((skillBuckets.direct.length ? skillBuckets.direct : skillBuckets.global).flatMap(s => s.keywords || []));
  const skills = (vid === 'all' && Array.isArray(universal.skills) ? universal.skills : availableSkills)
    .slice(0, limitOrInfinity(limits.skills));

  /* Languages */
  const languages = (resume.languages || [])
    .map(l => `${l.language} (${l.fluency})`)
    .slice(0, limitOrInfinity(limits.languages));

  /* Certifications filtered by variant */
  const certificateBuckets = partitionEntriesByVariant(
    (resume.certificates || []).map(c => ({
      direct: hasExactVariant(c.variants, vid),
      global: isGlobalVariant(c.variants),
      name: c.name
    }))
  );
  const certifications = (certificateBuckets.direct.length ? certificateBuckets.direct : certificateBuckets.global)
    .map(c => c.name)
    .slice(0, limitOrInfinity(limits.certifications));

  /* Leadership / activities */
  const leadershipBuckets = partitionEntriesByVariant(
    (resume.volunteer || []).map(item => ({
      direct: hasExactVariant(item.variants, vid),
      global: isGlobalVariant(item.variants),
      organization: item.organization,
      position: item.position,
      summary: item.summary || ''
    }))
  );
  const leadership = (leadershipBuckets.direct.length ? leadershipBuckets.direct : leadershipBuckets.global)
    .map(item => `${item.organization}${item.position ? `, ${item.position}` : ''}: ${item.summary || ''}`.trim())
    .filter(Boolean)
    .slice(0, limitOrInfinity(limits.leadership));

  return {
    id: v.id,
    role: v.role,
    industry: v.industry,
    fallback: v.fallback || false,

    /* Identity */
    name: resume.basics.name,

    /* Contact — uses variant location, but canonical contact info from resume */
    contact: {
      location: v.location || resume.basics.location.city,
      email: resume.basics.email,
      phone: resume.basics.phone,
      url: resume.basics.url,
      profiles: resume.basics.profiles || []
    },

    /* Summary from variant description */
    summary: v.description || resume.basics.summary || '',

    /* Sections */
    experience: work,
    projects: projects,
    education: education,

    /* Additional info */
    additional: {
      skills: skills,
      languages: languages,
      certifications: certifications,
      workAuthorization: limits.includeWorkAuthorization === false ? '' : (resume.basics.workAuthorization || ''),
      leadership: leadership
    },

    /* PDF */
    pdfFilename: v.pdfFilename || '',
    pdfAvailable: process.argv.includes('--pdf-ready')
      ? Boolean(v.pdfFilename)
      : Boolean(v.pdfFilename && existsSync(resolve(ROOT, 'public/resumes', v.pdfFilename)))
  };
});

/* ── Generate JavaScript file ── */
const sourceRevision = `${resume.meta?.version || 'unversioned'} / ${resume.meta?.lastModified || 'unknown'}`;
const js = `/* ── Auto-generated by bun/src/compile.js — DO NOT EDIT ── */\n` +
  `/* Source: ${sourceRevision} */\n` +
  `window.PROFILES = ${JSON.stringify(profiles, null, 1)};\n`;

const outArgIndex = process.argv.indexOf('--out');
const requestedOutput = outArgIndex >= 0 ? process.argv[outArgIndex + 1] : 'public/data.js';
if (!requestedOutput) throw new Error('--out requires a path');
const outFile = resolve(ROOT, requestedOutput);
const outDir = dirname(outFile);
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, js, 'utf-8');

console.log(`✓ Compiled ${profiles.length} profiles → ${requestedOutput}`);

/* ── Helpers ── */
function formatDateRange(start, end) {
  const fmt = (d) => {
    if (!d) return 'Present';
    const [y, m] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    if (!m) return y;
    return `${months[parseInt(m)-1]} ${y}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

function hasExactVariant(tags, variantId) {
  return Array.isArray(tags) && tags.includes(variantId);
}

function isGlobalVariant(tags) {
  return !Array.isArray(tags) || tags.length === 0 || tags.includes('all');
}

function variantScope(tags, variantId) {
  return {
    direct: hasExactVariant(tags, variantId),
    global: isGlobalVariant(tags)
  };
}

function splitVariantItems(items, variantId) {
  const direct = [];
  const global = [];

  for (const item of items || []) {
    if (hasExactVariant(item.variants, variantId)) direct.push(item);
    else if (isGlobalVariant(item.variants)) global.push(item);
  }

  return { direct, global };
}

function partitionEntriesByVariant(entries) {
  const direct = [];
  const global = [];

  for (const entry of entries || []) {
    if (entry.direct) direct.push(entry);
    else if (entry.global) global.push(entry);
  }

  return { direct, global };
}

function pickPreferredEntries(entries, limit) {
  const buckets = partitionEntriesByVariant(entries);
  const max = Number.isInteger(limit) ? limit : entries.length;
  const chosen = buckets.direct.slice(0, max);
  if (chosen.length < max) {
    chosen.push(...buckets.global.slice(0, max - chosen.length));
  }
  return chosen;
}

function limitOrInfinity(value) {
  return Number.isInteger(value) ? value : Infinity;
}

function getFeaturedRank(names, name, variantId) {
  if (variantId !== 'all' || !Array.isArray(names)) return Number.MAX_SAFE_INTEGER;
  const index = names.indexOf(name);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function normaliseKeywordBank(keywords) {
  return unique(
    (keywords || [])
      .flatMap(k => String(k || '').toLowerCase().split(/[^a-z0-9+#./-]+/))
      .map(k => k.trim())
      .filter(k => k.length >= 3)
  );
}

function scoreEntry(keywordBank, parts) {
  if (!keywordBank.length) return 0;
  const haystack = parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return keywordBank.reduce((score, keyword) => (
    haystack.includes(keyword) ? score + 1 : score
  ), 0);
}

function toComparableDate(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}
