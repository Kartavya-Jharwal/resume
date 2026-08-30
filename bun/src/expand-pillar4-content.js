#!/usr/bin/env bun
/**
 * Pillar 4 content expansion: master highlights, projects, variants 65–66, content curation.
 * Run: bun run bun/src/expand-pillar4-content.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resumePath = resolve(ROOT, 'data/resume.json');
const variantsPath = resolve(ROOT, 'data/variants.json');

const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
const variantsDoc = JSON.parse(readFileSync(variantsPath, 'utf8'));

function work(id) {
  const entry = resume.work.find(w => w.id === id);
  if (!entry) throw new Error(`Missing work ${id}`);
  return entry;
}

function pushHighlight(workId, highlight) {
  work(workId).highlights.push(highlight);
}

function pushProject(project) {
  resume.projects.push(project);
}

function exp(workId, ...highlightIds) {
  return { id: workId, highlights: highlightIds };
}

function proj(projectId, ...highlightIds) {
  return { id: projectId, highlights: highlightIds };
}

function setContent(variantId, content) {
  const variant = variantsDoc.variants.find(v => v.id === variantId);
  if (!variant) throw new Error(`Unknown variant ${variantId}`);
  variant.content = content;
}

function hasHighlight(workId, highlightId) {
  return work(workId).highlights.some(h => h.id === highlightId);
}

// ── Margadarshaka h4–h11 ──
const margadarshaka = work('work-margadarshaka');
if (!hasHighlight('work-margadarshaka', 'work-margadarshaka-h4')) {
  const newHighlights = [
    {
      id: 'work-margadarshaka-h4',
      text: "Set stage gates on Margadarshaka's go-to-market—testing demand, unit economics, and human-review cost before any scaled build commitment.",
      variants: ['early-stage-operator-yc-alumni-startups', 'gtm-analyst-startup-accelerators', 'founders-associate-healthcare-startup-ecosystems', 'zero-cost-growth-hacker-d2c-marketplaces']
    },
    {
      id: 'work-margadarshaka-h5',
      text: 'Drafted early cap-table scenarios and angel-outreach materials while mapping investor fit against counselling-liability and payer-user alignment risks.',
      variants: ['venture-diligence-analyst-pre-seed-funds', 'founders-associate-healthcare-startup-ecosystems', 'early-stage-operator-yc-alumni-startups']
    },
    {
      id: 'work-margadarshaka-h6',
      text: 'Prototyped a lightweight edge inference path (Whisper/C++) to hold per-call compute inside the INR 50 ceiling before committing to full voice-stack spend.',
      variants: ['core-ai-pipeline-engineer-biotech', 'customer-facing-founding-engineer-pre-seed-saas', 'forward-deployed-innovator-enterprise-ai', 'devops-associate-startup-accelerators']
    },
    {
      id: 'work-margadarshaka-h7',
      text: 'Designed a psychometric intake layer for career-guidance flows—translating trait signals into counsellor-ready prompts without automating judgment calls.',
      variants: ['behavioral-product-manager-digital-wellness', 'ux-research-translation-lead-civic-tech-platforms', 'ai-governance-ethics-officer-medtech']
    },
    {
      id: 'work-margadarshaka-h8',
      text: 'Ran structured discovery with six-plus practitioners on how AI-assisted career guidance is shifting—synthesising forecasts into product and positioning choices.',
      variants: ['product-manager-startup-accelerators', 'innovation-ecosystem-architect-startup-accelerators', 'gtm-analyst-startup-accelerators']
    },
    {
      id: 'work-margadarshaka-h9',
      text: 'Framed a low-price-point, SDG-aligned access path for regional-language counselling—stress-testing affordability without compromising safeguarding spend.',
      variants: ['ai-governance-ethics-officer-medtech', 'behavioral-product-manager-digital-wellness', 'responsible-ai-analyst-healthcare-regulated-technology']
    },
    {
      id: 'work-margadarshaka-h10',
      text: 'Ran Margadarshaka delivery in two-week Scrum cadences—backlog grooming, design handoffs, and Kanban visibility across engineering and counselling stakeholders.',
      variants: ['design-systems-architect-fintech-platforms', 'design-systems-architect-complex-data-dashboards', 'design-systems-architect-enterprise-b2b-saas', 'product-manager-startup-accelerators']
    },
    {
      id: 'work-margadarshaka-h11',
      text: 'Turned post-call transcripts into structured case dossiers and counsellor dashboards—linking entities, session history, and follow-up tasks in one view.',
      variants: ['design-systems-architect-fintech-platforms', 'design-systems-architect-complex-data-dashboards', 'design-systems-architect-enterprise-b2b-saas', 'ai-knowledge-operations-specialist-ai-enabled-content-platforms', 'data-narrative-consultant-macro-economic-research']
    }
  ];
  margadarshaka.highlights.push(...newHighlights);
}

// ── Savi h8–h11 (IT + MICE) ──
if (!hasHighlight('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h8')) {
  pushHighlight('work-savi-hotels-resorts-jaipur-india', {
    id: 'work-savi-hotels-resorts-jaipur-india-h8',
    text: 'Maintained a five-workstation, eleven-drive hotel IT estate during the operational-lead period—running cabling, storage health checks, and downtime-window patches so front desk and back office stayed live through the turnaround.',
    variants: ['devops-associate-startup-accelerators', 'enterprise-resilience-engineer-managed-service-providers', 'tactical-it-systems-administrator-managed-service-providers', 'design-systems-architect-complex-data-dashboards', 'all']
  });
  pushHighlight('work-savi-hotels-resorts-jaipur-india', {
    id: 'work-savi-hotels-resorts-jaipur-india-h9',
    text: 'Built a property mesh across hotel WiFi gateways, then tied check-in to ticket-based room credentials—issuing unique sign-in and password provisioning per arrival instead of shared lobby passwords.',
    variants: ['devops-associate-startup-accelerators', 'enterprise-resilience-engineer-managed-service-providers', 'tactical-it-systems-administrator-managed-service-providers', 'all']
  });
  pushHighlight('work-savi-hotels-resorts-jaipur-india', {
    id: 'work-savi-hotels-resorts-jaipur-india-h10',
    text: 'Supported four repeat corporate events for decade-long hotel clients—leading three on-site and overseeing two while off-site—by QA-ing buffet timing, staff readiness, and manager shortcuts while the GM ran procurement and venue coordination.',
    variants: ['event-hospitality-experience-host-corporate-events-luxury-hospitality', 'chief-of-staff-founder-led-family-owned-enterprises', 'family-office-analyst-private-wealth-family-enterprise', 'proptech-underwriter-designer-high-end-real-estate-pe']
  });
  pushHighlight('work-savi-hotels-resorts-jaipur-india', {
    id: 'work-savi-hotels-resorts-jaipur-india-h11',
    text: 'Facilitated a milestone birthday and baby-shower package end to end—aligning décor vendors, artisanal menu choices, and live service recovery when mid-level managers cut corners on the floor.',
    variants: ['event-hospitality-experience-host-corporate-events-luxury-hospitality', 'chief-of-staff-founder-led-family-owned-enterprises', 'family-office-analyst-private-wealth-family-enterprise']
  });
}

// ── Hult h6 ──
if (!hasHighlight('work-hult-ai-collective', 'work-hult-ai-collective-h6')) {
  pushHighlight('work-hult-ai-collective', {
    id: 'work-hult-ai-collective-h6',
    text: 'Attended two formal corporate dinners during the Hult period; on the second, stepped into back-of-house logistics for a service gap—building client-side judgment on what reads as polished hospitality versus merely acceptable.',
    variants: ['event-hospitality-experience-host-corporate-events-luxury-hospitality', 'experiential-event-producer-tech-conferences', 'innovation-ecosystem-architect-startup-accelerators']
  });
}

// ── Family real estate h2 ──
if (!hasHighlight('work-family-real-estate-business-jaipur-india', 'work-family-real-estate-business-jaipur-india-h2')) {
  pushHighlight('work-family-real-estate-business-jaipur-india', {
    id: 'work-family-real-estate-business-jaipur-india-h2',
    text: 'Closed high-value residential deals by treating MD and partner entertainment—venue ambience, menu, and after-event hosting—as part of the relationship arc, not an afterthought once terms were agreed.',
    variants: ['event-hospitality-experience-host-corporate-events-luxury-hospitality', 'family-office-analyst-private-wealth-family-enterprise', 'chief-of-staff-founder-led-family-owned-enterprises', 'proptech-underwriter-designer-high-end-real-estate-pe']
  });
}

// ── SRBS h5 + h4 retag ──
const srbs = work('work-srbs-group-jaipur-india');
const h4 = srbs.highlights.find(h => h.id === 'work-srbs-group-jaipur-india-h4');
if (h4) {
  h4.text = 'Prepared a filing-ready legal addendum under counsel direction so counsel could meet a time-sensitive Indian Supreme Court deadline for a related family matter.';
  h4.variants = [...new Set([...(h4.variants || []), 'legal-operations-analyst-law-firms-and-transaction-advisory', 'family-office-analyst-private-wealth-family-enterprise', 'risk-compliance-analyst-technology-regulated-industries'])];
}
if (!hasHighlight('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h5')) {
  pushHighlight('work-srbs-group-jaipur-india', {
    id: 'work-srbs-group-jaipur-india-h5',
    text: 'Verified Indian corporate board resolutions and shareholder records against UK Companies House filings for multi-jurisdiction family-enterprise matters.',
    variants: ['legal-operations-analyst-law-firms-and-transaction-advisory', 'family-office-analyst-private-wealth-family-enterprise', 'investment-banking-analyst-bulge-bracket-investment-banks', 'risk-compliance-analyst-technology-regulated-industries']
  });
}

// ── New projects ──
const projectIds = new Set(resume.projects.map(p => p.id));

if (!projectIds.has('proj-siya-menu-cogs-redesign-and-restaurant-data-platform')) {
  pushProject({
    id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform',
    name: 'Siya Menu COGS Redesign and Restaurant Data Platform',
    description: 'End-to-end menu economics, BOM modelling, elasticity testing, manager-ready Excel casebook, print/web menu design, and parser-fed restaurant data platform for a 191-item SRBS restaurant operation.',
    url: '',
    keywords: ['menu engineering', 'COGS', 'price elasticity', 'bill of materials', 'restaurant analytics', 'Excel modelling', 'parser', 'Three.js'],
    variants: [
      'gastronomic-systems-operator-culinary-consulting',
      'design-systems-architect-enterprise-b2b-saas',
      'design-systems-architect-fintech-platforms',
      'design-systems-architect-complex-data-dashboards',
      'data-scientist-applied-analytics-decision-science',
      'ai-knowledge-operations-specialist-ai-enabled-content-platforms',
      'chief-of-staff-founder-led-family-owned-enterprises',
      'management-consultant-mbb-standard-tier-2-strategy',
      'operations-flow-manager-foodtech',
      'all'
    ],
    highlights: [
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h0', text: 'Digitized every historical menu revision into a comparable archive before any repricing or assortment decision.', variants: ['gastronomic-systems-operator-culinary-consulting', 'data-scientist-applied-analytics-decision-science', 'all'] },
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h1', text: 'Built a competitor menu corpus—traditional and non-traditional—mapped to target ICP and occasion use before elasticity work began.', variants: ['gastronomic-systems-operator-culinary-consulting', 'management-consultant-mbb-standard-tier-2-strategy', 'all'] },
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h2', text: 'Replaced informal call-and-chit ordering with a source-to-ingredient-to-SKU bill of materials tied to each menu line.', variants: ['gastronomic-systems-operator-culinary-consulting', 'operations-flow-manager-foodtech', 'data-scientist-applied-analytics-decision-science', 'all'] },
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h3', text: 'Identified category-placeholder ghost items with negligible velocity and repriced edge-case fillers the market would bear.', variants: ['gastronomic-systems-operator-culinary-consulting', 'all'] },
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h4', text: 'Ran short pricing experiments per item cluster to find ceiling price before margin erosion, then locked results in a failsafe Excel casebook.', variants: ['gastronomic-systems-operator-culinary-consulting', 'data-scientist-applied-analytics-decision-science', 'all'] },
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h5', text: 'Rebuilt menu taxonomy—culinary families, seasonals, and pop-ups—alongside client-facing menu composition, photography selection, and print-ready PDF output.', variants: ['gastronomic-systems-operator-culinary-consulting', 'design-systems-architect-enterprise-b2b-saas', 'hybrid-creative-technologist-elite-digital-agencies', 'all'] },
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h6', text: 'Built a parser on the live Excel model so managers could mark 86\'d items and seasonal prices, feeding a modular restaurant site with delivery hooks and item-level performance pixels.', variants: ['design-systems-architect-enterprise-b2b-saas', 'ai-knowledge-operations-specialist-ai-enabled-content-platforms', 'operations-flow-manager-foodtech', 'all'] },
      { id: 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h7', text: 'Extended the site with dynamic CSS, Three.js animation, allergen and FAQ content, and quick-commerce integration bundled into one manager handoff packet.', variants: ['design-systems-architect-enterprise-b2b-saas', 'hybrid-creative-technologist-elite-digital-agencies', 'all'] }
    ]
  });
}

if (!projectIds.has('proj-hospitality-and-venture-operations-automation')) {
  pushProject({
    id: 'proj-hospitality-and-venture-operations-automation',
    name: 'Hospitality and Venture Operations Automation',
    description: 'Python cron automation across hotel mail, attendance, backups, revenue ingestion, ERP/POS hooks, and AstroPatshala micro-calculators.',
    url: '',
    keywords: ['Python', 'cron', 'automation', 'Power BI', 'REST API', 'POS', 'PMS', 'ETL'],
    variants: ['devops-associate-startup-accelerators', 'tactical-it-systems-administrator-managed-service-providers', 'data-scientist-applied-analytics-decision-science', 'ai-knowledge-operations-specialist-ai-enabled-content-platforms', 'all'],
    highlights: [
      { id: 'proj-hospitality-and-venture-operations-automation-h0', text: 'Automated staff-attendance reminders and operational mail workflows across hotel properties with logged cron schedules and failure alerts.', variants: ['devops-associate-startup-accelerators', 'tactical-it-systems-administrator-managed-service-providers', 'all'] },
      { id: 'proj-hospitality-and-venture-operations-automation-h1', text: 'Built backup and data-sync scripts with recovery paths tested during planned downtime windows.', variants: ['devops-associate-startup-accelerators', 'enterprise-resilience-engineer-managed-service-providers', 'all'] },
      { id: 'proj-hospitality-and-venture-operations-automation-h2', text: 'Wrote weekly revenue ingestion scripts feeding the Excel and Power BI reporting layer that paired with front-desk reconciliation controls.', variants: ['data-scientist-applied-analytics-decision-science', 'tactical-it-systems-administrator-managed-service-providers', 'all'] },
      { id: 'proj-hospitality-and-venture-operations-automation-h3', text: 'Sketched REST integrations between ERP, POS, and PMS systems to reduce manual re-keying across property operations.', variants: ['devops-associate-startup-accelerators', 'tactical-it-systems-administrator-managed-service-providers', 'all'] },
      { id: 'proj-hospitality-and-venture-operations-automation-h4', text: 'Shipped AstroPatshala positional and directional chart calculators as a bundle of small production Python tools alongside document batch-processing utilities.', variants: ['ai-knowledge-operations-specialist-ai-enabled-content-platforms', 'data-scientist-applied-analytics-decision-science', 'all'] }
    ]
  });
}

if (!projectIds.has('proj-independent-risk-modelling-and-control-design')) {
  pushProject({
    id: 'proj-independent-risk-modelling-and-control-design',
    name: 'Independent Risk Modelling and Control Design',
    description: 'NDA-safe risk registers, FMEA, GTM risk trees, and control-design practice spanning hospitality operations, venture launches, and spec-case financial methods.',
    url: '',
    keywords: ['FMEA', 'risk register', 'controls', 'governance', 'crisis prevention', 'audit trail'],
    variants: ['risk-compliance-analyst-technology-regulated-industries', 'family-office-analyst-private-wealth-family-enterprise', 'chief-of-staff-founder-led-family-owned-enterprises', 'investment-banking-analyst-bulge-bracket-investment-banks', 'all'],
    highlights: [
      { id: 'proj-independent-risk-modelling-and-control-design-h0', text: 'Built hotel FMEA and operational risk registers during the Savi turnaround—mapping service failure modes, kill gates, and control owners.', variants: ['risk-compliance-analyst-technology-regulated-industries', 'chief-of-staff-founder-led-family-owned-enterprises', 'all'] },
      { id: 'proj-independent-risk-modelling-and-control-design-h1', text: 'Drafted GTM and market-risk trees for confidential venture launches without naming clients or claiming regulated advice.', variants: ['risk-compliance-analyst-technology-regulated-industries', 'founders-associate-healthcare-startup-ecosystems', 'all'] },
      { id: 'proj-independent-risk-modelling-and-control-design-h2', text: 'Reapplied credit and portfolio-risk methods from spec-case work as independent modelling exercises with documented assumptions.', variants: ['risk-compliance-analyst-technology-regulated-industries', 'investment-banking-analyst-bulge-bracket-investment-banks', 'data-scientist-applied-analytics-decision-science', 'all'] },
      { id: 'proj-independent-risk-modelling-and-control-design-h3', text: 'Produced crisis-prevention playbooks with escalation paths, documentation trails, and committee-ready memos.', variants: ['risk-compliance-analyst-technology-regulated-industries', 'family-office-analyst-private-wealth-family-enterprise', 'all'] },
      { id: 'proj-independent-risk-modelling-and-control-design-h4', text: 'Linked detection, decision, and audit-trail controls into a repeatable operating model for accountable stakeholder handoffs.', variants: ['risk-compliance-analyst-technology-regulated-industries', 'chief-of-staff-founder-led-family-owned-enterprises', 'all'] }
    ]
  });
}

if (!projectIds.has('proj-independent-legal-documentation-and-filing-support')) {
  pushProject({
    id: 'proj-independent-legal-documentation-and-filing-support',
    name: 'Independent Legal Documentation and Filing Support',
    description: 'Confidential documentation practice supporting counsel-directed drafting, affidavit preparation, filing logistics, and cross-jurisdiction corporate-record verification.',
    url: '',
    keywords: ['legal operations', 'filing preparation', 'affidavits', 'Companies House', 'documentation support', 'record verification'],
    variants: ['legal-operations-analyst-law-firms-and-transaction-advisory', 'family-office-analyst-private-wealth-family-enterprise', 'risk-compliance-analyst-technology-regulated-industries', 'chief-of-staff-founder-led-family-owned-enterprises', 'all'],
    highlights: [
      { id: 'proj-independent-legal-documentation-and-filing-support-h0', text: 'Prepared filing-ready civil and intellectual-property drafts from counsel dictation and record bundles—affidavits, indexes, and procedural cross-checks before chamber submission.', variants: ['legal-operations-analyst-law-firms-and-transaction-advisory', 'all'] },
      { id: 'proj-independent-legal-documentation-and-filing-support-h1', text: 'Built a repeatable affidavit workflow spanning fact chronology, exhibit mapping, and consistency checks against source documents.', variants: ['legal-operations-analyst-law-firms-and-transaction-advisory', 'risk-compliance-analyst-technology-regulated-industries', 'all'] },
      { id: 'proj-independent-legal-documentation-and-filing-support-h2', text: 'Verified Indian corporate board resolutions and shareholder records against UK Companies House filings for multi-jurisdiction family-enterprise matters.', variants: ['legal-operations-analyst-law-firms-and-transaction-advisory', 'family-office-analyst-private-wealth-family-enterprise', 'all'] },
      { id: 'proj-independent-legal-documentation-and-filing-support-h3', text: 'Ghost-typed and structurally edited legal memos and transaction papers under partner direction—preserving voice while tightening logic and citation hygiene.', variants: ['legal-operations-analyst-law-firms-and-transaction-advisory', 'all'] },
      { id: 'proj-independent-legal-documentation-and-filing-support-h4', text: 'Tracked court and registry deadlines, version control, and sign-off chains so counsel could file under time pressure.', variants: ['legal-operations-analyst-law-firms-and-transaction-advisory', 'family-office-analyst-private-wealth-family-enterprise', 'all'] }
    ]
  });
}

// ── Document production reinforcement ──
function addProjectHighlight(projectId, highlight) {
  const project = resume.projects.find(p => p.id === projectId);
  if (!project) return;
  if (project.highlights.some(h => h.id === highlight.id)) return;
  project.highlights.push(highlight);
}

addProjectHighlight('proj-danone-yopro-apex-diagnostic', {
  id: 'proj-danone-yopro-apex-diagnostic-h4',
  text: 'Structured the YoPRO APEX diagnostic as a board-ready research packet—custom cover, sourced exhibits, and executive narrative—because graders were practising advisors and ex-partners, not rubric-only academics.',
  variants: ['management-consultant-mbb-standard-tier-2-strategy', 'all']
});
addProjectHighlight('proj-toast-hotel-f-b-expansion-strategy', {
  id: 'proj-toast-hotel-f-b-expansion-strategy-h3',
  text: 'Packaged the Toast hotel-chain expansion case as a partner-grade slide and memo set with exhibit-linked assumptions for committee-style review.',
  variants: ['management-consultant-mbb-standard-big-3-consulting', 'investment-banking-analyst-bulge-bracket-investment-banks', 'all']
});
addProjectHighlight('proj-noritake-hospitality-tableware-positioning-strategy', {
  id: 'proj-noritake-hospitality-tableware-positioning-strategy-h3',
  text: 'Delivered the Noritake repositioning as a director-grade strategy dossier—method-first exhibits, sourced comparables, and a defensible narrative arc for oral defence.',
  variants: ['management-consultant-mbb-standard-big-3-consulting', 'all']
});

// ── Culinary + design + IT content overrides ──
setContent('back-of-house-logistics-coordinator-high-volume-catering', {
  experience: [
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h6', 'work-savi-hotels-resorts-jaipur-india-h8'),
    exp('work-siya-the-restaurant-srbs-group', 'work-siya-the-restaurant-srbs-group-h1', 'work-siya-the-restaurant-srbs-group-h0'),
    exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h1')
  ],
  projects: [
    proj('proj-independent-culinary-development-and-kitchen-systems-practice', 'proj-independent-culinary-development-and-kitchen-systems-practice-h0', 'proj-independent-culinary-development-and-kitchen-systems-practice-h1'),
    proj('proj-culinary-operations-rotation', 'proj-culinary-operations-rotation-h0')
  ],
  skills: ['skill-back-of-house-operations'],
  leadership: []
});

setContent('gastronomic-systems-operator-culinary-consulting', {
  experience: [
    exp('work-siya-the-restaurant-srbs-group', 'work-siya-the-restaurant-srbs-group-h0', 'work-siya-the-restaurant-srbs-group-h1'),
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h4', 'work-savi-hotels-resorts-jaipur-india-h0')
  ],
  projects: [
    proj('proj-siya-menu-cogs-redesign-and-restaurant-data-platform', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h2', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h4'),
    proj('proj-hospitality-craft-and-innovation-article', 'proj-hospitality-craft-and-innovation-article-h0', 'proj-hospitality-craft-and-innovation-article-h1')
  ],
  skills: ['skill-culinary-strategy-and-food-technology'],
  leadership: []
});

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
    exp('work-margadarshaka', 'work-margadarshaka-h1', 'work-margadarshaka-h3')
  ],
  projects: [
    proj('proj-software-engineering-and-systems-projects', 'proj-software-engineering-and-systems-projects-h2', 'proj-software-engineering-and-systems-projects-h3'),
    proj('proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform', 'proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform-h2', 'proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform-h3')
  ],
  skills: ['skill-systems-and-devops'],
  leadership: []
});

setContent('tactical-it-systems-administrator-managed-service-providers', {
  experience: [
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h8', 'work-savi-hotels-resorts-jaipur-india-h9'),
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h6', 'work-savi-hotels-resorts-jaipur-india-h1')
  ],
  projects: [
    proj('proj-hospitality-and-venture-operations-automation', 'proj-hospitality-and-venture-operations-automation-h1', 'proj-hospitality-and-venture-operations-automation-h2'),
    proj('proj-software-engineering-and-systems-projects', 'proj-software-engineering-and-systems-projects-h2', 'proj-software-engineering-and-systems-projects-h3')
  ],
  skills: ['skill-systems-and-devops'],
  leadership: []
});

setContent('design-systems-architect-fintech-platforms', {
  experience: [
    exp('work-margadarshaka', 'work-margadarshaka-h10', 'work-margadarshaka-h11'),
    exp('work-astropatshala', 'work-astropatshala-h2', 'work-astropatshala-h1')
  ],
  projects: [
    proj('proj-project-ganet-finance-digital-garden-and-learning-collective', 'proj-project-ganet-finance-digital-garden-and-learning-collective-h0', 'proj-project-ganet-finance-digital-garden-and-learning-collective-h1'),
    proj('proj-bwc-quantitative-portfolio-audit-engine', 'proj-bwc-quantitative-portfolio-audit-engine-h0', 'proj-bwc-quantitative-portfolio-audit-engine-h2')
  ],
  skills: ['skill-product-design-and-spatial-tools'],
  leadership: []
});

setContent('design-systems-architect-complex-data-dashboards', {
  experience: [
    exp('work-margadarshaka', 'work-margadarshaka-h10', 'work-margadarshaka-h11'),
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h6', 'work-savi-hotels-resorts-jaipur-india-h1')
  ],
  projects: [
    proj('proj-bloom-creative-terminal-visualization', 'proj-bloom-creative-terminal-visualization-h0', 'proj-bloom-creative-terminal-visualization-h4'),
    proj('proj-siya-menu-cogs-redesign-and-restaurant-data-platform', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h6', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h4')
  ],
  skills: ['skill-product-design-and-spatial-tools'],
  leadership: []
});

setContent('design-systems-architect-enterprise-b2b-saas', {
  experience: [
    exp('work-margadarshaka', 'work-margadarshaka-h10', 'work-margadarshaka-h11'),
    exp('work-astropatshala', 'work-astropatshala-h2', 'work-astropatshala-h1')
  ],
  projects: [
    proj('proj-siya-menu-cogs-redesign-and-restaurant-data-platform', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h5', 'proj-siya-menu-cogs-redesign-and-restaurant-data-platform-h7'),
    proj('proj-nirmana-design-capstone', 'proj-nirmana-design-capstone-h0', 'proj-nirmana-design-capstone-h1')
  ],
  skills: ['skill-product-design-and-spatial-tools'],
  leadership: []
});

// ── Margadarshaka rotation for common pairs ──
const MARGADARSHAKA_ROTATION = {
  'early-stage-operator-yc-alumni-startups': ['work-margadarshaka-h4', 'work-margadarshaka-h5'],
  'gtm-analyst-startup-accelerators': ['work-margadarshaka-h4', 'work-margadarshaka-h8'],
  'founders-associate-healthcare-startup-ecosystems': ['work-margadarshaka-h5', 'work-margadarshaka-h4'],
  'venture-diligence-analyst-pre-seed-funds': ['work-margadarshaka-h5', 'work-margadarshaka-h2'],
  'forward-deployed-innovator-enterprise-ai': ['work-margadarshaka-h0', 'work-margadarshaka-h6'],
  'agentic-systems-architect-autonomous-ai-labs': ['work-margadarshaka-h0', 'work-margadarshaka-h6'],
  'core-ai-pipeline-engineer-biotech': ['work-margadarshaka-h6', 'work-margadarshaka-h0'],
  'customer-facing-founding-engineer-pre-seed-saas': ['work-margadarshaka-h6', 'work-margadarshaka-h3'],
  'ai-governance-ethics-officer-medtech': ['work-margadarshaka-h1', 'work-margadarshaka-h9'],
  'behavioral-product-manager-digital-wellness': ['work-margadarshaka-h7', 'work-margadarshaka-h1'],
  'product-manager-startup-accelerators': ['work-margadarshaka-h10', 'work-margadarshaka-h8'],
  'systems-designer-startup-accelerators': ['work-margadarshaka-h3', 'work-margadarshaka-h8'],
  'strategic-interaction-designer-spatial-computing': ['work-margadarshaka-h10', 'work-margadarshaka-h7'],
  'autodidact-skunkworks-researcher-corporate-rd-labs': ['work-margadarshaka-h8', 'work-margadarshaka-h3'],
  'systematic-organizational-designer-deeptech-skunkworks': ['work-margadarshaka-h3', 'work-margadarshaka-h4']
};

for (const [variantId, highlightIds] of Object.entries(MARGADARSHAKA_ROTATION)) {
  const variant = variantsDoc.variants.find(v => v.id === variantId);
  if (!variant?.content?.experience) continue;
  const margEntry = variant.content.experience.find(e => e.id === 'work-margadarshaka');
  if (margEntry) margEntry.highlights = highlightIds;
}

// Risk compliance pair update
setContent('risk-compliance-analyst-technology-regulated-industries', {
  experience: [
    exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h4', 'work-srbs-group-jaipur-india-h5'),
    exp('work-margadarshaka', 'work-margadarshaka-h1', 'work-margadarshaka-h3'),
    exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h3', 'work-savi-hotels-resorts-jaipur-india-h6')
  ],
  projects: [
    proj('proj-independent-risk-modelling-and-control-design', 'proj-independent-risk-modelling-and-control-design-h0', 'proj-independent-risk-modelling-and-control-design-h4'),
    proj('proj-independent-legal-documentation-and-filing-support', 'proj-independent-legal-documentation-and-filing-support-h1', 'proj-independent-legal-documentation-and-filing-support-h4')
  ],
  skills: ['skill-data-and-databases', 'skill-systems-and-devops', 'skill-ai-and-ml'],
  leadership: []
});

// ── New variants 65 + 66 ──
const NEW_VARIANTS = [
  {
    id: 'event-hospitality-experience-host-corporate-events-luxury-hospitality',
    role: 'Event & Hospitality Experience Host',
    category: 'Hospitality & Culinary Operations',
    industry: 'Corporate Events & Luxury Hospitality',
    targeted: true,
    weight: 10,
    description: 'Hosts and quality-assures corporate and milestone hospitality events—bridging BOH execution in Jaipur with London client-side judgment on service polish, décor, and relationship-led entertainment.',
    location: 'Jaipur, India / London, UK',
    metrics: { Experience: '5+ Yrs', Events: '4 Corporate', Focus: 'MICE QA', Service: 'Luxury' },
    requiredKeywords: ['Corporate Events', 'MICE', 'Hospitality Experience', 'Event Facilitation', 'Luxury Service', 'Client Entertainment'],
    pdfFilename: 'Kartavya_Jharwal_Resume_Event_Hospitality_Experience_Host_Corporate_Events_Luxury_Hospitality.pdf',
    content: {
      experience: [
        exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h10', 'work-savi-hotels-resorts-jaipur-india-h11'),
        exp('work-hult-ai-collective', 'work-hult-ai-collective-h6'),
        exp('work-family-real-estate-business-jaipur-india', 'work-family-real-estate-business-jaipur-india-h2', 'work-family-real-estate-business-jaipur-india-h1')
      ],
      projects: [
        proj('proj-culinary-operations-rotation', 'proj-culinary-operations-rotation-h2'),
        proj('proj-hospitality-craft-and-innovation-article', 'proj-hospitality-craft-and-innovation-article-h0', 'proj-hospitality-craft-and-innovation-article-h1')
      ],
      skills: ['skill-front-of-house-and-reception'],
      leadership: []
    }
  },
  {
    id: 'legal-operations-analyst-law-firms-and-transaction-advisory',
    role: 'Legal Operations Analyst',
    category: 'Legal Operations & Transaction Support',
    industry: 'Law Firms & Transaction Advisory',
    targeted: true,
    weight: 10,
    description: 'Supports law-firm and transaction-advisory teams with filing preparation, corporate-record verification, diligence dataroom discipline, and counsel-directed documentation—not licensed legal practice.',
    location: 'Global',
    metrics: { Experience: '5+ Yrs', Focus: 'Filing Ops', Records: 'Cross-Border', Specialization: 'Documentation' },
    requiredKeywords: ['Legal Operations', 'Filing Preparation', 'Corporate Records', 'Due Diligence Support', 'Documentation', 'Companies House'],
    pdfFilename: 'Kartavya_Jharwal_Resume_Legal_Operations_Analyst_Law_Firms_Transaction_Advisory.pdf',
    content: {
      experience: [
        exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h4', 'work-srbs-group-jaipur-india-h5'),
        exp('work-family-real-estate-business-jaipur-india', 'work-family-real-estate-business-jaipur-india-h0', 'work-family-real-estate-business-jaipur-india-h1')
      ],
      projects: [
        proj('proj-independent-legal-documentation-and-filing-support', 'proj-independent-legal-documentation-and-filing-support-h0', 'proj-independent-legal-documentation-and-filing-support-h3'),
        proj('proj-family-governance-and-office-access-model', 'proj-family-governance-and-office-access-model-h0', 'proj-family-governance-and-office-access-model-h1')
      ],
      skills: ['skill-data-and-databases'],
      leadership: []
    }
  }
];

for (const variant of NEW_VARIANTS) {
  if (!variantsDoc.variants.some(v => v.id === variant.id)) {
    variantsDoc.variants.push(variant);
  }
}

// Update gastronomic industry label
const gastronomic = variantsDoc.variants.find(v => v.id === 'gastronomic-systems-operator-culinary-consulting');
if (gastronomic) gastronomic.industry = 'Restaurant Menu & BOH Systems';

// Auto-fix remaining Margadarshaka h0+h1 pairs outside AI clusters
const MARG_ALLOW_H0H1 = new Set([
  'forward-deployed-innovator-enterprise-ai',
  'agentic-systems-architect-autonomous-ai-labs',
  'core-ai-pipeline-engineer-biotech',
  'customer-facing-founding-engineer-pre-seed-saas',
  'ai-governance-ethics-officer-medtech',
  'autodidact-skunkworks-researcher-corporate-rd-labs',
  'systematic-organizational-designer-deeptech-skunkworks',
  'devops-associate-startup-accelerators'
]);

for (const variant of variantsDoc.variants) {
  const marg = variant.content?.experience?.find(e => e.id === 'work-margadarshaka');
  if (!marg) continue;
  const ids = marg.highlights || [];
  if (ids.includes('work-margadarshaka-h0') && ids.includes('work-margadarshaka-h1') && !MARG_ALLOW_H0H1.has(variant.id)) {
    marg.highlights = MARGADARSHAKA_ROTATION[variant.id] || ['work-margadarshaka-h4', 'work-margadarshaka-h5'];
  }
}

resume.meta.version = '1.11.0';
resume.meta.lastModified = '2026-08-30';
variantsDoc.canonicalMaster.roleSpecificTailoringStatus = 'Expanded master evidence with culinary buckets A–C, legal-operations thread, Menu COGS flagship, and 66 role × industry pairs as of 2026-08-30.';

writeFileSync(resumePath, `${JSON.stringify(resume, null, 2)}\n`, 'utf8');
writeFileSync(variantsPath, `${JSON.stringify(variantsDoc, null, 2)}\n`, 'utf8');

console.log(`✓ Expanded resume (${resume.work.length} work, ${resume.projects.length} projects) and ${variantsDoc.variants.length} variants`);
