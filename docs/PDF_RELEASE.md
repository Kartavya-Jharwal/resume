# PDF / DOCX release readiness

Download artifacts are **WeasyPrint PDFs** (vector text, embedded Newsreader, tagged) plus **editable DOCX** with static Newsreader instances. Chromium is used only to measure A4 fit for the site payload — never as the download PDF renderer.

## Priority variant set (MVP)

These variants align with scout, partner, and associate launch audiences. Prefer shipping them first when batching, but production `build:pdf --yes` emits **all** variants.

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

# Fit + WeasyPrint PDF/DOCX for every variant
bun run build:pdf --yes

# Composition emit only (no site rebuild)
bun run pillar3:publish

# Verify on-disk PDFs against fitted payload
bun run test:pdf
```

## Waiver (pre-launch)

Variants may ship without on-disk PDFs until the batch completes. The UI surfaces an honest toast (`PDF not yet generated for this cut`) and disables download styling when `pdfAvailable: false`.

## Spot-check before deploy

1. Download PDF for fallback variant — vector text, not a raster sheet; typography matches the on-screen proof’s canon.
2. Open the matching DOCX — editable text with embedded Newsreader faces.
3. Confirm `dist/resumes/manifest.json` entries use `"engine": "weasyprint"`.
4. Confirm `build-report.json` `pdfGeneration` is `weasyprint` and `pdfs` count meets the launch bar.
