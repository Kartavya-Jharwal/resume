# PDF release readiness (Stage 6)

## Priority variant set (MVP)

These 12 variants align with scout, partner, and associate launch audiences. Ship PDFs for these before broader coverage:

| Variant ID | Role · Industry |
|------------|-----------------|
| `early-stage-operator-yc-alumni-startups` | Startup Operations Manager · Early-Stage Technology Startups (fallback) |
| `management-consultant-mbb-standard-big-3-consulting` | Strategy Consultant · MBB Strategy Consulting |
| `venture-diligence-analyst-pre-seed-funds` | Venture Capital Analyst · Early-Stage Funds |
| `forward-deployed-innovator-enterprise-ai` | Forward-Deployed Engineer · Enterprise & Applied AI |
| `behavioral-product-manager-digital-wellness` | Product Manager · Digital Health & Consumer Products |
| `mlops-engineer-enterprise-applied-ai` | MLOps Engineer · Enterprise & Applied AI |
| `executive-translation-lead-fortune-500-strategy` | Executive Translation Lead · Fortune 500 Strategy |
| `innovation-ecosystem-architect-startup-accelerators` | Innovation Ecosystem Architect · Startup Accelerators |
| `design-systems-architect-enterprise-b2b-saas` | Product Designer · Enterprise B2B SaaS |
| `zero-cost-growth-hacker-d2c-marketplaces` | Zero-Cost Growth Hacker · D2C Marketplaces |
| `agentic-systems-architect-autonomous-ai-labs` | Agentic Systems Architect · Autonomous AI Labs |
| `hybrid-creative-technologist-elite-digital-agencies` | Hybrid Creative Technologist · Elite Digital Agencies |

Config source: `config/release-priority-variants.json`.

## Build commands

```bash
# Site only (retains existing dist/resumes/)
bun run build

# Full PDF batch (requires confirmation)
bun run build:pdf --yes

# Verify PDFs
bun run test:pdf
```

## Waiver (pre-launch)

Non-priority variants may ship without on-disk PDFs. The UI surfaces an honest toast (`PDF not yet generated for this cut`) and disables download styling when `pdfAvailable: false` in `public/data.js`.

## Spot-check before deploy

1. Download PDF for fallback variant — text matches on-screen proof.
2. Download PDF for one strategy and one AI variant.
3. Confirm `build-report.json` `pdfs` count meets launch bar.
