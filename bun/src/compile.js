#!/usr/bin/env bun
/**
 * compile.js - adaptive resume profile compiler
 *
 * Reads data/resume.json + data/variants.json and generates
 * public/data.js - the compiled runtime profile payload that
 * drives the frontend renderer.
 *
 * Usage: bun run bun/src/compile.js [--out path] [--pdf-ready]
 * Output: public/data.js by default
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

/* ── Load sources ── */
const resume  = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf-8'));
const variantsDoc = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf-8'));
const variants = variantsDoc.variants;

const globalLimits = resume.custom?.limits || {};
const universal = resume.custom?.universal || {};

/* ── Derive profile for each variant ── */
const profiles = variants.map(v => {
  const vid = v.id;
  const isMasterCV = vid === 'all';
  const limits = { ...globalLimits, ...(v.limits || {}) };
  const keywordBank = normaliseKeywordBank([
    v.role,
    v.industry,
    v.description,
    ...(v.requiredKeywords || [])
  ]);

  /* Filter work entries: prefer exact-role highlights, then backfill with global "all" */
  const workCandidates = (resume.work || []).map(w => {
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
    .sort((a, b) => (a.featured - b.featured) || Number(b.direct) - Number(a.direct) || (b.score - a.score) || (b.recency - a.recency));

  /* Filter projects tagged for this variant or globally tagged with "all" */
  const projectCandidates = (resume.projects || []).map(p => {
      const projectScope = variantScope(p.variants, vid);
      if (!projectScope.direct && !projectScope.global) return null;

      const split = splitVariantItems(p.highlights || [], vid);
      const highlights = (split.direct.length ? split.direct : split.global)
        .slice(0, limitOrInfinity(limits.projectHighlights))
        .map(h => h.text);

      return {
        name: p.displayName || p.name,
        description: limits.projectDescriptions === false ? '' : p.description,
        highlights,
        direct: projectScope.direct || split.direct.length > 0,
        global: !(projectScope.direct || split.direct.length > 0) && (projectScope.global || split.global.length > 0),
        featured: getFeaturedRank(universal.projects, p.name, vid),
        score: scoreEntry(keywordBank, [p.name, p.description, ...(p.keywords || []), ...highlights])
      };
    })
    .filter(entry => entry && entry.highlights.length)
    .sort((a, b) => (a.featured - b.featured) || Number(b.direct) - Number(a.direct) || (b.score - a.score));

  const explicitContent = !isMasterCV && v.content ? resolveExplicitContent(v.content, resume, limits) : null;
  const directWorkCount = workCandidates.filter(entry => entry.direct).length;
  const composition = explicitContent
    ? describeComposition(explicitContent.experience.length, explicitContent.projects.length)
    : directWorkCount >= 2
      ? 'two-experience'
      : directWorkCount === 1
        ? 'experience-project'
        : 'two-projects';
  const experienceLimit = explicitContent
    ? explicitContent.experience.length
    : composition === 'two-experience'
      ? 2
      : composition === 'experience-project'
        ? 1
        : 0;
  const projectLimit = explicitContent
    ? explicitContent.projects.length
    : composition === 'two-projects'
      ? 2
      : composition === 'experience-project'
        ? 1
        : 0;
  const work = isMasterCV
    ? (resume.work || []).map(w => ({
        company: w.name,
        role: w.position,
        date: formatDateRange(w.startDate, w.endDate),
        highlights: (w.highlights || []).map(h => h.text)
      }))
    : explicitContent
      ? explicitContent.experience
      : pickPreferredEntries(workCandidates, Math.min(experienceLimit, limitOrInfinity(limits.experience)))
          .map(({ score, recency, direct, global, featured, ...entry }) => entry);
  const projects = isMasterCV
    ? (resume.projects || []).map(p => ({
        name: p.displayName || p.name,
        description: p.description || '',
        highlights: (p.highlights || []).map(h => h.text)
      }))
    : explicitContent
      ? explicitContent.projects
      : pickPreferredEntries(projectCandidates, Math.min(projectLimit, limitOrInfinity(limits.projects)))
          .map(({ score, direct, global, featured, ...entry }) => entry);

/* Education (non-optional) - all education entries */
  const education = (resume.education || []).map(e => ({
    institution: e.institution,
    school: e.school || '',
    url: e.url || '',
    location: e.location || '',
    area: e.area || (e.majors || []).join(' and '),
    studyType: e.studyType,
    date: e.expected ? `Expected ${formatDate(e.endDate)}` : formatDateRange(e.startDate, e.endDate),
    score: [e.score, e.academicStanding].filter(Boolean).join(' | '),
    summary: e.summary || '',
    honors: (e.highlights || []).slice(0, limitOrInfinity(limits.educationHighlights))
      .map(item => String(item).replace(/\.$/, '')),
    courses: rankRelevantCoursework(e.courses || [], keywordBank, limits.coursework)
  }));

  /* Skills filtered by variant */
  const explicitSkillIds = explicitContent?.skillIds || null;
  const skillBuckets = partitionEntriesByVariant(
    (resume.skills || []).map(s => ({
      direct: explicitSkillIds
        ? explicitSkillIds.includes(s.id)
        : hasExactVariant(s.variants, vid),
      global: !explicitSkillIds && isGlobalVariant(s.variants),
      name: s.name,
      label: s.label || s.name,
      level: s.level || '',
      keywords: s.keywords || []
    }))
  );
  const hasTechnicalQualifications = explicitSkillIds
    ? explicitSkillIds.length > 0
    : skillBuckets.direct.length > 0;
  const availableSkillGroups = hasTechnicalQualifications ? skillBuckets.direct : [];
  const availableSkills = unique(availableSkillGroups.flatMap(s => s.keywords || []));
  const preferredSkills = vid === 'all' && Array.isArray(universal.skills) ? universal.skills : availableSkills;
  const skillMap = buildSkillMap(availableSkillGroups, preferredSkills, limits);
  const skills = skillMap.flatMap(group => group.keywords);

  /* Languages */
  const languages = (hasTechnicalQualifications ? (resume.languages || []) : [])
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
  const certifications = (hasTechnicalQualifications
    ? (certificateBuckets.direct.length ? certificateBuckets.direct : certificateBuckets.global)
    : [])
    .map(c => c.name)
    .slice(0, limitOrInfinity(limits.certifications));

  /* Leadership / activities */
  const explicitLeadershipIds = explicitContent?.leadershipIds || null;
  const leadershipBuckets = partitionEntriesByVariant(
    (resume.volunteer || []).map(item => ({
      direct: explicitLeadershipIds
        ? explicitLeadershipIds.includes(item.id)
        : hasExactVariant(item.variants, vid),
      global: !explicitLeadershipIds && isGlobalVariant(item.variants),
      organization: item.organization,
      position: item.position,
      summary: item.summary || ''
    }))
  );
  const leadership = (explicitLeadershipIds
    ? leadershipBuckets.direct
    : leadershipBuckets.direct.length
      ? leadershipBuckets.direct
      : leadershipBuckets.global)
    .map(item => `${item.organization}${item.position ? `, ${item.position}` : ''}: ${item.summary || ''}`.trim())
    .filter(Boolean)
    .slice(0, limitOrInfinity(limits.leadership));

  return {
    id: v.id,
    role: v.role,
    family: v.family || v.role,
    industry: v.industry,
    fallback: v.fallback || false,
    isMasterCV,
    composition: composition,

    /* Identity */
    name: resume.basics.name,

/* Contact - uses variant location, but canonical contact info from resume */
    contact: {
      location: v.location || resume.basics.location.city,
      email: resume.basics.email,
      phone: resume.basics.phone,
      url: resume.basics.url,
      profiles: resume.basics.profiles || []
    },

    /* Summary from variant description */
    summary: isMasterCV ? (resume.basics.summary || '') : (v.description || resume.basics.summary || ''),

    /* Sections */
    experience: work,
    projects: projects,
    education: education,

    /* Additional info */
    additional: {
      enabled: hasTechnicalQualifications,
      skills: skills,
      skillMap: skillMap,
      languages: languages,
      certifications: certifications,
      workAuthorization: limits.includeWorkAuthorization === false ? '' : (resume.basics.workAuthorization || ''),
      leadership: leadership
    },

    /* PDF */
    pdfFilename: v.pdfFilename || '',
    pdfAvailable: process.argv.includes('--pdf-ready') ? Boolean(v.pdfFilename) : false
  };
});

/* ── Generate JavaScript file ── */
const sourceRevision = `${resume.meta?.version || 'unversioned'} / ${resume.meta?.lastModified || 'unknown'}`;
const js = `/* Auto-generated by bun/src/compile.js - DO NOT EDIT */\n` +
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
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function formatDate(value) {
  if (!value) return 'Present';
  const [year, month] = value.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (!month) return year;
  return `${months[parseInt(month)-1]} ${year}`;
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

function rankRelevantCoursework(courses, keywordBank, limit) {
  return (courses || [])
    .map((course, index) => {
      const name = typeof course === 'string' ? course : course.name;
      const keywords = typeof course === 'string' ? [] : course.keywords || [];
      return {
        name,
        index,
        score: scoreEntry(keywordBank, [name, ...keywords])
      };
    })
    .filter(course => course.name)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .slice(0, limitOrInfinity(limit))
    .map(course => course.name);
}

function buildSkillMap(groups, preferredSkills, contentLimits) {
  const preferred = new Set((preferredSkills || []).filter(Boolean));
  const maxGroups = limitOrInfinity(contentLimits.skillGroups);
  const maxPerGroup = limitOrInfinity(contentLimits.skillsPerGroup);
  const maxSkills = limitOrInfinity(contentLimits.skills);
  const map = [];
  let remaining = maxSkills;

  for (const group of groups || []) {
    if (map.length >= maxGroups || remaining <= 0) break;
    const keywords = unique((group.keywords || []).filter(keyword => preferred.has(keyword)))
      .slice(0, Math.min(maxPerGroup, remaining));
    if (!keywords.length) continue;

    map.push({
      name: group.name,
      label: group.label,
      level: group.level,
      keywords
    });
    remaining -= keywords.length;
  }

  return map;
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

function describeComposition(experienceCount, projectCount) {
  if (experienceCount >= 2 && projectCount === 0) return 'two-experience';
  if (experienceCount >= 2 && projectCount >= 1) return 'experience-project-rich';
  if (experienceCount === 1 && projectCount >= 1) return 'experience-project';
  if (experienceCount === 0 && projectCount >= 2) return 'two-projects';
  return 'curated';
}

function resolveExplicitContent(content, resumeData, contentLimits) {
  const workById = new Map((resumeData.work || []).map(entry => [entry.id, entry]));
  const projectById = new Map((resumeData.projects || []).map(entry => [entry.id, entry]));

  const experience = (content.experience || []).map(selection => {
    const work = workById.get(selection.id);
    if (!work) throw new Error(`Unknown work id "${selection.id}" in variant content plan`);
    const highlightById = new Map((work.highlights || []).map(highlight => [highlight.id, highlight.text]));
    const highlights = (selection.highlights || [])
      .map(highlightId => highlightById.get(highlightId))
      .filter(Boolean)
      .slice(0, limitOrInfinity(contentLimits.experienceHighlights));
    if (!highlights.length) throw new Error(`Work "${selection.id}" has no resolved highlights`);
    return {
      company: work.name,
      role: work.position,
      date: formatDateRange(work.startDate, work.endDate),
      highlights
    };
  });

  const projects = (content.projects || []).map(selection => {
    const project = projectById.get(selection.id);
    if (!project) throw new Error(`Unknown project id "${selection.id}" in variant content plan`);
    const highlightById = new Map((project.highlights || []).map(highlight => [highlight.id, highlight.text]));
    const highlights = (selection.highlights || [])
      .map(highlightId => highlightById.get(highlightId))
      .filter(Boolean)
      .slice(0, limitOrInfinity(contentLimits.projectHighlights));
    if (!highlights.length) throw new Error(`Project "${selection.id}" has no resolved highlights`);
    return {
      name: project.displayName || project.name,
      description: contentLimits.projectDescriptions === false ? '' : (project.description || ''),
      highlights
    };
  });

  return {
    experience,
    projects,
    skillIds: content.skills || [],
    leadershipIds: content.leadership || []
  };
}
