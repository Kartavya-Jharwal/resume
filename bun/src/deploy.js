#!/usr/bin/env bun
/** Publish dist/ to origin gh-pages for GitHub project Pages. */

import { existsSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = resolve(ROOT, 'dist');
const BRANCH = 'gh-pages';
const REMOTE = 'origin';
const USER_SITE_MARKER = 'Kartavya-Jharwal.github.io';

const pdfMode = process.argv.includes('--pdf');

function spawn(cmd, args, options = {}) {
  const result = Bun.spawnSync([cmd, ...args], {
    cwd: options.cwd ?? ROOT,
    stdout: 'inherit',
    stderr: 'inherit'
  });
  if (result.exitCode !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${result.exitCode}`);
  }
}

function getRemoteUrl(name) {
  const result = Bun.spawnSync(['git', 'remote', 'get-url', name], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe'
  });
  if (result.exitCode !== 0) return null;
  return new TextDecoder().decode(result.stdout).trim();
}

function assertDeployTarget() {
  const originUrl = getRemoteUrl(REMOTE);
  if (!originUrl) {
    throw new Error(`git remote "${REMOTE}" is not configured; deploy only pushes to origin.`);
  }
  if (originUrl.includes(USER_SITE_MARKER)) {
    throw new Error(`refusing to deploy: "${REMOTE}" points at the user-site repo (${USER_SITE_MARKER}).`);
  }
  return originUrl;
}

function assertDistArtifact() {
  for (const relativePath of ['index.html', 'CNAME', '.nojekyll', 'public/data.js']) {
    if (!existsSync(resolve(DIST, relativePath))) {
      throw new Error(`dist/${relativePath} is missing; run bun run build first.`);
    }
  }
}

function publishToGhPages(originUrl) {
  const gitDir = resolve(DIST, '.git');
  if (existsSync(gitDir)) {
    rmSync(gitDir, { recursive: true, force: true });
  }

  spawn('git', ['init'], { cwd: DIST });
  spawn('git', ['checkout', '-B', BRANCH], { cwd: DIST });
  spawn('git', ['add', '-A'], { cwd: DIST });
  spawn('git', ['commit', '-m', 'Deploy production site'], { cwd: DIST });
  spawn('git', ['remote', 'add', 'deploy', originUrl], { cwd: DIST });
  spawn('git', ['push', '--force', 'deploy', `${BRANCH}:${BRANCH}`], { cwd: DIST });
  rmSync(gitDir, { recursive: true, force: true });
}

const originUrl = assertDeployTarget();

if (pdfMode) {
  spawn('bun', ['run', 'build:pdf', '--yes']);
  spawn('bun', ['run', 'bun/src/test.js']);
} else {
  spawn('bun', ['run', 'test']);
}

assertDistArtifact();
publishToGhPages(originUrl);

console.log(`Published dist/ to ${REMOTE} ${BRANCH} (${originUrl}).`);
