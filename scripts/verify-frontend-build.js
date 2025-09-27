#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const distDir = path.resolve(root, 'testapp/dist');
const shouldServe = process.env.SERVE_STATIC === 'true';

function exit(msg) {
  console.error('[verify-frontend-build] ' + msg);
  process.exit(1);
}

if (!shouldServe) {
  console.log('[verify-frontend-build] SERVE_STATIC not enabled; skipping dist verification.');
  process.exit(0);
}

if (!fs.existsSync(distDir)) {
  console.log('[verify-frontend-build] dist directory missing; running frontend build...');
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('npm', ['--prefix', 'testapp', 'run', 'build'], { stdio: 'inherit' });
  if (r.status !== 0) exit('Frontend build failed.');
}

// Basic sanity check: index.html present
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  exit('index.html not found in dist after build.');
}
console.log('[verify-frontend-build] Frontend build verified.');
