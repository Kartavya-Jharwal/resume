/** v2 backend category taxonomy — source of truth for variant.category assignment. */

export const ALLOWED_CATEGORIES = [
  'MBB Strategy Consulting',
  'Tier-2 Strategy Consulting',
  'Corporate Turnarounds & Restructuring',
  'Investment Banking & Capital Markets',
  'Venture Capital & Early-Stage',
  'Private Wealth & Family Enterprise',
  'PropTech & Real Estate Investment',
  'Product Management & Platform',
  'UI/UX & Product Design',
  'Creative Strategy & Brand',
  'Spatial & Experiential Design',
  'Creative Technology & Hybrid Design',
  'Executive Operations & Chief of Staff',
  'Innovation Programs & Events',
  'AI Engineering',
  'Growth, Content & Developer Community',
  'Data & Decision Intelligence',
  'Technical Delivery, Infrastructure & Solutions',
  'Organizational & Systems Design',
  'Hospitality & Culinary Operations',
  'Risk, Compliance & Responsible AI',
  'Legal Operations & Transaction Support'
];

export const DEPRECATED_CATEGORIES = new Set([
  'Strategy, Investment & Private Wealth',
  'Product Management',
  'Product, UX & Experience Design'
]);

/** Explicit per-variant category — do not infer from role alone. */
export const CATEGORY_BY_VARIANT_ID = {
  'management-consultant-mbb-standard-big-3-consulting': 'MBB Strategy Consulting',
  'management-consultant-mbb-standard-tier-2-strategy': 'Tier-2 Strategy Consulting',
  'management-consultant-mbb-standard-corporate-turnarounds': 'Corporate Turnarounds & Restructuring',
  'investment-banking-analyst-bulge-bracket-investment-banks': 'Investment Banking & Capital Markets',
  'investment-banking-analyst-boutique-ma-advisory': 'Investment Banking & Capital Markets',
  'investment-banking-analyst-growth-equity': 'Investment Banking & Capital Markets',
  'venture-diligence-analyst-pre-seed-funds': 'Venture Capital & Early-Stage',
  'family-office-analyst-private-wealth-family-enterprise': 'Private Wealth & Family Enterprise',
  'proptech-underwriter-designer-high-end-real-estate-pe': 'PropTech & Real Estate Investment',
  'behavioral-product-manager-digital-wellness': 'Product Management & Platform',
  'product-manager-startup-accelerators': 'Product Management & Platform',
  'strategic-interaction-designer-spatial-computing': 'UI/UX & Product Design',
  'design-systems-architect-enterprise-b2b-saas': 'UI/UX & Product Design',
  'design-systems-architect-complex-data-dashboards': 'UI/UX & Product Design',
  'design-systems-architect-fintech-platforms': 'UI/UX & Product Design',
  'ux-research-translation-lead-civic-tech-platforms': 'UI/UX & Product Design',
  'ui-ux-designer-startup-accelerators': 'UI/UX & Product Design',
  'phygital-spatial-designer-museumexpo-design': 'Spatial & Experiential Design',
  'hybrid-creative-technologist-elite-digital-agencies': 'Creative Technology & Hybrid Design',
  'early-stage-operator-yc-alumni-startups': 'Executive Operations & Chief of Staff',
  'executive-translation-lead-fortune-500-strategy': 'Executive Operations & Chief of Staff',
  'executive-translation-lead-private-equity-operations': 'Executive Operations & Chief of Staff',
  'executive-translation-lead-tech-conglomerates': 'Executive Operations & Chief of Staff',
  'project-manager-startup-accelerators': 'Executive Operations & Chief of Staff',
  'founders-associate-healthcare-startup-ecosystems': 'Executive Operations & Chief of Staff',
  'chief-of-staff-founder-led-family-owned-enterprises': 'Executive Operations & Chief of Staff',
  'strategy-development-associate-hospitality-corporate-groups': 'Executive Operations & Chief of Staff',
  'innovation-ecosystem-architect-startup-accelerators': 'Innovation Programs & Events',
  'innovation-ecosystem-architect-university-innovation-hubs': 'Innovation Programs & Events',
  'innovation-ecosystem-architect-corporate-venture-labs': 'Innovation Programs & Events',
  'experiential-event-producer-tech-conferences': 'Innovation Programs & Events',
  'experiential-event-producer-financial-services-law-firms': 'Innovation Programs & Events',
  'forward-deployed-innovator-enterprise-ai': 'AI Engineering',
  'agentic-systems-architect-autonomous-ai-labs': 'AI Engineering',
  'core-ai-pipeline-engineer-biotech': 'AI Engineering',
  'generative-search-architect-media-conglomerates': 'Growth, Content & Developer Community',
  'zero-cost-growth-hacker-d2c-marketplaces': 'Growth, Content & Developer Community',
  'developer-experience-dx-evangelist-devtools': 'Growth, Content & Developer Community',
  'open-source-community-lead-open-source-foundations': 'Growth, Content & Developer Community',
  'gtm-analyst-startup-accelerators': 'Growth, Content & Developer Community',
  'ai-knowledge-operations-specialist-ai-enabled-content-platforms': 'Growth, Content & Developer Community',
  'data-narrative-consultant-macro-economic-research': 'Data & Decision Intelligence',
  'data-narrative-consultant-policy-think-tanks': 'Data & Decision Intelligence',
  'data-narrative-consultant-economic-development': 'Data & Decision Intelligence',
  'analytics-intelligence-lead-e-commerce-logistics': 'Data & Decision Intelligence',
  'data-scientist-applied-analytics-decision-science': 'Data & Decision Intelligence',
  'customer-facing-founding-engineer-pre-seed-saas': 'Technical Delivery, Infrastructure & Solutions',
  'enterprise-resilience-engineer-managed-service-providers': 'Technical Delivery, Infrastructure & Solutions',
  'systems-qa-auditor-fintech-infrastructure': 'Technical Delivery, Infrastructure & Solutions',
  'heavy-industry-value-engineer-climatetech': 'Technical Delivery, Infrastructure & Solutions',
  'heavy-industry-value-engineer-heavy-manufacturing-tech': 'Technical Delivery, Infrastructure & Solutions',
  'tactical-it-systems-administrator-managed-service-providers': 'Technical Delivery, Infrastructure & Solutions',
  'autodidact-skunkworks-researcher-corporate-rd-labs': 'Technical Delivery, Infrastructure & Solutions',
  'devops-associate-startup-accelerators': 'Technical Delivery, Infrastructure & Solutions',
  'solutions-engineer-culinary-hospitality-systems': 'Hospitality & Culinary Operations',
  'systematic-organizational-designer-enterprise-transformation': 'Organizational & Systems Design',
  'systematic-organizational-designer-civictech': 'Organizational & Systems Design',
  'systematic-organizational-designer-deeptech-skunkworks': 'Organizational & Systems Design',
  'systems-designer-startup-accelerators': 'Organizational & Systems Design',
  'gastronomic-systems-operator-culinary-consulting': 'Hospitality & Culinary Operations',
  'operations-flow-manager-foodtech': 'Hospitality & Culinary Operations',
  'culinary-stagiaire-michelin-fine-dining-kitchens': 'Hospitality & Culinary Operations',
  'back-of-house-logistics-coordinator-high-volume-catering': 'Hospitality & Culinary Operations',
  'front-of-house-reception-associate-hotels-restaurants': 'Hospitality & Culinary Operations',
  'event-hospitality-experience-host-corporate-events-luxury-hospitality': 'Hospitality & Culinary Operations',
  'ai-governance-ethics-officer-medtech': 'Risk, Compliance & Responsible AI',
  'risk-compliance-analyst-technology-regulated-industries': 'Risk, Compliance & Responsible AI',
  'legal-operations-analyst-law-firms-and-transaction-advisory': 'Legal Operations & Transaction Support',
  'brand-strategist-carbon-markets-esg-advisory': 'Creative Strategy & Brand',
  'brand-strategist-climate-tech-sustainability': 'Creative Strategy & Brand',
  'creative-director-boutique-creative-agencies': 'Creative Strategy & Brand',
  'visual-designer-campaign-identity-systems': 'Creative Strategy & Brand',
  'graphic-designer-esg-impact-communications': 'Creative Strategy & Brand',
  'creative-strategist-fintech-decision-tools': 'Creative Strategy & Brand',
  'venture-capital-analyst-growth-stage-funds': 'Venture Capital & Early-Stage',
  'portfolio-operations-associate-early-stage-funds': 'Venture Capital & Early-Stage',
  'vc-platform-associate-early-stage-funds': 'Venture Capital & Early-Stage',
  'investment-associate-corporate-venture-capital': 'Venture Capital & Early-Stage',
  'legal-operations-analyst-corporate-in-house-legal': 'Legal Operations & Transaction Support',
  'transaction-support-analyst-boutique-ma-advisory': 'Legal Operations & Transaction Support',
  'real-estate-investment-analyst-hospitality-asset-management': 'PropTech & Real Estate Investment',
  'proptech-product-analyst-real-estate-saas-platforms': 'PropTech & Real Estate Investment',
  'exhibition-designer-museums-cultural-institutions': 'Spatial & Experiential Design',
  'experience-designer-retail-flagship-brand-spaces': 'Spatial & Experiential Design',
  'creative-technologist-fintech-data-products': 'Creative Technology & Hybrid Design',
  'mlops-engineer-enterprise-applied-ai': 'AI Engineering',
  'speech-ml-engineer-regulated-language-technology': 'AI Engineering'
};

