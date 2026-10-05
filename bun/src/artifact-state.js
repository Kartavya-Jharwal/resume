/** Tie retained download bytes to the exact fitted profile and renderer. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './typesetting.js';

const manifestPath = resolve(ROOT, 'dist/resumes/manifest.json');
const digest = value => createHash('sha256').update(value).digest('hex');

export function profileFingerprint(profile) {
  const { pdfAvailable, ...content } = profile;
  return digest(JSON.stringify(content));
}

export function rendererFingerprint(engine) {
  const files = ['config/typesetting.json', 'bun/src/typesetting.js', 'bun/src/font-metrics.js',
    'assets/fonts/newsreader-variable-roman.ttf', 'assets/fonts/newsreader-variable-italic.ttf'];
  files.push(...(engine === 'weasyprint'
    ? [
      'assets/css/composition.css',
      'bun/src/composition.js',
      'bun/src/composition-render.js',
      'bun/src/header-stack.js',
      'bun/src/emit-pdf.py',
      'bun/src/emit-docx.py',
      'bun/src/docx-fonts.py'
    ]
    : ['assets/css/style.css', 'assets/js/app.js']));
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update(readFileSync(resolve(ROOT, file)));
  return hash.digest('hex');
}

export function loadArtifactManifest() {
  return existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
}

export function recordPdf(profile, engine, manifest = loadArtifactManifest()) {
  const path = resolve(ROOT, 'dist/resumes', profile.pdfFilename);
  manifest[profile.id] = {
    filename: profile.pdfFilename, engine,
    profile: profileFingerprint(profile), renderer: rendererFingerprint(engine),
    sha256: digest(readFileSync(path))
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function pdfIsCurrent(profile, manifest, renderers = {}) {
  const entry = manifest[profile.id];
  const path = resolve(ROOT, 'dist/resumes', profile.pdfFilename || '');
  if (!entry || !profile.pdfFilename || !existsSync(path)) return false;
  if (!['chromium', 'weasyprint'].includes(entry.engine)) return false;
  renderers[entry.engine] ||= rendererFingerprint(entry.engine);
  return entry.filename === profile.pdfFilename && entry.profile === profileFingerprint(profile)
    && entry.renderer === renderers[entry.engine] && entry.sha256 === digest(readFileSync(path));
}
