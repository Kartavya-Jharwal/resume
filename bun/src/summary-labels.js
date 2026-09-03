/** Per-category section label for the variant professional statement. */

import { CATEGORY_BY_VARIANT_ID } from './category-taxonomy.js';

export const SUMMARY_LABEL_BY_CATEGORY = {
  'MBB Strategy Consulting': 'Strategy Profile',
  'Tier-2 Strategy Consulting': 'Strategy Profile',
  'Corporate Turnarounds & Restructuring': 'Turnaround Profile',
  'Venture Capital & Early-Stage': 'Investment Profile',
  'Investment Banking & Capital Markets': 'Markets Profile',
  'Private Wealth & Family Enterprise': 'Family Office Profile',
  'PropTech & Real Estate Investment': 'Real Assets Profile',
  'AI Engineering': 'Technical Profile',
  'Technical Delivery, Infrastructure & Solutions': 'Technical Profile',
  'Product Management & Platform': 'Product Profile',
  'UI/UX & Product Design': 'Design Profile',
  'Creative Technology & Hybrid Design': 'Creative Profile',
  'Creative Strategy & Brand': 'Brand Profile',
  'Spatial & Experiential Design': 'Spatial Profile',
  'Growth, Content & Developer Community': 'Growth Profile',
  'Data & Decision Intelligence': 'Analytical Profile',
  'Innovation Programs & Events': 'Programs Profile',
  'Executive Operations & Chief of Staff': 'Executive Profile',
  'Organizational & Systems Design': 'Systems Profile',
  'Risk, Compliance & Responsible AI': 'Governance Profile',
  'Legal Operations & Transaction Support': 'Professional Summary',
  'Hospitality & Culinary Operations': 'Service Profile'
};

export function summaryLabelForVariant(variant) {
  if (variant.summaryLabel) return variant.summaryLabel;
  const category = variant.category || CATEGORY_BY_VARIANT_ID[variant.id];
  return SUMMARY_LABEL_BY_CATEGORY[category] || 'Professional Summary';
}
