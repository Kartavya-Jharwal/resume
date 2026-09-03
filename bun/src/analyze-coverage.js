#!/usr/bin/env bun
/** One-off coverage audit: highlight usage, orphans, tag mismatches, overlap, per-bucket depth. */
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  ALLOWED_CATEGORIES,
  CATEGORY_BY_VARIANT_ID,
  collectHighlightIds,
  jaccardHighlightOverlap,
  THREAD_ANCHORS
} from './category-taxonomy.js';
import {
  hasAllTag,
  isAllOnly,
  isAllTagDeniedForHighlight,
  isAllTagDeniedForProject,
  NARROW_DOMAIN_PATTERN,
  specificTagCount
} from './all-tag-policy.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resume = JSON.parse(readFileSync(resolve(ROOT, 'data/resume.json'), 'utf8'));
const variantsDoc = JSON.parse(readFileSync(resolve(ROOT, 'data/variants.json'), 'utf8'));
const variants = variantsDoc.variants;

// Collect all highlight ids from resume.json
const allHighlights = new Map();
for (const entry of resume.work || []) {
  for (const h of entry.highlights || []) {
    allHighlights.set(h.id, { parent: entry.id, parentType: 'work', text: h.text?.slice(0, 60), variants: h.variants || [] });
  }
}
for (const entry of resume.projects || []) {
  for (const h of entry.highlights || []) {
    allHighlights.set(h.id, { parent: entry.id, parentType: 'project', text: h.text?.slice(0, 60), variants: h.variants || [] });
  }
}

// Usage counts across content plans
const usageCount = new Map();
const usedInVariants = new Map();
for (const v of variants) {
  const ids = collectHighlightIds(v.content);
  for (const id of ids) {
    usageCount.set(id, (usageCount.get(id) || 0) + 1);
    if (!usedInVariants.has(id)) usedInVariants.set(id, []);
    usedInVariants.get(id).push(v.id);
  }
}

const orphans = [...allHighlights.keys()].filter(id => !usageCount.has(id));
const singleUse = [...allHighlights.keys()].filter(id => usageCount.get(id) === 1);
const underused = [...allHighlights.keys()].filter(id => (usageCount.get(id) || 0) <= 2);

// Tag mismatches
const taggedButNeverSelected = [];
const selectedButNotTagged = [];
for (const [id, meta] of allHighlights) {
  const tagged = new Set(meta.variants);
  const selected = new Set(usedInVariants.get(id) || []);
  for (const vid of tagged) {
    if (!selected.has(vid)) taggedButNeverSelected.push({ id, variantId: vid, parent: meta.parent });
  }
  for (const vid of selected) {
    if (!tagged.has(vid)) selectedButNotTagged.push({ id, variantId: vid, parent: meta.parent });
  }
}

// Thread anchor check
const threadViolations = [];
for (const anchor of THREAD_ANCHORS) {
  const variant = variants.find(v => v.id === anchor.variantId);
  const present = variant ? collectHighlightIds(variant.content) : new Set();
  const missing = anchor.required.filter(id => !present.has(id));
  if (missing.length) threadViolations.push({ ...anchor, missing });
}

// High overlap pairs (>80%)
const highOverlap = [];
for (let i = 0; i < variants.length; i++) {
  for (let j = i + 1; j < variants.length; j++) {
    const overlap = jaccardHighlightOverlap(variants[i], variants[j]);
    if (overlap > 0.8) {
      highOverlap.push({ a: variants[i].id, b: variants[j].id, overlap: Math.round(overlap * 100) });
    }
  }
}

// Culinary bucket check: Menu COGS + Siya h2 co-occur
const menuCogsId = 'proj-menu-engineering-and-cogs-optimisation-h';
const siyaH2 = 'work-siya-the-restaurant-srbs-group-h2';
const culinaryViolations = [];
for (const v of variants) {
  const ids = collectHighlightIds(v.content);
  if (ids.has('proj-menu-engineering-and-cogs-optimisation-h0') || ids.has('proj-menu-engineering-and-cogs-optimisation-h1')) {
    if (ids.has(siyaH2)) culinaryViolations.push(v.id);
  }
}
// Stagiaire should NOT get same-property ETA implementation lens (leased-hotel h1)
const stagiaireId = 'culinary-stagiaire-michelin-fine-dining-kitchens';
const etaImplH1 = 'proj-leased-hotel-turnaround-and-operating-model-strategy-h1';
const stagiaireVariant = variants.find(v => v.id === stagiaireId);
if (stagiaireVariant && collectHighlightIds(stagiaireVariant.content).has(etaImplH1)) {
  culinaryViolations.push(`${stagiaireId}: has ${etaImplH1}`);
}

