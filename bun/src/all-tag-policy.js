/** Shared policy for highlights[].variants[] "all" eligibility tag. */

/** Parent ids (work/project) where "all" must never appear on highlights or project scope. */
export const ALL_TAG_DENY_PARENT_IDS = [
  'proj-culinary-operations-rotation',
  'proj-independent-legal-documentation-and-filing-support',
  'proj-amanuensis-hindi-speech-recognition',
  'proj-independent-risk-modelling-and-control-design',
  'proj-leased-hotel-turnaround-and-operating-model-strategy',
  'proj-menu-engineering-and-cogs-optimisation',
  'proj-siya-menu-cogs-redesign-and-restaurant-data-platform',
  'proj-hospitality-craft-and-innovation-article',
  'work-savi-hotels-resorts-jaipur-india',
  'work-siya-the-restaurant-srbs-group'
];

/** Highlight id prefixes that must never carry "all" regardless of parent. */
export const ALL_TAG_DENY_HIGHLIGHT_PREFIXES = [
  'proj-culinary-operations-rotation-',
  'proj-independent-legal-documentation-and-filing-support-',
  'proj-amanuensis-hindi-speech-recognition-',
  'proj-independent-risk-modelling-and-control-design-',
  'proj-menu-engineering-and-cogs-optimisation-',
  'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-'
];

/** Text patterns for audit reporting (narrow-domain bullets). */
export const NARROW_DOMAIN_PATTERN = /knife|saucier|affidavit|Companies House|Whisper|Hindi|RevPAR|menu engineering|FMEA|michelin|mise en place|allergen|ghost-typed|sous-vide|OCR|safeguarding/i;

export function isAllTagDeniedForHighlight(highlightId, parentId) {
  if (ALL_TAG_DENY_PARENT_IDS.includes(parentId)) return true;
  return ALL_TAG_DENY_HIGHLIGHT_PREFIXES.some(prefix => highlightId.startsWith(prefix));
}

export function isAllTagDeniedForProject(projectId) {
  return ALL_TAG_DENY_PARENT_IDS.includes(projectId);
}

export function stripAllTag(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.filter(tag => tag !== 'all');
}

export function hasAllTag(tags) {
  return Array.isArray(tags) && tags.includes('all');
}

export function specificTagCount(tags) {
  if (!Array.isArray(tags)) return 0;
  return tags.filter(tag => tag !== 'all').length;
}

export function isAllOnly(tags) {
  return Array.isArray(tags) && tags.length === 1 && tags[0] === 'all';
}
