# Deploy checklist (Stage 10)

1. `bun run test` — site tests green (`--skip-pdfs` ok for fast path).
2. Decide PDF scope: `bun run build:pdf --yes` for priority set or full batch (see `docs/PDF_RELEASE.md`).
3. `bun run test:pdf` if PDFs were generated.
4. Manual QA matrix (`docs/QA_MATRIX.md`).
5. Validate share cards (LinkedIn Post Inspector, X composer preview).
6. `bun run deploy` or `bun run deploy:pdf` per PDF decision.
7. Verify custom domain + `CNAME` for `resume.kartavya.tech`.
8. Post launch link; monitor 404s on `/resumes/*`.

## Post-launch verify

- [ ] Gateway loads with fallback profile
- [ ] Copy link + deep link work on mobile and desktop
- [ ] `og:image` resolves at `https://resume.kartavya.tech/assets/img/og-default.png`
- [ ] Priority variant PDFs download successfully
