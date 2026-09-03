/** Per-variant Areas of Focus (professional statement) visibility policy. */

import { CATEGORY_BY_VARIANT_ID } from './category-taxonomy.js';

/** Entire backend categories where evidence-led bullets beat a pitch paragraph. */
export const SUMMARY_DISABLED_CATEGORIES = new Set([
  'Hospitality & Culinary Operations'
]);

/** Additional pairs that should omit Areas of Focus even outside the categories above. */
export const SUMMARY_DISABLED_VARIANT_IDS = new Set([
  'tactical-it-systems-administrator-managed-service-providers',
  'devops-associate-startup-accelerators',
  'enterprise-resilience-engineer-managed-service-providers',
  'systems-qa-auditor-fintech-infrastructure',
  'project-manager-startup-accelerators',
  'heavy-industry-value-engineer-climatetech',
  'heavy-industry-value-engineer-heavy-manufacturing-tech'
]);

export function shouldIncludeSummary(variant) {
  if (SUMMARY_DISABLED_VARIANT_IDS.has(variant.id)) return false;
  const category = variant.category || CATEGORY_BY_VARIANT_ID[variant.id];
  if (category && SUMMARY_DISABLED_CATEGORIES.has(category)) return false;
  return true;
}