const FINANCE_CATEGORIES = new Set([
  'Investment Banking & Capital Markets',
  'Venture Capital & Early-Stage',
  'Private Wealth & Family Enterprise',
  'PropTech & Real Estate Investment'
]);
const LONDON_FINANCE_PREFIXES = [
  'proj-duve-venture-diligence-and-industry-tearsheet',
  'proj-london-airbnb-pricing-and-regression-models',
  'proj-project-ganet-finance-digital-garden-and-learning-collective',
  'proj-redshaw-advisors-brand-strategy-and-campaign-kit',
  'proj-bwc-adaptive-efficiency-investment-desk'
];
const REDSHAW_PREFIX = 'proj-redshaw-advisors-brand-strategy-and-campaign-kit';
const AI_ENGINEERING_CATEGORY = 'AI Engineering';

function hasLondonFinanceMarker(ids) {
  return [...ids].some(id => LONDON_FINANCE_PREFIXES.some(prefix => id.startsWith(prefix)));
}
function hasRedshaw(ids) {
  return [...ids].some(id => id.startsWith(REDSHAW_PREFIX));
}

const perBucket = Object.fromEntries(ALLOWED_CATEGORIES.map(cat => [
  cat,
  { pairCount: 0, variantIds: [], financeThreadHits: 0, redshawInDesign: 0, threadAnchorsOk: 0, threadAnchorsTotal: 0 }
]));

for (const v of variants) {
  const category = v.category || CATEGORY_BY_VARIANT_ID[v.id];
  if (!perBucket[category]) continue;
  const bucket = perBucket[category];
  bucket.pairCount += 1;
  bucket.variantIds.push(v.id);
  const ids = collectHighlightIds(v.content);
  if (FINANCE_CATEGORIES.has(category) && hasLondonFinanceMarker(ids)) bucket.financeThreadHits += 1;
  if (category === 'UI/UX & Product Design' && hasRedshaw(ids)) bucket.redshawInDesign += 1;
}

for (const anchor of THREAD_ANCHORS) {
  const category = CATEGORY_BY_VARIANT_ID[anchor.variantId];
  if (!perBucket[category]) continue;
  const bucket = perBucket[category];
  bucket.threadAnchorsTotal += 1;
  const variant = variants.find(v => v.id === anchor.variantId);
  const present = variant ? collectHighlightIds(variant.content) : new Set();
  if (anchor.required.every(id => present.has(id))) bucket.threadAnchorsOk += 1;
}

const financeCategoryPairs = variants.filter(v => FINANCE_CATEGORIES.has(v.category || CATEGORY_BY_VARIANT_ID[v.id]));
const financeThreadPct = financeCategoryPairs.length
  ? Math.round((financeCategoryPairs.filter(v => hasLondonFinanceMarker(collectHighlightIds(v.content))).length / financeCategoryPairs.length) * 100)
  : 0;

const aiEngineeringCount = variants.filter(v => (v.category || CATEGORY_BY_VARIANT_ID[v.id]) === AI_ENGINEERING_CATEGORY).length;
const aiAdjacentCount = variants.filter(v => {
  const cat = v.category || CATEGORY_BY_VARIANT_ID[v.id];
  return cat === 'Risk, Compliance & Responsible AI'
    || cat === 'Data & Decision Intelligence'
    || cat === 'Growth, Content & Developer Community'
    || (cat === 'Spatial & Experiential Design' && collectHighlightIds(v.content).has('proj-agentic-workflow-and-evaluation-platform-h0'));
}).length;

const allTagHighlights = [...allHighlights.entries()].map(([id, meta]) => ({
  id,
  parent: meta.parent,
  parentType: meta.parentType,
  hasAll: hasAllTag(meta.variants),
  isAllOnly: isAllOnly(meta.variants),
  specificTagCount: specificTagCount(meta.variants),
  denylisted: isAllTagDeniedForHighlight(id, meta.parent) && hasAllTag(meta.variants),
  narrowDomain: NARROW_DOMAIN_PATTERN.test(meta.text || '') && hasAllTag(meta.variants),
  textPreview: meta.text
}));

