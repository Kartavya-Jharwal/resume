# `public/` — local compile target only

This folder is **not** the GitHub Pages deploy root. Production artifacts live under `dist/`.

| Path | Purpose |
|------|---------|
| `public/data.js` | Output of `bun run compile` (unfitted debug payload). Listed in `.gitignore`. |
| `public/resumes/` | Legacy placeholder. Variant PDFs are published to **`dist/resumes/`** after `bun run build:pdf`. |

**Production contract**

```text
dist/
  index.html
  public/data.js      ← window.PROFILES (fitted at site build)
  resumes/*.pdf       ← optional; retained across site-only rebuilds
  robots.txt
  sitemap.xml
```

Use `bun run build` then `bun run preview` to inspect the real site. Do not commit hand-edited files here.