/** Per-anchor thread requirements — each pair guards specific evidence, not the whole thread union. */
export const THREAD_ANCHORS = [
  { variantId: 'venture-diligence-analyst-pre-seed-funds', thread: 'vcDiligence', required: ['proj-duve-venture-diligence-and-industry-tearsheet-h0'] },
  { variantId: 'venture-capital-analyst-growth-stage-funds', thread: 'vcDiligence', required: ['proj-duve-venture-diligence-and-industry-tearsheet-h1'] },
  { variantId: 'executive-translation-lead-private-equity-operations', thread: 'vcDiligence', required: ['proj-duve-venture-diligence-and-industry-tearsheet-h0'] },
  { variantId: 'investment-banking-analyst-bulge-bracket-investment-banks', thread: 'londonFinance', required: ['proj-bwc-adaptive-efficiency-investment-desk-h0'] },
  { variantId: 'data-narrative-consultant-macro-economic-research', thread: 'londonFinance', required: ['proj-project-ganet-finance-digital-garden-and-learning-collective-h0'] },
  { variantId: 'management-consultant-mbb-standard-tier-2-strategy', thread: 'londonFinance', required: ['proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0'] },
  { variantId: 'family-office-analyst-private-wealth-family-enterprise', thread: 'londonFinance', required: ['proj-family-governance-and-office-access-model-h1'] },
  { variantId: 'proptech-underwriter-designer-high-end-real-estate-pe', thread: 'londonFinance', required: ['proj-leased-hotel-turnaround-and-operating-model-strategy-h2'] },
  { variantId: 'management-consultant-mbb-standard-tier-2-strategy', thread: 'creativeDesign', required: ['proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0'] },
  { variantId: 'hybrid-creative-technologist-elite-digital-agencies', thread: 'creativeDesign', required: ['proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0'] },
  { variantId: 'brand-strategist-carbon-markets-esg-advisory', thread: 'creativeDesign', required: ['proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0'] },
  { variantId: 'innovation-ecosystem-architect-university-innovation-hubs', thread: 'creativeDesign', required: ['proj-nirmana-design-capstone-h0'] },
  { variantId: 'design-systems-architect-fintech-platforms', thread: 'creativeDesign', required: ['proj-project-ganet-finance-digital-garden-and-learning-collective-h0'] },
  { variantId: 'phygital-spatial-designer-museumexpo-design', thread: 'creativeDesign', required: ['proj-nirmana-design-capstone-h2'] },
  { variantId: 'ux-research-translation-lead-civic-tech-platforms', thread: 'creativeDesign', required: ['proj-project-oulm-one-ymca-youth-community-platform-h2'] },
  { variantId: 'management-consultant-mbb-standard-big-3-consulting', thread: 'strategyCases', required: ['work-srbs-group-jaipur-india-h0'] },
  { variantId: 'management-consultant-mbb-standard-tier-2-strategy', thread: 'strategyCases', required: ['proj-danone-yopro-apex-diagnostic-h0'] },
  { variantId: 'management-consultant-mbb-standard-corporate-turnarounds', thread: 'strategyCases', required: ['proj-leased-hotel-turnaround-and-operating-model-strategy-h0'] },
  { variantId: 'management-consultant-mbb-standard-corporate-turnarounds', thread: 'riskControls', required: ['work-savi-hotels-resorts-jaipur-india-h0'] },
  { variantId: 'risk-compliance-analyst-technology-regulated-industries', thread: 'riskControls', required: ['proj-independent-risk-modelling-and-control-design-h0'] },
  { variantId: 'ai-governance-ethics-officer-medtech', thread: 'riskControls', required: ['proj-independent-risk-modelling-and-control-design-h0'] },
  { variantId: 'management-consultant-mbb-standard-corporate-turnarounds', thread: 'riskControls', required: ['proj-independent-risk-modelling-and-control-design-h0'] },
  { variantId: 'early-stage-operator-yc-alumni-startups', thread: 'founderPlatform', required: ['work-margadarshaka-h4'] },
  { variantId: 'founders-associate-healthcare-startup-ecosystems', thread: 'founderPlatform', required: ['work-independent-healthcare-venture-client-anonymised-h0'] },
  { variantId: 'product-manager-startup-accelerators', thread: 'founderPlatform', required: ['proj-project-oulm-one-ymca-youth-community-platform-h0'] },
  { variantId: 'culinary-stagiaire-michelin-fine-dining-kitchens', thread: 'hospitalityCulinary', required: ['proj-culinary-operations-rotation-h0'] },
  { variantId: 'gastronomic-systems-operator-culinary-consulting', thread: 'hospitalityCulinary', required: ['work-siya-the-restaurant-srbs-group-h0'] },
  { variantId: 'management-consultant-mbb-standard-corporate-turnarounds', thread: 'hospitalityCulinary', required: ['work-savi-hotels-resorts-jaipur-india-h0'] },
  { variantId: 'legal-operations-analyst-law-firms-and-transaction-advisory', thread: 'lawTransactions', required: ['proj-independent-legal-documentation-and-filing-support-h0'] },
  { variantId: 'experiential-event-producer-financial-services-law-firms', thread: 'lawTransactions', required: ['proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0'] },
  { variantId: 'devops-associate-startup-accelerators', thread: 'techPlatform', required: ['proj-hospitality-and-venture-operations-automation-h0'] },
  { variantId: 'forward-deployed-innovator-enterprise-ai', thread: 'techPlatform', required: ['work-margadarshaka-h0'] },
  { variantId: 'customer-facing-founding-engineer-pre-seed-saas', thread: 'techPlatform', required: ['proj-software-engineering-and-systems-projects-h1'] },
  { variantId: 'experiential-event-producer-tech-conferences', thread: 'eventsReports', required: ['proj-carbon-forward-conference-lead-magnet-design-h0'] },
  { variantId: 'experiential-event-producer-financial-services-law-firms', thread: 'eventsReports', required: ['proj-carbon-forward-conference-lead-magnet-design-h0'] }
];