const narrowWithAll = allTagHighlights.filter(entry => entry.denylisted || entry.narrowDomain);

const perVariantAllTag = variants.map(v => {
  const ids = [...collectHighlightIds(v.content)];
  const withAll = ids.filter(id => hasAllTag(allHighlights.get(id)?.variants));
  const directTagged = ids.filter(id => allHighlights.get(id)?.variants?.includes(v.id));
  return {
    id: v.id,
    role: v.role,
    allEligiblePct: ids.length ? Math.round((withAll.length / ids.length) * 100) : 0,
    directTaggedPct: ids.length ? Math.round((directTagged.length / ids.length) * 100) : 0,
    roleSpecificBulletCount: directTagged.length,
    bulletCount: ids.length
  };
});

const allTagReport = {
  summary: {
    highlightsWithAll: allTagHighlights.filter(entry => entry.hasAll).length,
    highlightsAllOnly: allTagHighlights.filter(entry => entry.isAllOnly).length,
    narrowWithAll: narrowWithAll.length,
    variantsAbove70PctAll: perVariantAllTag.filter(entry => entry.allEligiblePct >= 70).length,
    variantsBelow2Direct: perVariantAllTag.filter(entry => entry.roleSpecificBulletCount < 2).length
  },
  narrowWithAll,
  variantsAbove70PctAll: perVariantAllTag.filter(entry => entry.allEligiblePct >= 70).map(entry => ({
    id: entry.id,
    allEligiblePct: entry.allEligiblePct,
    role: entry.role
  })),
  variantsBelow2Direct: perVariantAllTag.filter(entry => entry.roleSpecificBulletCount < 2)
};

const perBucketReport = ALLOWED_CATEGORIES.map(category => {
  const bucket = perBucket[category];
  return {
    category,
    pairCount: bucket.pairCount,
    financeThreadHits: FINANCE_CATEGORIES.has(category) ? bucket.financeThreadHits : undefined,
    financeThreadPct: FINANCE_CATEGORIES.has(category) && bucket.pairCount
      ? Math.round((bucket.financeThreadHits / bucket.pairCount) * 100)
      : undefined,
    redshawInDesign: category === 'UI/UX & Product Design' ? bucket.redshawInDesign : undefined,
    threadAnchorCoveragePct: bucket.threadAnchorsTotal
      ? Math.round((bucket.threadAnchorsOk / bucket.threadAnchorsTotal) * 100)
      : undefined,
    thin: bucket.pairCount <= 1
  };
}).filter(entry => entry.pairCount > 0 || ALLOWED_CATEGORIES.includes(entry.category));

const report = {
  version: resume.meta?.version,
  totalHighlights: allHighlights.size,
  orphanCount: orphans.length,
  orphans: orphans.map(id => ({ id, ...allHighlights.get(id) })),
  singleUseCount: singleUse.length,
  singleUse: singleUse.map(id => ({ id, variant: usedInVariants.get(id)?.[0], ...allHighlights.get(id) })),
  underusedCount: underused.length,
  usageDistribution: {
    zero: orphans.length,
    one: singleUse.length,
    two: underused.length - singleUse.length - orphans.length,
    threePlus: allHighlights.size - underused.length
  },
  taggedButNeverSelectedCount: taggedButNeverSelected.length,
  taggedButNeverSelected: taggedButNeverSelected.slice(0, 50),
  selectedButNotTaggedCount: selectedButNotTagged.length,
  selectedButNotTagged: selectedButNotTagged.slice(0, 50),
  threadViolations,
  highOverlap,
  culinaryViolations,
  allTagReport,
  perBucketReport,
  bucketDepthSummary: {
    totalPairs: variants.length,
    emptyBuckets: ALLOWED_CATEGORIES.filter(cat => perBucket[cat].pairCount === 0),
    thinBuckets: perBucketReport.filter(entry => entry.thin).map(entry => entry.category),
    financeThreadPct,
    designCategoryRedshawCount: perBucket['UI/UX & Product Design']?.redshawInDesign ?? 0,
    aiEngineeringPairs: aiEngineeringCount,
    aiAdjacentPairs: aiAdjacentCount,
    narrowWithAll: allTagReport.summary.narrowWithAll,
    variantsAbove70PctAll: allTagReport.summary.variantsAbove70PctAll
  },
  topUsed: [...usageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, count]) => ({ id, count, parent: allHighlights.get(id)?.parent }))
};

console.log(JSON.stringify(report, null, 2));
