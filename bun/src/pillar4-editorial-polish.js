#!/usr/bin/env bun
/**
 * Pillar 4 editorial optimization pass: cluster/friction rewrites, mandatory variant fixes,
 * design rebalance, metrics de-genericization, gated pair expansion.
 * Run: bun run bun/src/pillar4-editorial-polish.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resumePath = resolve(ROOT, 'data/resume.json');
const variantsPath = resolve(ROOT, 'data/variants.json');

const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
const variantsDoc = JSON.parse(readFileSync(variantsPath, 'utf8'));

function exp(id, ...highlights) {
  return { id, highlights };
}

function proj(id, ...highlights) {
  return { id, highlights };
}

function setHighlightText(id, text) {
  for (const work of resume.work || []) {
    const h = work.highlights?.find(x => x.id === id);
    if (h) {
      h.text = text;
      return;
    }
  }
  for (const project of resume.projects || []) {
    const h = project.highlights?.find(x => x.id === id);
    if (h) {
      h.text = text;
      return;
    }
  }
}

function addVariants(highlightId, ...variantIds) {
  const apply = h => {
    h.variants = [...new Set([...(h.variants || []), ...variantIds])];
  };
  for (const work of resume.work || []) {
    const h = work.highlights?.find(x => x.id === highlightId);
    if (h) return apply(h);
  }
  for (const project of resume.projects || []) {
    const h = project.highlights?.find(x => x.id === highlightId);
    if (h) return apply(h);
  }
}

function setContent(variantId, content) {
  const variant = variantsDoc.variants.find(v => v.id === variantId);
  if (!variant) throw new Error(`Unknown variant ${variantId}`);
  variant.content = content;
}

function findVariant(id) {
  return variantsDoc.variants.find(v => v.id === id);
}

// ── Cluster + friction bullet rewrites ──
const BULLET_REWRITES = {
  'work-margadarshaka-h0':
    'Held real-time voice delivery inside a projected INR 50-per-call ceiling—balancing Whisper inference, response latency, and mandatory human review before any scaled commit.',
  'work-margadarshaka-h1':
    'Required human review after every AI-handled call—no unattended counselling sessions and no automated judgment on safeguarding-sensitive calls.',
  'work-margadarshaka-h2':
    'Rejected a premature full build after feasibility testing exposed payer-user misalignment and counselling-liability risk—stopping spend before scaled commitment.',
  'work-margadarshaka-h3':
    'Set stage gates on demand, delivery economics, and human-review cost—testing each before authorising the next build tranche.',
  'work-margadarshaka-h6':
    'Prototyped a Whisper/C++ edge inference path to hold per-call compute inside the INR 50 ceiling—bounded automation before full voice-stack spend.',
  'work-savi-hotels-resorts-jaipur-india-h3':
    'Applied a two-month kill gate when leasing velocity and profitability stayed below threshold—returning the property with offboarding records and a reusable pitchbook.',
  'work-srbs-group-jaipur-india-h0':
    'Recommended—and subsequently helped execute—the approximately GBP 40,000 Shimla hotel lease after integrating market conditions, prior operator books, asset quality, downside risk, operating fit, and valuation.',
  'work-srbs-group-jaipur-india-h2':
    'Built a reusable seven-part diligence framework spanning market attractiveness, operator quality, asset condition, legal exposure, commercial fit, valuation logic, and post-transaction execution risk.',
  'proj-duve-venture-diligence-and-industry-tearsheet-h1':
    "Tested Duve's investment case against PMS dependencies, hotel-operator workflows, rollout friction, customer concentration, downside exposure, and integration upside.",
  'proj-duve-venture-diligence-and-industry-tearsheet-h2':
    'Framed Duve as a conditional follow-up—not a clean proceed/pass—naming PMS integration dependency, rollout friction, and customer concentration as diligence gates before conviction.',
  'proj-project-oulm-one-ymca-youth-community-platform-h1':
    'Shifted the growth model away from daily active users toward offline belonging—building accountability architecture with intentional verification friction for under-16 access.',
  'proj-project-oulm-one-ymca-youth-community-platform-h2':
    'Delivered six connected outputs—technical MVP, identity, design tokens, skeleton states, posters, and venue touchpoints—as a safeguarding-aware service ecosystem with legible handoffs.',
  'proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0':
    "Redesigned Redshaw Advisors' positioning by turning carbon-credit diligence and ESG research into a legible brand proposition, audience architecture, and campaign system.",
  'work-margadarshaka-h4':
    "Ran Margadarshaka's pre-scale GTM as gated experiments—demand tests, counsellor capacity checks, and unit-economics checkpoints before marketing spend."
};

for (const [id, text] of Object.entries(BULLET_REWRITES)) {
  setHighlightText(id, text);
}

// AstroPatshala register variants (ops vs GTM vs research base)
setHighlightText(
  'work-astropatshala-h1',
  'Built and maintained two production codebases governing customer acquisition, education delivery, research publishing, and internal operations—with deployment cadence tied to licensing releases.'
);
setHighlightText(
  'work-astropatshala-h2',
  'Structured AstroPatshala research publishing and course licensing as repeatable GTM assets—pricing tiers, channel partners, and delivery packaging aligned to the operating model.'
);

// Design-thread tags for OULM on product-design pairs
addVariants(
  'proj-project-oulm-one-ymca-youth-community-platform-h1',
  'design-systems-architect-enterprise-b2b-saas',
  'design-systems-architect-complex-data-dashboards'
);
addVariants(
  'proj-project-oulm-one-ymca-youth-community-platform-h2',
  'design-systems-architect-enterprise-b2b-saas',
  'design-systems-architect-fintech-platforms'
);

// Education coursework ranking boost for design + Tier-2
const education = resume.education?.[0];
if (education) {
  const boost = (name, keywords) => {
    const course = education.courses?.find(c => (typeof c === 'string' ? c : c.name) === name);
    if (course && typeof course !== 'string') {
      course.keywords = [...new Set([...(course.keywords || []), ...keywords])];
    }
  };
  boost('Design Thinking in Practice', ['design systems', 'brand strategy', 'service design', 'information design']);
  boost('Design 1', ['design systems', 'information design', 'visual hierarchy', 'dashboards']);
  boost('Design Thinking in Web Design', ['design systems', 'UX/UI', 'fintech', 'brand strategy']);
  boost('Creativity', ['brand strategy', 'campaign', 'portfolio architecture']);
}

// ── Mandatory variant fixes ──
const turnarounds = findVariant('management-consultant-mbb-standard-corporate-turnarounds');
if (turnarounds) {
  turnarounds.limits = { ...(turnarounds.limits || {}), projectHighlights: 4 };
}

setContent('management-consultant-mbb-standard-tier-2-strategy', {
  experience: [
    exp('work-astropatshala', 'work-astropatshala-h0', 'work-astropatshala-h2'),
    exp('work-independent-healthcare-venture-client-anonymised', 'work-independent-healthcare-venture-client-anonymised-h0', 'work-independent-healthcare-venture-client-anonymised-h1')
  ],
  projects: [
    proj('proj-redshaw-advisors-brand-strategy-and-campaign-kit', 'proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0', 'proj-redshaw-advisors-brand-strategy-and-campaign-kit-h1'),
    proj('proj-danone-yopro-apex-diagnostic', 'proj-danone-yopro-apex-diagnostic-h1', 'proj-danone-yopro-apex-diagnostic-h0')
  ],
  skills: [],
  leadership: []
});

setContent('executive-translation-lead-private-equity-operations', {
  experience: [
    exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h0', 'work-srbs-group-jaipur-india-h2'),
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h2', 'work-savi-hotels-resorts-jaipur-india-h3')
  ],
  projects: [
    proj('proj-duve-venture-diligence-and-industry-tearsheet', 'proj-duve-venture-diligence-and-industry-tearsheet-h0', 'proj-duve-venture-diligence-and-industry-tearsheet-h2'),
    proj('proj-leased-hotel-turnaround-and-operating-model-strategy', 'proj-leased-hotel-turnaround-and-operating-model-strategy-h2', 'proj-leased-hotel-turnaround-and-operating-model-strategy-h3')
  ],
  skills: [],
  leadership: []
});

// PE ops: allow leased-hotel project alongside Savi work
const peOps = findVariant('executive-translation-lead-private-equity-operations');
if (peOps) peOps._allowLeasedHotelWithSavi = true;

// ── Design systems: project-first rebalance ──
setContent('design-systems-architect-enterprise-b2b-saas', {
  experience: [exp('work-margadarshaka', 'work-margadarshaka-h10', 'work-margadarshaka-h11')],
  projects: [
    proj('proj-nirmana-design-capstone', 'proj-nirmana-design-capstone-h0', 'proj-nirmana-design-capstone-h1'),
    proj('proj-siya-menu-cogs-redesign-and-restaurant-data-platform', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h5', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h7')
  ],
  skills: ['skill-product-design-and-spatial-tools'],
  leadership: []
});

setContent('design-systems-architect-complex-data-dashboards', {
  experience: [exp('work-margadarshaka', 'work-margadarshaka-h11', 'work-margadarshaka-h10')],
  projects: [
    proj('proj-bloom-creative-terminal-visualization', 'proj-bloom-creative-terminal-visualization-h0', 'proj-bloom-creative-terminal-visualization-h4'),
    proj('proj-siya-menu-cogs-redesign-and-restaurant-data-platform', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h6', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h4')
  ],
  skills: ['skill-product-design-and-spatial-tools'],
  leadership: []
});

setContent('design-systems-architect-fintech-platforms', {
  experience: [exp('work-margadarshaka', 'work-margadarshaka-h10', 'work-margadarshaka-h11')],
  projects: [
    proj('proj-project-ganet-finance-digital-garden-and-learning-collective', 'proj-project-ganet-finance-digital-garden-and-learning-collective-h0', 'proj-project-ganet-finance-digital-garden-and-learning-collective-h1'),
    proj('proj-bwc-quantitative-portfolio-audit-engine', 'proj-bwc-quantitative-portfolio-audit-engine-h0', 'proj-bwc-quantitative-portfolio-audit-engine-h2')
  ],
  skills: ['skill-product-design-and-spatial-tools'],
  leadership: []
});

// ── DevOps / infra trio differentiation ──
setContent('devops-associate-startup-accelerators', {
  experience: [
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h8', 'work-savi-hotels-resorts-jaipur-india-h9'),
    exp('work-margadarshaka', 'work-margadarshaka-h6', 'work-margadarshaka-h0'),
    exp('work-hult-ai-collective', 'work-hult-ai-collective-h0', 'work-hult-ai-collective-h4')
  ],
  projects: [
    proj('proj-hospitality-and-venture-operations-automation', 'proj-hospitality-and-venture-operations-automation-h0', 'proj-hospitality-and-venture-operations-automation-h3'),
    proj('proj-software-engineering-and-systems-projects', 'proj-software-engineering-and-systems-projects-h0', 'proj-software-engineering-and-systems-projects-h2')
  ],
  skills: ['skill-systems-and-devops', 'skill-backend-and-apis'],
  leadership: ['lead-hult-founders-lab']
});

setContent('enterprise-resilience-engineer-managed-service-providers', {
  experience: [
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h8', 'work-savi-hotels-resorts-jaipur-india-h9'),
    exp('work-margadarshaka', 'work-margadarshaka-h1', 'work-margadarshaka-h2')
  ],
  projects: [
    proj('proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform', 'proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform-h2', 'proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform-h3'),
    proj('proj-hospitality-and-venture-operations-automation', 'proj-hospitality-and-venture-operations-automation-h1', 'proj-hospitality-and-venture-operations-automation-h2')
  ],
  skills: ['skill-systems-and-devops'],
  leadership: []
});

setContent('tactical-it-systems-administrator-managed-service-providers', {
  experience: [
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h6', 'work-savi-hotels-resorts-jaipur-india-h1'),
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h8', 'work-savi-hotels-resorts-jaipur-india-h9')
  ],
  projects: [
    proj('proj-hospitality-and-venture-operations-automation', 'proj-hospitality-and-venture-operations-automation-h2', 'proj-hospitality-and-venture-operations-automation-h1'),
    proj('proj-software-engineering-and-systems-projects', 'proj-software-engineering-and-systems-projects-h2', 'proj-software-engineering-and-systems-projects-h3')
  ],
  skills: ['skill-systems-and-devops'],
  leadership: []
});

// ── Category-specific metrics ──
const METRICS_BY_CATEGORY = {
  'Executive Operations & Chief of Staff': { Experience: '5+ Yrs', Scope: 'Multi-Venture', Impact: 'Operator', Specialization: 'Cadence & Gates' },
  'Strategy, Investment & Private Wealth': { Experience: '5+ Yrs', Cases: '20+', Impact: 'Exhibit-Linked', Specialization: 'Strategy' },
  'Innovation Programs & Events': { Experience: '5+ Yrs', Programmes: '10+', Impact: 'Live Delivery', Specialization: 'Events' },
  'AI Engineering': { Experience: 'Hands-On', Stack: 'Production', Impact: 'Pipeline', Specialization: 'Voice & Agents' },
  'Product Management': { Experience: '5+ Yrs', Launches: 'Multi-Venture', Impact: 'Shipped', Specialization: '0→1' },
  'Product, UX & Experience Design': { Experience: '5+ Yrs', Systems: 'Cross-Stack', Impact: 'Legibility', Specialization: 'Design–Quant' },
  'Growth, Content & Developer Community': { Experience: '5+ Yrs', Channels: 'Multi', Impact: 'GTM', Specialization: 'Content Ops' },
  'Data & Decision Intelligence': { Experience: '5+ Yrs', Models: 'Reproducible', Impact: 'Decision', Specialization: 'Analytics' },
  'Technical Delivery, Infrastructure & Solutions': { Experience: 'Hands-On', Systems: 'Linux', Impact: 'Reliability', Specialization: 'Infrastructure' },
  'Organizational & Systems Design': { Experience: '5+ Yrs', Engagements: 'Multi', Impact: 'Operating Model', Specialization: 'Systems' },
  'Hospitality & Culinary Operations': { Experience: '5+ Yrs', Properties: '4 Hotels', Impact: 'Turnaround', Specialization: 'Hospitality' },
  'Risk, Compliance & Responsible AI': { Experience: '5+ Yrs', Controls: 'Documented', Impact: 'Governance', Specialization: 'Risk' },
  'Legal Operations & Transaction Support': { Experience: '5+ Yrs', Focus: 'Filing Ops', Records: 'Cross-Border', Specialization: 'Documentation' }
};

const METRICS_OVERRIDES = {
  'devops-associate-startup-accelerators': { Experience: 'Hands-On', Systems: 'Linux', Deployment: 'Full-Stack', Specialization: 'Reliability' },
  'event-hospitality-experience-host-corporate-events-luxury-hospitality': { Experience: '5+ Yrs', Events: '4 Corporate', Focus: 'MICE QA', Service: 'Luxury' },
  'legal-operations-analyst-law-firms-and-transaction-advisory': { Experience: '5+ Yrs', Focus: 'Filing Ops', Records: 'Cross-Border', Specialization: 'Documentation' },
  'founders-associate-healthcare-startup-ecosystems': { Experience: '5+ Yrs', Ventures: 'Stealth+Live', Impact: 'Healthcare', Specialization: 'Founder Ops' },
  'experiential-event-producer-financial-services-law-firms': { Experience: '5+ Yrs', Events: 'Finance + MICE', Focus: 'Client Entertainment', Specialization: 'Regulated Audiences' },
  'strategy-development-associate-hospitality-corporate-groups': { Experience: '5+ Yrs', Properties: '4 Hotels', Impact: 'Portfolio', Specialization: 'Corp Dev' }
};

for (const variant of variantsDoc.variants) {
  if (METRICS_OVERRIDES[variant.id]) {
    variant.metrics = METRICS_OVERRIDES[variant.id];
  } else if (variant.category && METRICS_BY_CATEGORY[variant.category]) {
    variant.metrics = METRICS_BY_CATEGORY[variant.category];
  }
}

// ── Gated pair expansion (2 approved) ──
const GATED_NEW_VARIANTS = [
  {
    id: 'experiential-event-producer-financial-services-law-firms',
    role: 'Experiential Event Producer',
    category: 'Innovation Programs & Events',
    industry: 'Financial Services & Law Firms',
    targeted: true,
    weight: 10,
    description:
      'Produces finance- and law-firm-facing programmes—hackathons, conference lead magnets, and corporate hospitality—where regulatory credibility and client entertainment quality must read as one arc.',
    location: 'London, UK / Global',
    metrics: { Experience: '5+ Yrs', Events: 'Finance + MICE', Focus: 'Client Entertainment', Specialization: 'Regulated Audiences' },
    requiredKeywords: ['Event Production', 'Financial Services', 'Law Firms', 'Conference Marketing', 'Corporate Events', 'Sponsorship'],
    pdfFilename: 'Kartavya_Jharwal_Resume_Event_Producer_Financial_Services_Law_Firms.pdf',
    content: {
      experience: [
        exp('work-hult-ai-collective', 'work-hult-ai-collective-h1', 'work-hult-ai-collective-h5'),
        exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h10', 'work-savi-hotels-resorts-jaipur-india-h11'),
        exp('work-family-real-estate-business-jaipur-india', 'work-family-real-estate-business-jaipur-india-h1', 'work-family-real-estate-business-jaipur-india-h2')
      ],
      projects: [
        proj('proj-carbon-forward-conference-lead-magnet-design', 'proj-carbon-forward-conference-lead-magnet-design-h0', 'proj-carbon-forward-conference-lead-magnet-design-h1'),
        proj('proj-redshaw-advisors-brand-strategy-and-campaign-kit', 'proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0', 'proj-redshaw-advisors-brand-strategy-and-campaign-kit-h1')
      ],
      skills: ['skill-founder-and-venture-building'],
      leadership: []
    }
  },
  {
    id: 'strategy-development-associate-hospitality-corporate-groups',
    role: 'Strategy & Operations Associate',
    category: 'Executive Operations & Chief of Staff',
    industry: 'Hospitality Corporate Groups',
    targeted: true,
    weight: 10,
    description:
      'Supports hospitality corporate development—portfolio innovation envelopes, property turnaround diagnostics, and lease-decision evidence—for group-level strategy teams distinct from single-asset operations.',
    location: 'Global',
    metrics: { Experience: '5+ Yrs', Properties: '4 Hotels', Impact: 'Portfolio', Specialization: 'Corp Dev' },
    requiredKeywords: ['Hospitality Corporate Development', 'Portfolio Strategy', 'Innovation Diagnostic', 'Turnaround', 'RevPAR', 'Operating Model'],
    pdfFilename: 'Kartavya_Jharwal_Resume_Strategy_Operations_Associate_Hospitality_Corporate_Groups.pdf',
    content: {
      experience: [
        exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h0', 'work-savi-hotels-resorts-jaipur-india-h4'),
        exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h0', 'work-srbs-group-jaipur-india-h1')
      ],
      projects: [
        proj('proj-ihcl-taj-hotels-corporate-innovation-diagnostic', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h0', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h1'),
        proj('proj-noritake-hospitality-tableware-positioning-strategy', 'proj-noritake-hospitality-tableware-positioning-strategy-h0', 'proj-noritake-hospitality-tableware-positioning-strategy-h1')
      ],
      skills: ['skill-founder-and-venture-building', 'skill-data-and-databases'],
      leadership: []
    }
  }
];

for (const variant of GATED_NEW_VARIANTS) {
  const existing = variantsDoc.variants.find(v => v.id === variant.id);
  if (existing) {
    Object.assign(existing, variant);
  } else {
    variantsDoc.variants.push(variant);
  }
}

// Tag new highlights for gated pairs
addVariants('work-hult-ai-collective-h1', 'experiential-event-producer-financial-services-law-firms');
addVariants('work-hult-ai-collective-h5', 'experiential-event-producer-financial-services-law-firms');
addVariants('proj-carbon-forward-conference-lead-magnet-design-h0', 'experiential-event-producer-financial-services-law-firms');
addVariants('proj-carbon-forward-conference-lead-magnet-design-h1', 'experiential-event-producer-financial-services-law-firms');
addVariants('work-savi-hotels-resorts-jaipur-india-h4', 'strategy-development-associate-hospitality-corporate-groups');
addVariants('proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h0', 'strategy-development-associate-hospitality-corporate-groups');
addVariants('proj-noritake-hospitality-tableware-positioning-strategy-h0', 'strategy-development-associate-hospitality-corporate-groups');
addVariants('proj-noritake-hospitality-tableware-positioning-strategy-h1', 'strategy-development-associate-hospitality-corporate-groups');

// Sanitize leased-hotel dedupe (preserve turnarounds + PE ops)
for (const variant of variantsDoc.variants) {
  if (!variant.content) continue;
  const hasSavi = (variant.content.experience || []).some(e => e.id === 'work-savi-hotels-resorts-jaipur-india');
  const hasLeased = (variant.content.projects || []).some(p => p.id === 'proj-leased-hotel-turnaround-and-operating-model-strategy');
  const allowBoth =
    variant.id === 'management-consultant-mbb-standard-corporate-turnarounds' ||
    variant.id === 'executive-translation-lead-private-equity-operations' ||
    variant._allowLeasedHotelWithSavi;
  if (hasSavi && hasLeased && !allowBoth) {
    variant.content.projects = variant.content.projects.filter(p => p.id !== 'proj-leased-hotel-turnaround-and-operating-model-strategy');
  }
  delete variant._allowLeasedHotelWithSavi;
}

resume.meta.version = '1.12.0';
resume.meta.lastModified = '2026-08-30';
variantsDoc.canonicalMaster.roleSpecificTailoringStatus = `Editorial polish: cluster/friction rewrites, thin-pair fixes, design rebalance, gated pairs; ${variantsDoc.variants.length} role × industry pairs as of 2026-08-30.`;

writeFileSync(resumePath, `${JSON.stringify(resume, null, 2)}\n`, 'utf8');
writeFileSync(variantsPath, `${JSON.stringify(variantsDoc, null, 2)}\n`, 'utf8');

console.log(`✓ Editorial polish applied (${variantsDoc.variants.length} variants)`);