export const EVIDENCE_THREADS = Object.fromEntries(
  [...new Set(THREAD_ANCHORS.map(entry => entry.thread))].map(thread => [
    thread,
    {
      label: thread,
      anchorVariants: THREAD_ANCHORS.filter(entry => entry.thread === thread).map(entry => entry.variantId)
    }
  ])
);

export const METRICS_KEYS = ['Experience', 'Scope', 'Impact', 'Specialization'];
export const BANNED_METRIC_VALUES = new Set(['Expert', 'High', '20+', '5+ Yrs']);

export const ALLOWED_LIMIT_KEYS = new Set([
  'experience',
  'experienceHighlights',
  'projects',
  'projectHighlights',
  'skills',
  'skillGroups',
  'skillsPerGroup',
  'leadership',
  'educationHighlights',
  'coursework',
  'certifications',
  'languages',
  'projectDescriptions',
  'includeWorkAuthorization',
  'includeSummary'
]);

export function collectHighlightIds(content) {
  const ids = new Set();
  for (const entry of content?.experience || []) {
    for (const id of entry.highlights || []) ids.add(id);
  }
  for (const entry of content?.projects || []) {
    for (const id of entry.highlights || []) ids.add(id);
  }
  return ids;
}

export function validateThreadCoverage(variants, emit = () => {}) {
  const byId = new Map(variants.map(v => [v.id, v]));
  for (const anchor of THREAD_ANCHORS) {
    const variant = byId.get(anchor.variantId);
    if (!variant?.content) {
      emit('error', `thread.${anchor.thread}: anchor variant "${anchor.variantId}" missing or has no content`);
      continue;
    }
    const present = collectHighlightIds(variant.content);
    const missing = anchor.required.filter(id => !present.has(id));
    if (missing.length) {
      emit(
        'error',
        `thread.${anchor.thread}: anchor "${anchor.variantId}" missing required highlights: ${missing.join(', ')}`
      );
    }
  }
}

export function jaccardHighlightOverlap(a, b) {
  const setA = collectHighlightIds(a.content);
  const setB = collectHighlightIds(b.content);
  if (!setA.size && !setB.size) return 0;
  let intersection = 0;
  for (const id of setA) if (setB.has(id)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}
