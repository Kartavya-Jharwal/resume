#!/usr/bin/env bun
/**
 * Generate explicit per-variant content plans from the master CV.
 * Uses keyword relevance, direct tag preference, and sibling de-duplication.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const variantsDoc = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8'));
const limits = { ...resume.custom.limits };

function normaliseKeywordBank(keywords) {
  return [...new Set(
    (keywords || [])
      .flatMap(k => String(k || '').toLowerCase().split(/[^a-z0-9+#./-]+/))
      .map(k => k.trim())
      .filter(k => k.length >= 3)
  )];
}

function scoreEntry(keywordBank, parts) {
  const haystack = parts.filter(Boolean).join(' ').toLowerCase();
  return keywordBank.reduce((score, keyword) => (haystack.includes(keyword) ? score + 1 : score), 0);
}

function hasExactVariant(tags, variantId) {
  return Array.isArray(tags) && tags.includes(variantId);
}

function isGlobalVariant(tags) {
  return !Array.isArray(tags) || tags.length === 0 || tags.includes('all');
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

function rankHighlights(entry, variantId, keywordBank, max) {
  const split = splitVariantItems(entry.highlights || [], variantId);
  const pool = (split.direct.length ? split.direct : split.global)
    .map(highlight => ({
      id: highlight.id,
      text: highlight.text,
      direct: split.direct.includes(highlight),
      score: scoreEntry(keywordBank, [highlight.text])
    }))
    .sort((a, b) => Number(b.direct) - Number(a.direct) || b.score - a.score);
  if (!split.direct.length && pool.length) {
    console.warn(`content:plan ${variantId}: ${entry.id || 'entry'} would use only global-eligible highlights`);
  }
  return pool.slice(0, max).map(item => item.id);
}

function scoreWork(work, variantId, keywordBank) {
  const split = splitVariantItems(work.highlights || [], variantId);
  if (!split.direct.length && !split.global.length) return null;
  const highlightIds = rankHighlights(work, variantId, keywordBank, limits.experienceHighlights);
  if (!highlightIds.length) return null;
  return {
    id: work.id,
    highlights: highlightIds,
    direct: split.direct.length > 0,
    score: scoreEntry(keywordBank, [work.name, work.position, work.summary, ...(work.keywords || [])])
      + highlightIds.length
      + (split.direct.length ? 3 : 0),
    recency: Date.parse(work.endDate || '9999-12-31') || 0
  };
}

function scoreProject(project, variantId, keywordBank) {
  const scopeDirect = hasExactVariant(project.variants, variantId);
  const scopeGlobal = isGlobalVariant(project.variants);
  if (!scopeDirect && !scopeGlobal) return null;
  const highlightIds = rankHighlights(project, variantId, keywordBank, limits.projectHighlights);
  if (!highlightIds.length) return null;
  const split = splitVariantItems(project.highlights || [], variantId);
  return {
    id: project.id,
    highlights: highlightIds,
    direct: scopeDirect || split.direct.length > 0,
    score: scoreEntry(keywordBank, [project.name, project.description, ...(project.keywords || [])])
      + highlightIds.length
      + (scopeDirect ? 3 : 0)
      + (project.masterOrder < 0 ? -1 : 0)
  };
}

function signature(plan) {
  return [
    ...(plan.experience || []).map(item => item.id),
    ...(plan.projects || []).map(item => item.id)
  ].join('|');
}

function pickSkills(variantId, keywordBank) {
  return (resume.skills || [])
    .filter(skill => hasExactVariant(skill.variants, variantId))
    .map(skill => ({
      id: skill.id,
      score: scoreEntry(keywordBank, [skill.name, skill.label, ...(skill.keywords || [])])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.skillGroups)
    .map(item => item.id);
}

function pickLeadership(variantId, leadershipLimit) {
  return (resume.volunteer || [])
    .filter(entry => hasExactVariant(entry.variants, variantId) || isGlobalVariant(entry.variants))
    .slice(0, leadershipLimit || 0)
    .map(entry => entry.id);
}

function buildPlan(variant, siblingSignatures) {
  const vid = variant.id;
  const variantLimits = { ...limits, ...(variant.limits || {}) };
  const keywordBank = normaliseKeywordBank([
    variant.role,
    variant.industry,
    variant.description,
    ...(variant.requiredKeywords || [])
  ]);

  const workRanked = (resume.work || [])
    .map(work => scoreWork(work, vid, keywordBank))
    .filter(Boolean)
    .sort((a, b) => Number(b.direct) - Number(a.direct) || b.score - a.score || b.recency - a.recency);

  const projectRanked = (resume.projects || [])
    .map(project => scoreProject(project, vid, keywordBank))
    .filter(Boolean)
    .sort((a, b) => Number(b.direct) - Number(a.direct) || b.score - a.score);

  const targetWork = Math.min(variantLimits.experience, workRanked.some(w => w.direct) ? 3 : 2);
  const targetProjects = Math.min(variantLimits.projects, 2);
  const minBullets = 6;

  let best = null;
  let bestScore = -Infinity;

  for (let workCount = Math.min(targetWork, workRanked.length); workCount >= 1; workCount--) {
    for (let projectCount = Math.min(targetProjects, projectRanked.length); projectCount >= 0; projectCount--) {
      if (workCount + projectCount < 2) continue;
      const experience = workRanked.slice(0, workCount).map(({ id, highlights }) => ({ id, highlights }));
      const projects = projectRanked.slice(0, projectCount).map(({ id, highlights }) => ({ id, highlights }));
      const bulletCount = [...experience, ...projects].reduce((sum, item) => sum + item.highlights.length, 0);
      if (bulletCount < minBullets && workCount + projectCount < 3) continue;

      const plan = {
        experience,
        projects,
        skills: pickSkills(vid, keywordBank),
        leadership: pickLeadership(vid, variantLimits.leadership)
      };
      const sig = signature(plan);
      const siblingPenalty = siblingSignatures.has(sig) ? 12 : 0;
      const directBonus = experience.filter((_, index) => workRanked[index]?.direct).length
        + projects.filter((_, index) => projectRanked[index]?.direct).length;
      const planScore = bulletCount + directBonus * 2 + workCount + projectCount - siblingPenalty;

      if (planScore > bestScore) {
        bestScore = planScore;
        best = plan;
      }
    }
  }

  if (!best) {
    best = {
      experience: workRanked.slice(0, Math.min(2, workRanked.length)).map(({ id, highlights }) => ({ id, highlights })),
      projects: projectRanked.slice(0, Math.min(1, projectRanked.length)).map(({ id, highlights }) => ({ id, highlights })),
      skills: pickSkills(vid, keywordBank),
      leadership: pickLeadership(vid, variantLimits.leadership)
    };
  }

  siblingSignatures.add(signature(best));
  return best;
}

const siblingsByFamily = new Map();
for (const variant of variantsDoc.variants) {
  const key = variant.family || variant.role;
  if (!siblingsByFamily.has(key)) siblingsByFamily.set(key, []);
  siblingsByFamily.get(key).push(variant);
}

for (const group of siblingsByFamily.values()) {
  const signatures = new Set();
  for (const variant of group) {
    variant.content = buildPlan(variant, signatures);
  }
}

writeFileSync(resolve(ROOT, 'data/variants.json'), `${JSON.stringify(variantsDoc, null, 2)}\n`, 'utf8');
console.log(`✓ Planned explicit content for ${variantsDoc.variants.length} variants`);
