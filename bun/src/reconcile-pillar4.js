#!/usr/bin/env bun
/**
 * One-shot Pillar 4 source reconciliation: bullets, taxonomy, content plans, new pairs.
 * Run: bun run bun/src/reconcile-pillar4.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const resumePath = resolve(ROOT, 'data/resume.json');
const variantsPath = resolve(ROOT, 'data/variants.json');

const resume = JSON.parse(readFileSync(resumePath, 'utf8'));
const variantsDoc = JSON.parse(readFileSync(variantsPath, 'utf8'));

const BULLET_REWRITES = {
  'work-astropatshala-h0': "Built AstroPatshala's repeatable operating model by defining how pricing and licensing governed packaged services, market entry, and delivery.",
  'work-hult-ai-collective-h0': "Took Hult's student AI organisation from operating concept to public launch by building its programming calendar, outreach cadence, event delivery, treasury controls, and technical infrastructure.",
  'work-hult-ai-collective-h1': "Produced the HAC x Hult Finance Hackathon with the Hult Banking Society from partner alignment and the event dossier through speaker outreach, workshops, and on-site delivery.",
  'work-hult-ai-collective-h5': "Used partner-fit research to prioritise institutional and commercial prospects, then tailored outreach and follow-up into a sponsorship pipeline for HAC events and programmes.",
  'work-savi-hotels-resorts-jaipur-india-h0': "Built the hotel's month-one turnaround baseline by mapping RevPAR and room occupancy against staffing, guest satisfaction, asset condition, and daily service friction for the property team.",
  'work-savi-hotels-resorts-jaipur-india-h2': "Raised month-on-month room occupancy above the inherited baseline during the two-month operational lead, while tracking F&B sales as a separate commercial metric for the turnaround case.",
  'work-family-real-estate-business-jaipur-india-h0': "Moved a 12-property portfolio—8 apartments and 4 hostels—from construction coordination through commercial readiness into sales and leasing.",
  'work-siya-the-restaurant-srbs-group-h1': "Sequenced back-of-house control from delivery intake through storage and FIFO rotation, preparation allocation, shift handover, and daily reconciliation.",
  'work-srbs-group-jaipur-india-h0': "Recommended—and subsequently helped execute—the approximately GBP 40,000 Shimla hotel lease after integrating market conditions, prior operator books, asset quality, downside risk, operating synergies, and valuation.",
  'proj-family-governance-and-office-access-model-h0': "Produced a family-governance proposal defining decision rights, ownership, authority, information flow, accountability, and boundaries between family, business, and investment decisions.",
  'proj-danone-yopro-apex-diagnostic-h3': "Benchmarked a GBP 3.20 per 200 g APEX pot against a PPP- and exchange-rate-adjusted functional-yoghurt basket containing Core YoPRO and competitors, then scoped a stage-gated UK pilot to test the premium.",
  'proj-noritake-hospitality-tableware-positioning-strategy-h1': "Applied Blue Ocean and strategic-group repositioning, then modelled 15% to 25% premium pricing across 40% to 50% of tabletop revenue to project USD 54 million to USD 90 million in incremental revenue.",
  'proj-toast-hotel-f-b-expansion-strategy-h1': "Compared Toast's core restaurant economics with a 50–200-property hotel-chain model, deriving USD 120,000 ACV, 11.9:1 LTV/CAC versus 1.4:1 in core, and USD 6.82 billion incremental 10-year NPV.",
  'proj-walmart-capital-budgeting-and-future-proofing-model-h1': "Derived a 7.8% WACC from CAPM cost of equity, debt cost, capital weights, and a 21% tax rate, then discounted projected cash flows to USD 164.05 billion NPV, 15.7% IRR, 2.83 profitability index, and under-9-month discounted payback.",
  'proj-walmart-pfand-circular-retail-strategy-h1': "Defined a six-month pilot scorecard using UI error rates, operational reports, post-interaction surveys, and kiosk transactions, targeting 50% fewer errors, 40% fewer manual interventions, 15% higher satisfaction, and 25% higher kiosk sales.",
  'proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform-h4': "Built Crestara's launch economics from GBP 50,000 seed funding plus GBP 12,000–15,000 founder and friends-and-family capital, pricing three hardware tiers at GBP 329–999 alongside subscriptions and GBP 800 annual maintenance contracts.",
  'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h1': "Carved 30% of IHCL's proposed INR 5,000 crore envelope into an INR 1,500 crore Box 3 portfolio across Qmin, ama, Tree of Life, and new ventures, with fuzzy gates tied to repeat purchase, NPS, contribution margin, and kill thresholds.",
  'proj-bwc-adaptive-efficiency-investment-desk-h5': "Defended the strategy through a 2,600-word investment-committee memo and 20-slide oral defence, scoring 422/430 overall across architecture and logs, strategy and reporting, and the client postmortem.",
  'proj-leased-hotel-turnaround-and-operating-model-strategy-h0': "Framed the month-one turnaround as a consultant diagnostic, mapping RevPAR, room occupancy, staffing, guest satisfaction, asset condition, and service friction into a lease-decision baseline.",
  'proj-leased-hotel-turnaround-and-operating-model-strategy-h1': "Designed the month-two mobile-first front-desk and staff workflow architecture as an implementation case separate from day-to-day hotel operations.",
  'proj-leased-hotel-turnaround-and-operating-model-strategy-h2': "Documented room-occupancy recovery and F&B sales as separate commercial levers in a mixed-revenue turnaround model used for the lease valuation case.",
  'proj-leased-hotel-turnaround-and-operating-model-strategy-h3': "Preserved the two-month profitability kill gate, offboarding trail, and future-lease pitchbook as the decision record for the ETA case."
};

const VARIANT_ID_MIGRATIONS = {
  'heavy-industry-value-engineer-agritech': 'solutions-engineer-culinary-hospitality-systems'
};

const CATEGORY_BY_ROLE = {
  'Startup Operations Manager': 'Executive Operations & Chief of Staff',
  'Strategy & Operations Associate': 'Executive Operations & Chief of Staff',
  'Project Manager': 'Executive Operations & Chief of Staff',
  "Founder's Associate": 'Executive Operations & Chief of Staff',
  'Chief of Staff': 'Executive Operations & Chief of Staff',
  'Venture Capital Analyst': 'Strategy, Investment & Private Wealth',
  'Strategy Consultant': 'Strategy, Investment & Private Wealth',
  'Investment Banking Analyst': 'Strategy, Investment & Private Wealth',
  'PropTech Investment Analyst': 'Strategy, Investment & Private Wealth',
  'Family Office Analyst': 'Strategy, Investment & Private Wealth',
  'Innovation Program Manager': 'Innovation Programs & Events',
  'Experiential Event Producer': 'Innovation Programs & Events',
  'Forward-Deployed Engineer': 'AI Engineering',
  'AI Agent Engineer': 'AI Engineering',
  'Machine Learning Engineer': 'AI Engineering',
  'Product Manager': 'Product Management',
  'Interaction Designer': 'Product, UX & Experience Design',
  'Product Designer': 'Product, UX & Experience Design',
  'Creative Technologist': 'Product, UX & Experience Design',
  'UX Researcher': 'Product, UX & Experience Design',
  'Spatial Experience Designer': 'Product, UX & Experience Design',
  'UI/UX Designer': 'Product, UX & Experience Design',
  'SEO and Generative Search Specialist': 'Growth, Content & Developer Community',
  'Growth Marketing Manager': 'Growth, Content & Developer Community',
  'Developer Relations Engineer': 'Growth, Content & Developer Community',
  'Developer Community Manager': 'Growth, Content & Developer Community',
  'GTM Analyst': 'Growth, Content & Developer Community',
  'AI Knowledge Operations Specialist': 'Growth, Content & Developer Community',
  'Data Visualization Consultant': 'Data & Decision Intelligence',
  'Business Intelligence Analyst': 'Data & Decision Intelligence',
  'Data Scientist': 'Data & Decision Intelligence',
  'Founding Engineer': 'Technical Delivery, Infrastructure & Solutions',
  'IT Infrastructure and Security Engineer': 'Technical Delivery, Infrastructure & Solutions',
  'Software Quality Assurance Analyst': 'Technical Delivery, Infrastructure & Solutions',
  'Systems Administrator': 'Technical Delivery, Infrastructure & Solutions',
  'Solutions Engineer': 'Technical Delivery, Infrastructure & Solutions',
  'Research and Development Engineer': 'Technical Delivery, Infrastructure & Solutions',
  'DevOps Associate': 'Technical Delivery, Infrastructure & Solutions',
  'Organizational Design Consultant': 'Organizational & Systems Design',
  'Systems Designer': 'Organizational & Systems Design',
  'Culinary Strategy & Operations Consultant': 'Hospitality & Culinary Operations',
  'Operations Manager': 'Hospitality & Culinary Operations',
  'Culinary Stagiaire': 'Hospitality & Culinary Operations',
  'Back-of-House Logistics Coordinator': 'Hospitality & Culinary Operations',
  'Front-of-House and Reception Associate': 'Hospitality & Culinary Operations',
  'Responsible AI Analyst': 'Risk, Compliance & Responsible AI',
  'Risk & Compliance Analyst': 'Risk, Compliance & Responsible AI'
};

const CATEGORY_OVERRIDES = {
  'solutions-engineer-culinary-hospitality-systems': 'Hospitality & Culinary Operations'
};

function exp(id, ...highlights) {
  return { id, highlights };
}

function proj(id, ...highlights) {
  return { id, highlights };
}

const CONTENT_OVERRIDES = {
  'management-consultant-mbb-standard-big-3-consulting': {
    experience: [
      exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h0', 'work-srbs-group-jaipur-india-h2'),
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h0', 'work-savi-hotels-resorts-jaipur-india-h2'),
      exp('work-astropatshala', 'work-astropatshala-h0', 'work-astropatshala-h1')
    ],
    projects: [
      proj('proj-samsung-and-huawei-strategic-resilience-analysis', 'proj-samsung-and-huawei-strategic-resilience-analysis-h0', 'proj-samsung-and-huawei-strategic-resilience-analysis-h1'),
      proj('proj-noritake-hospitality-tableware-positioning-strategy', 'proj-noritake-hospitality-tableware-positioning-strategy-h0', 'proj-noritake-hospitality-tableware-positioning-strategy-h1')
    ],
    skills: [],
    leadership: []
  },
  'innovation-ecosystem-architect-startup-accelerators': {
    experience: [
      exp('work-hult-ai-collective', 'work-hult-ai-collective-h0', 'work-hult-ai-collective-h5'),
      exp('work-margadarshaka', 'work-margadarshaka-h1', 'work-margadarshaka-h3')
    ],
    projects: [
      proj('proj-project-oulm-one-ymca-youth-community-platform', 'proj-project-oulm-one-ymca-youth-community-platform-h0', 'proj-project-oulm-one-ymca-youth-community-platform-h1'),
      proj('proj-ihcl-taj-hotels-corporate-innovation-diagnostic', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h1', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h2')
    ],
    skills: ['skill-founder-and-venture-building'],
    leadership: ['lead-hult-founders-lab']
  },
  'innovation-ecosystem-architect-university-innovation-hubs': {
    experience: [
      exp('work-hult-ai-collective', 'work-hult-ai-collective-h2', 'work-hult-ai-collective-h3'),
      exp('work-margadarshaka', 'work-margadarshaka-h0', 'work-margadarshaka-h1')
    ],
    projects: [
      proj('proj-project-ganet-finance-digital-garden-and-learning-collective', 'proj-project-ganet-finance-digital-garden-and-learning-collective-h0', 'proj-project-ganet-finance-digital-garden-and-learning-collective-h1'),
      proj('proj-nirmana-design-capstone', 'proj-nirmana-design-capstone-h0', 'proj-nirmana-design-capstone-h1')
    ],
    skills: ['skill-founder-and-venture-building'],
    leadership: ['lead-peer-instruction']
  },
  'innovation-ecosystem-architect-corporate-venture-labs': {
    experience: [
      exp('work-hult-ai-collective', 'work-hult-ai-collective-h4', 'work-hult-ai-collective-h5'),
      exp('work-independent-healthcare-venture-client-anonymised', 'work-independent-healthcare-venture-client-anonymised-h0', 'work-independent-healthcare-venture-client-anonymised-h1')
    ],
    projects: [
      proj('proj-ihcl-taj-hotels-corporate-innovation-diagnostic', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h1', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h3'),
      proj('proj-danone-yopro-apex-diagnostic', 'proj-danone-yopro-apex-diagnostic-h0', 'proj-danone-yopro-apex-diagnostic-h3')
    ],
    skills: ['skill-founder-and-venture-building'],
    leadership: []
  },
  'product-manager-startup-accelerators': {
    experience: [
      exp('work-independent-healthcare-venture-client-anonymised', 'work-independent-healthcare-venture-client-anonymised-h0', 'work-independent-healthcare-venture-client-anonymised-h1'),
      exp('work-margadarshaka', 'work-margadarshaka-h0', 'work-margadarshaka-h1')
    ],
    projects: [
      proj('proj-project-oulm-one-ymca-youth-community-platform', 'proj-project-oulm-one-ymca-youth-community-platform-h0', 'proj-project-oulm-one-ymca-youth-community-platform-h3'),
      proj('proj-restaurant-operations-platform-for-independent-client', 'proj-restaurant-operations-platform-for-independent-client-h0', 'proj-restaurant-operations-platform-for-independent-client-h1')
    ],
    skills: ['skill-product-design-and-spatial-tools', 'skill-founder-and-venture-building'],
    leadership: ['lead-hult-founders-lab']
  },
  'project-manager-startup-accelerators': {
    experience: [
      exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h1', 'work-srbs-group-jaipur-india-h3'),
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h1', 'work-savi-hotels-resorts-jaipur-india-h7'),
      exp('work-hult-ai-collective', 'work-hult-ai-collective-h1', 'work-hult-ai-collective-h0')
    ],
    projects: [
      proj('proj-project-oulm-one-ymca-youth-community-platform', 'proj-project-oulm-one-ymca-youth-community-platform-h0', 'proj-project-oulm-one-ymca-youth-community-platform-h1')
    ],
    skills: ['skill-founder-and-venture-building'],
    leadership: ['lead-hult-founders-lab']
  },
  'devops-associate-startup-accelerators': {
    experience: [
      exp('work-margadarshaka', 'work-margadarshaka-h0', 'work-margadarshaka-h1'),
      exp('work-siya-the-restaurant-srbs-group', 'work-siya-the-restaurant-srbs-group-h0', 'work-siya-the-restaurant-srbs-group-h2')
    ],
    projects: [
      proj('proj-software-engineering-and-systems-projects', 'proj-software-engineering-and-systems-projects-h2', 'proj-software-engineering-and-systems-projects-h0'),
      proj('proj-personal-knowledge-management-system', 'proj-personal-knowledge-management-system-h2', 'proj-personal-knowledge-management-system-h1')
    ],
    skills: ['skill-systems-and-devops', 'skill-backend-and-apis'],
    leadership: ['lead-hult-founders-lab']
  },
  'founders-associate-startup-accelerators': {
    experience: [
      exp('work-independent-healthcare-venture-client-anonymised', 'work-independent-healthcare-venture-client-anonymised-h1', 'work-independent-healthcare-venture-client-anonymised-h0'),
      exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h0', 'work-srbs-group-jaipur-india-h4'),
      exp('work-astropatshala', 'work-astropatshala-h0', 'work-astropatshala-h2')
    ],
    projects: [
      proj('proj-project-oulm-one-ymca-youth-community-platform', 'proj-project-oulm-one-ymca-youth-community-platform-h0', 'proj-project-oulm-one-ymca-youth-community-platform-h2'),
      proj('proj-astropatshala-brand-naming-and-voice-system', 'proj-astropatshala-brand-naming-and-voice-system-h0', 'proj-astropatshala-brand-naming-and-voice-system-h1')
    ],
    skills: ['skill-founder-and-venture-building'],
    leadership: ['lead-hult-founders-lab']
  },
  'gtm-analyst-startup-accelerators': {
    experience: [
      exp('work-astropatshala', 'work-astropatshala-h1', 'work-astropatshala-h2'),
      exp('work-independent-healthcare-venture-client-anonymised', 'work-independent-healthcare-venture-client-anonymised-h0', 'work-independent-healthcare-venture-client-anonymised-h1')
    ],
    projects: [
      proj('proj-astropatshala-aarrr-growth-strategy', 'proj-astropatshala-aarrr-growth-strategy-h0', 'proj-astropatshala-aarrr-growth-strategy-h1'),
      proj('proj-redshaw-advisors-brand-strategy-and-campaign-kit', 'proj-redshaw-advisors-brand-strategy-and-campaign-kit-h0', 'proj-redshaw-advisors-brand-strategy-and-campaign-kit-h1')
    ],
    skills: ['skill-founder-and-venture-building', 'skill-data-and-databases'],
    leadership: ['lead-hult-founders-lab']
  },
  'ui-ux-designer-startup-accelerators': {
    experience: [
      exp('work-independent-healthcare-venture-client-anonymised', 'work-independent-healthcare-venture-client-anonymised-h0', 'work-independent-healthcare-venture-client-anonymised-h1'),
      exp('work-margadarshaka', 'work-margadarshaka-h2', 'work-margadarshaka-h0')
    ],
    projects: [
      proj('proj-project-oulm-one-ymca-youth-community-platform', 'proj-project-oulm-one-ymca-youth-community-platform-h2', 'proj-project-oulm-one-ymca-youth-community-platform-h1'),
      proj('proj-nirmana-design-capstone', 'proj-nirmana-design-capstone-h1', 'proj-nirmana-design-capstone-h0')
    ],
    skills: ['skill-product-design-and-spatial-tools', 'skill-founder-and-venture-building'],
    leadership: ['lead-hult-founders-lab']
  },
  'systems-designer-startup-accelerators': {
    experience: [
      exp('work-astropatshala', 'work-astropatshala-h0', 'work-astropatshala-h2'),
      exp('work-margadarshaka', 'work-margadarshaka-h0', 'work-margadarshaka-h1')
    ],
    projects: [
      proj('proj-family-governance-and-office-access-model', 'proj-family-governance-and-office-access-model-h0', 'proj-family-governance-and-office-access-model-h1'),
      proj('proj-project-oulm-one-ymca-youth-community-platform', 'proj-project-oulm-one-ymca-youth-community-platform-h0', 'proj-project-oulm-one-ymca-youth-community-platform-h1')
    ],
    skills: ['skill-product-design-and-spatial-tools', 'skill-systems-and-devops'],
    leadership: ['lead-hult-founders-lab']
  },
  'heavy-industry-value-engineer-climatetech': {
    experience: [
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h4', 'work-savi-hotels-resorts-jaipur-india-h6'),
      exp('work-siya-the-restaurant-srbs-group', 'work-siya-the-restaurant-srbs-group-h0', 'work-siya-the-restaurant-srbs-group-h3')
    ],
    projects: [
      proj('proj-octopus-energy-battery-integration-strategy', 'proj-octopus-energy-battery-integration-strategy-h0', 'proj-octopus-energy-battery-integration-strategy-h2'),
      proj('proj-global-development-and-climate-hypothesis-testing', 'proj-global-development-and-climate-hypothesis-testing-h1', 'proj-global-development-and-climate-hypothesis-testing-h2')
    ],
    skills: ['skill-data-and-databases'],
    leadership: []
  },
  'heavy-industry-value-engineer-heavy-manufacturing-tech': {
    experience: [
      exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h2', 'work-srbs-group-jaipur-india-h0'),
      exp('work-margadarshaka', 'work-margadarshaka-h2', 'work-margadarshaka-h3')
    ],
    projects: [
      proj('proj-us-defence-drone-spinout-commercialisation-assessment', 'proj-us-defence-drone-spinout-commercialisation-assessment-h0', 'proj-us-defence-drone-spinout-commercialisation-assessment-h1'),
      proj('proj-ecolithify-sustainable-tableware-concept', 'proj-ecolithify-sustainable-tableware-concept-h0', 'proj-ecolithify-sustainable-tableware-concept-h1')
    ],
    skills: [],
    leadership: []
  },
  'solutions-engineer-culinary-hospitality-systems': {
    experience: [
      exp('work-siya-the-restaurant-srbs-group', 'work-siya-the-restaurant-srbs-group-h0', 'work-siya-the-restaurant-srbs-group-h3'),
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h4', 'work-savi-hotels-resorts-jaipur-india-h6')
    ],
    projects: [
      proj('proj-paca-applied-food-science', 'proj-paca-applied-food-science-h1', 'proj-paca-applied-food-science-h0'),
      proj('proj-pacakatva-culinary-data-platform', 'proj-pacakatva-culinary-data-platform-h0', 'proj-pacakatva-culinary-data-platform-h2')
    ],
    skills: ['skill-culinary-strategy-and-food-technology'],
    leadership: []
  },
  'gastronomic-systems-operator-culinary-consulting': {
    experience: [
      exp('work-siya-the-restaurant-srbs-group', 'work-siya-the-restaurant-srbs-group-h0', 'work-siya-the-restaurant-srbs-group-h2'),
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h4', 'work-savi-hotels-resorts-jaipur-india-h0')
    ],
    projects: [
      proj('proj-pacakatva-culinary-data-platform', 'proj-pacakatva-culinary-data-platform-h0', 'proj-pacakatva-culinary-data-platform-h2'),
      proj('proj-hospitality-craft-and-innovation-article', 'proj-hospitality-craft-and-innovation-article-h0', 'proj-hospitality-craft-and-innovation-article-h1')
    ],
    skills: ['skill-culinary-strategy-and-food-technology'],
    leadership: []
  },
  'management-consultant-mbb-standard-corporate-turnarounds': {
    experience: [
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h0', 'work-savi-hotels-resorts-jaipur-india-h1')
    ],
    projects: [
      proj(
        'proj-leased-hotel-turnaround-and-operating-model-strategy',
        'proj-leased-hotel-turnaround-and-operating-model-strategy-h0',
        'proj-leased-hotel-turnaround-and-operating-model-strategy-h1',
        'proj-leased-hotel-turnaround-and-operating-model-strategy-h2',
        'proj-leased-hotel-turnaround-and-operating-model-strategy-h3'
      )
    ],
    skills: [],
    leadership: []
  },
  'executive-translation-lead-private-equity-operations': {
    experience: [
      exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h0', 'work-srbs-group-jaipur-india-h2'),
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h2', 'work-savi-hotels-resorts-jaipur-india-h3')
    ],
    projects: [
      proj('proj-leased-hotel-turnaround-and-operating-model-strategy', 'proj-leased-hotel-turnaround-and-operating-model-strategy-h2', 'proj-leased-hotel-turnaround-and-operating-model-strategy-h3'),
      proj('proj-duve-venture-diligence-and-industry-tearsheet', 'proj-duve-venture-diligence-and-industry-tearsheet-h0', 'proj-duve-venture-diligence-and-industry-tearsheet-h1')
    ],
    skills: [],
    leadership: []
  },
  'proptech-underwriter-designer-high-end-real-estate-pe': {
    experience: [
      exp('work-family-real-estate-business-jaipur-india', 'work-family-real-estate-business-jaipur-india-h0', 'work-family-real-estate-business-jaipur-india-h1'),
      exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h2', 'work-savi-hotels-resorts-jaipur-india-h7')
    ],
    projects: [
      proj('proj-leased-hotel-turnaround-and-operating-model-strategy', 'proj-leased-hotel-turnaround-and-operating-model-strategy-h2', 'proj-leased-hotel-turnaround-and-operating-model-strategy-h3'),
      proj('proj-london-airbnb-pricing-and-regression-models', 'proj-london-airbnb-pricing-and-regression-models-h1', 'proj-london-airbnb-pricing-and-regression-models-h3')
    ],
    skills: ['skill-data-and-databases'],
    leadership: []
  }
};

function replaceVariantTags(value, oldId, newId) {
  if (Array.isArray(value)) {
    return value.map(tag => (tag === oldId ? newId : tag));
  }
  return value;
}

function walkTags(node, oldId, newId) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.variants)) node.variants = replaceVariantTags(node.variants, oldId, newId);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => walkTags(item, oldId, newId));
    else if (value && typeof value === 'object') walkTags(value, oldId, newId);
  }
}

function applyBulletRewrites() {
  for (const work of resume.work || []) {
    for (const highlight of work.highlights || []) {
      if (BULLET_REWRITES[highlight.id]) highlight.text = BULLET_REWRITES[highlight.id];
    }
    if (work.id === 'work-independent-healthcare-venture-client-anonymised') {
      work.engagementCategory = 'Independent & Stealth Ventures';
    }
  }
  for (const project of resume.projects || []) {
    for (const highlight of project.highlights || []) {
      if (BULLET_REWRITES[highlight.id]) highlight.text = BULLET_REWRITES[highlight.id];
    }
  }
}

function removeVariantTag(tags, variantId) {
  return (tags || []).filter(tag => tag !== variantId);
}

function addStrategicAmbiguityCourse() {
  const education = resume.education?.[0];
  if (!education) return;
  const exists = (education.courses || []).some(course => (typeof course === 'string' ? course : course.name) === 'Strategic Ambiguity');
  if (!exists) {
    education.courses.push({
      name: 'Strategic Ambiguity',
      keywords: [
        'strategy',
        'ambiguity',
        'decision making',
        'leadership',
        'consulting',
        'innovation',
        'product',
        'operations',
        'systems',
        'founder'
      ]
    });
  }
}

function addBrandProject() {
  const exists = resume.projects.some(project => project.id === 'proj-astropatshala-brand-naming-and-voice-system');
  if (exists) return;
  resume.projects.push({
    name: 'AstroPatshala Brand Naming and Voice System',
    description: 'Parallel brand architecture work for AstroPatshala spanning naming methodology, voice, and brandbook development alongside venture operations.',
    url: '',
    variants: [
      'early-stage-operator-yc-alumni-startups',
      'zero-cost-growth-hacker-d2c-marketplaces',
      'gtm-analyst-startup-accelerators',
      'hybrid-creative-technologist-elite-digital-agencies',
      'founders-associate-startup-accelerators',
      'ai-knowledge-operations-specialist-ai-enabled-content-platforms',
      'all'
    ],
    keywords: [
      'brand strategy',
      'naming',
      'voice',
      'brandbook',
      'Double Diamond',
      'rhizomatic process'
    ],
    highlights: [
      {
        text: 'Developed the AstroPatshala name through a Double Diamond and rhizomatic naming process, using a Chaldean numerology engine and pan-Asian phonetic constraints to evaluate candidates.',
        variants: [
          'early-stage-operator-yc-alumni-startups',
          'gtm-analyst-startup-accelerators',
          'founders-associate-startup-accelerators',
          'ai-knowledge-operations-specialist-ai-enabled-content-platforms',
          'all'
        ],
        id: 'proj-astropatshala-brand-naming-and-voice-system-h0'
      },
      {
        text: 'Produced AstroPatshala brand strategy, voice, and brandbook in parallel with the venture operating model, pricing system, and delivery architecture.',
        variants: [
          'early-stage-operator-yc-alumni-startups',
          'hybrid-creative-technologist-elite-digital-agencies',
          'founders-associate-startup-accelerators',
          'ai-knowledge-operations-specialist-ai-enabled-content-platforms',
          'all'
        ],
        id: 'proj-astropatshala-brand-naming-and-voice-system-h1'
      }
    ],
    id: 'proj-astropatshala-brand-naming-and-voice-system'
  });
}

function retagCulinaryEvidence() {
  for (const project of resume.projects) {
    if (project.id === 'proj-paca-applied-food-science' || project.id === 'proj-pacakatva-culinary-data-platform') {
      project.variants = removeVariantTag(project.variants, 'heavy-industry-value-engineer-agritech');
      for (const highlight of project.highlights || []) {
        highlight.variants = removeVariantTag(highlight.variants, 'heavy-industry-value-engineer-agritech');
        if (!highlight.variants.includes('solutions-engineer-culinary-hospitality-systems')) {
          highlight.variants.push('solutions-engineer-culinary-hospitality-systems');
        }
      }
      if (!project.variants.includes('solutions-engineer-culinary-hospitality-systems')) {
        project.variants.push('solutions-engineer-culinary-hospitality-systems');
      }
      if (!project.variants.includes('gastronomic-systems-operator-culinary-consulting')) {
        project.variants.push('gastronomic-systems-operator-culinary-consulting');
      }
    }
    if (project.id === 'proj-danone-yopro-apex-diagnostic') {
      project.variants = removeVariantTag(project.variants, 'heavy-industry-value-engineer-agritech');
      for (const highlight of project.highlights || []) {
        highlight.variants = removeVariantTag(highlight.variants, 'heavy-industry-value-engineer-agritech');
      }
    }
  }
}

function migrateVariantIds() {
  for (const [oldId, newId] of Object.entries(VARIANT_ID_MIGRATIONS)) {
    walkTags(resume, oldId, newId);
    const variant = variantsDoc.variants.find(entry => entry.id === oldId);
    if (variant) {
      variant.id = newId;
      variantsDoc.variantAliases = variantsDoc.variantAliases || {};
      variantsDoc.variantAliases[oldId] = newId;
    }
  }
}

function assignCategories() {
  for (const variant of variantsDoc.variants) {
    variant.category = CATEGORY_OVERRIDES[variant.id] || CATEGORY_BY_ROLE[variant.role] || variant.role;
    if (variant.family) delete variant.family;
  }
}

function updateSpecialVariants() {
  const culinary = variantsDoc.variants.find(variant => variant.id === 'solutions-engineer-culinary-hospitality-systems');
  if (culinary) {
    culinary.industry = 'Culinary & Hospitality Systems';
    culinary.description = 'Translates culinary operations, ingredient science, and hospitality data into commercial product cases, test matrices, and implementation paths for food-and-hospitality systems.';
    culinary.requiredKeywords = [
      'Culinary Operations',
      'Food Science',
      'Hospitality Systems',
      'Menu Engineering',
      'Product Validation',
      'Commercialisation'
    ];
    culinary.pdfFilename = 'Kartavya_Jharwal_Resume_Solutions_Engineer_Culinary_Hospitality_Systems.pdf';
  }
}

function applyContentOverrides() {
  for (const variant of variantsDoc.variants) {
    if (CONTENT_OVERRIDES[variant.id]) {
      variant.content = CONTENT_OVERRIDES[variant.id];
    }
  }
}

function dedupeProjectSelections(content) {
  const seen = new Set();
  content.projects = (content.projects || []).filter(entry => {
    const key = `${entry.id}:${(entry.highlights || []).join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sanitizeContentPlans() {
  for (const variant of variantsDoc.variants) {
    if (!variant.content) continue;
    dedupeProjectSelections(variant.content);
    const hasSavi = (variant.content.experience || []).some(entry => entry.id === 'work-savi-hotels-resorts-jaipur-india');
    const hasLeasedHotel = (variant.content.projects || []).some(entry => entry.id === 'proj-leased-hotel-turnaround-and-operating-model-strategy');
    if (hasSavi && hasLeasedHotel && variant.id !== 'management-consultant-mbb-standard-corporate-turnarounds') {
      variant.content.projects = variant.content.projects.filter(entry => entry.id !== 'proj-leased-hotel-turnaround-and-operating-model-strategy');
    }
  }
}

function addNewPairs() {
  const newVariants = [
    {
      id: 'chief-of-staff-founder-led-family-owned-enterprises',
      role: 'Chief of Staff',
      category: 'Executive Operations & Chief of Staff',
      industry: 'Founder-Led & Family-Owned Enterprises',
      targeted: true,
      weight: 10,
      description: 'Executive operator supporting founder and managing-director priorities across investment decisions, operating controls, governance, business continuity, and time-sensitive special projects.',
      location: 'Global',
      metrics: { Experience: '5+ Yrs', Projects: '20+', Impact: 'High', Specialization: 'Executive Leverage' },
      requiredKeywords: ['Chief of Staff', 'Executive Operations', 'Decision Support', 'Operating Cadence', 'Governance', 'Business Continuity'],
      pdfFilename: 'Kartavya_Jharwal_Resume_Chief_of_Staff_Founder_Led_Family_Owned_Enterprises.pdf',
      content: {
        experience: [
          exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h0', 'work-srbs-group-jaipur-india-h4'),
          exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h4', 'work-savi-hotels-resorts-jaipur-india-h6'),
          exp('work-astropatshala', 'work-astropatshala-h0', 'work-astropatshala-h1')
        ],
        projects: [
          proj('proj-family-governance-and-office-access-model', 'proj-family-governance-and-office-access-model-h0', 'proj-family-governance-and-office-access-model-h3'),
          proj('proj-ihcl-taj-hotels-corporate-innovation-diagnostic', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h1', 'proj-ihcl-taj-hotels-corporate-innovation-diagnostic-h3')
        ],
        skills: ['skill-founder-and-venture-building', 'skill-data-and-databases'],
        leadership: ['lead-hult-founders-lab']
      }
    },
    {
      id: 'family-office-analyst-private-wealth-family-enterprise',
      role: 'Family Office Analyst',
      category: 'Strategy, Investment & Private Wealth',
      industry: 'Private Wealth & Family Enterprise Advisory',
      targeted: true,
      weight: 10,
      description: 'Analyst combining family-enterprise operating context, asset diligence, governance design, portfolio controls, succession workflows, and adviser coordination for private-wealth decision support.',
      location: 'Global',
      metrics: { Experience: '5+ Yrs', Projects: '20+', Impact: 'High', Specialization: 'Family Enterprise' },
      requiredKeywords: ['Family Office', 'Private Wealth', 'Family Governance', 'Portfolio Analysis', 'Due Diligence', 'Succession Planning'],
      pdfFilename: 'Kartavya_Jharwal_Resume_Family_Office_Analyst_Private_Wealth_Family_Enterprise.pdf',
      content: {
        experience: [
          exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h0', 'work-srbs-group-jaipur-india-h2'),
          exp('work-family-real-estate-business-jaipur-india', 'work-family-real-estate-business-jaipur-india-h0', 'work-family-real-estate-business-jaipur-india-h1'),
          exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h2', 'work-savi-hotels-resorts-jaipur-india-h7')
        ],
        projects: [
          proj('proj-family-governance-and-office-access-model', 'proj-family-governance-and-office-access-model-h1', 'proj-family-governance-and-office-access-model-h2'),
          proj('proj-bwc-adaptive-efficiency-investment-desk', 'proj-bwc-adaptive-efficiency-investment-desk-h0', 'proj-bwc-adaptive-efficiency-investment-desk-h2')
        ],
        skills: ['skill-data-and-databases', 'skill-founder-and-venture-building'],
        leadership: []
      }
    },
    {
      id: 'ai-knowledge-operations-specialist-ai-enabled-content-platforms',
      role: 'AI Knowledge Operations Specialist',
      category: 'Growth, Content & Developer Community',
      industry: 'AI-Enabled Content & Knowledge Platforms',
      targeted: true,
      weight: 10,
      description: 'Builds structured knowledge workflows that connect source capture, metadata, retrieval, publishing, provenance, and reusable technical content across AI and research environments.',
      location: 'Global',
      metrics: { Experience: '5+ Yrs', Projects: '20+', Impact: 'High', Specialization: 'Knowledge Ops' },
      requiredKeywords: ['Knowledge Operations', 'Content Operations', 'Information Architecture', 'Metadata Management', 'Static Publishing', 'Workflow Automation'],
      pdfFilename: 'Kartavya_Jharwal_Resume_AI_Knowledge_Operations_Specialist_AI_Content_Platforms.pdf',
      content: {
        experience: [
          exp('work-astropatshala', 'work-astropatshala-h1', 'work-astropatshala-h2'),
          exp('work-hult-ai-collective', 'work-hult-ai-collective-h3', 'work-hult-ai-collective-h4')
        ],
        projects: [
          proj('proj-the-bard-static-publishing-engine', 'proj-the-bard-static-publishing-engine-h0', 'proj-the-bard-static-publishing-engine-h2'),
          proj('proj-personal-knowledge-management-system', 'proj-personal-knowledge-management-system-h0', 'proj-personal-knowledge-management-system-h1')
        ],
        skills: ['skill-backend-and-apis', 'skill-data-and-databases', 'skill-ai-and-ml'],
        leadership: ['lead-peer-instruction']
      }
    },
    {
      id: 'data-scientist-applied-analytics-decision-science',
      role: 'Data Scientist',
      category: 'Data & Decision Intelligence',
      industry: 'Applied Analytics & Decision Science',
      targeted: true,
      weight: 10,
      description: 'Applied data scientist building reproducible datasets, statistical models, experiments, and decision tools across pricing, operations, portfolio risk, and service economics.',
      location: 'Global',
      metrics: { Experience: '5+ Yrs', Projects: '20+', Impact: 'High', Specialization: 'Decision Science' },
      requiredKeywords: ['Data Scientist', 'Statistical Modelling', 'Regression Analysis', 'Hypothesis Testing', 'Python', 'Decision Science'],
      pdfFilename: 'Kartavya_Jharwal_Resume_Data_Scientist_Applied_Analytics_Decision_Science.pdf',
      content: {
        experience: [
          exp('work-siya-the-restaurant-srbs-group', 'work-siya-the-restaurant-srbs-group-h0', 'work-siya-the-restaurant-srbs-group-h2'),
          exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h4', 'work-savi-hotels-resorts-jaipur-india-h6')
        ],
        projects: [
          proj('proj-bwc-quantitative-portfolio-audit-engine', 'proj-bwc-quantitative-portfolio-audit-engine-h0', 'proj-bwc-quantitative-portfolio-audit-engine-h2'),
          proj('proj-global-development-and-climate-hypothesis-testing', 'proj-global-development-and-climate-hypothesis-testing-h0', 'proj-global-development-and-climate-hypothesis-testing-h1')
        ],
        skills: ['skill-data-and-databases', 'skill-ai-and-ml', 'skill-backend-and-apis'],
        leadership: ['lead-peer-instruction']
      }
    },
    {
      id: 'risk-compliance-analyst-technology-regulated-industries',
      role: 'Risk & Compliance Analyst',
      category: 'Risk, Compliance & Responsible AI',
      industry: 'Technology & Regulated Industries',
      targeted: true,
      weight: 10,
      description: 'Maps operational, privacy, governance, and regulatory risks into documented controls, decision gates, audit trails, and accountable stakeholder handoffs.',
      location: 'Global',
      metrics: { Experience: '5+ Yrs', Projects: '20+', Impact: 'High', Specialization: 'Risk Controls' },
      requiredKeywords: ['Risk Assessment', 'Compliance Controls', 'Regulatory Analysis', 'Privacy by Design', 'Governance', 'Audit Trails'],
      pdfFilename: 'Kartavya_Jharwal_Resume_Risk_Compliance_Analyst_Technology_Regulated_Industries.pdf',
      content: {
        experience: [
          exp('work-srbs-group-jaipur-india', 'work-srbs-group-jaipur-india-h1', 'work-srbs-group-jaipur-india-h4'),
          exp('work-savi-hotels-resorts-jaipur-india', 'work-savi-hotels-resorts-jaipur-india-h3', 'work-savi-hotels-resorts-jaipur-india-h6'),
          exp('work-margadarshaka', 'work-margadarshaka-h1', 'work-margadarshaka-h2')
        ],
        projects: [
          proj('proj-us-defence-drone-spinout-commercialisation-assessment', 'proj-us-defence-drone-spinout-commercialisation-assessment-h1', 'proj-us-defence-drone-spinout-commercialisation-assessment-h2'),
          proj('proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform', 'proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform-h2', 'proj-crestara-smart-room-digital-twin-and-privacy-first-iot-platform-h3')
        ],
        skills: ['skill-data-and-databases', 'skill-systems-and-devops', 'skill-ai-and-ml'],
        leadership: []
      }
    }
  ];

  for (const variant of newVariants) {
    if (!variantsDoc.variants.some(entry => entry.id === variant.id)) {
      variantsDoc.variants.push(variant);
    }
  }
}

applyBulletRewrites();
addStrategicAmbiguityCourse();
addBrandProject();
retagCulinaryEvidence();
migrateVariantIds();
assignCategories();
updateSpecialVariants();
applyContentOverrides();
sanitizeContentPlans();
addNewPairs();

resume.meta.version = '1.10.0';
resume.meta.lastModified = '2026-08-30';
variantsDoc.canonicalMaster.roleSpecificTailoringStatus = 'Explicit content plans with backend categories, 64 role × industry pairs, and reconciled master evidence as of 2026-08-30.';

writeFileSync(resumePath, `${JSON.stringify(resume, null, 2)}\n`, 'utf8');
writeFileSync(variantsPath, `${JSON.stringify(variantsDoc, null, 2)}\n`, 'utf8');

console.log(`✓ Reconciled resume (${resume.work.length} work, ${resume.projects.length} projects) and ${variantsDoc.variants.length} variants`);
