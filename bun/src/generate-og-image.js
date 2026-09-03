import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export async function generateOgImage(distDir, profile = {}) {
  const name = profile.name || 'Kartavya Jharwal';
  const role = profile.role || 'Startup Operations Manager';
  const industry = profile.industry || 'Early-Stage Technology Startups';
  const logoPath = resolve(ROOT, 'assets/img/logo/logo_kj_dark_256.png').replace(/\\/g, '/');
  const template = readFileSync(resolve(ROOT, 'assets/og-card.html'), 'utf8')
    .replaceAll('{{NAME}}', name)
    .replaceAll('{{ROLE}}', role)
    .replaceAll('{{INDUSTRY}}', industry)
    .replaceAll('{{TAGLINE}}', 'One man, many hats.')
    .replaceAll('{{LOGO}}', `file:///${logoPath}`);

  mkdirSync(resolve(distDir, 'assets/img'), { recursive: true });
  const output = resolve(distDir, 'assets/img/og-default.png');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(template, { waitUntil: 'load' });
    await page.screenshot({ path: output, type: 'png' });
  } finally {
    await browser.close();
  }
  return output;
}
