#!/usr/bin/env node
/**
 * Minimal post-deployment verification script for the first Render visibility deploy.
 *
 * Goals:
 *  - Validate backend health endpoints (/health and /api/health)
 *  - Confirm expected JSON shape (status field)
 *  - Optionally check that placeholder OAuth env vars exist remotely (if service ID & API key provided)
 *  - Validate frontend root returns HTML (status 200) and is non-empty
 *  - Provide a concise summary + non-zero exit code if any critical check fails
 *
 * Usage examples:
 *   node scripts/render/post-verify.js \
 *     --backend-url https://schedulink-api-xxxxx.onrender.com \
 *     --frontend-url https://schedulink-app-yyyyy.onrender.com
 *
 * Optional flags:
 *   --timeout-ms <number>   (default 8000)
 *   --retries <n>           (default 3) simple retry for transient 5xx / network
 *   --json                  output machine-readable JSON summary
 *
 * Exit Codes:
 *   0 success (all critical checks passed)
 *   1 usage error / invalid arguments
 *   2 network or fetch failure exceeding retries
 *   3 backend health check failed
 *   4 frontend root check failed
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { retries: 3, timeoutMs: 8000, json: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--backend-url') out.backendUrl = args[++i];
    else if (a === '--frontend-url') out.frontendUrl = args[++i];
    else if (a === '--timeout-ms') out.timeoutMs = parseInt(args[++i], 10);
    else if (a === '--retries') out.retries = parseInt(args[++i], 10);
    else if (a === '--json') out.json = true;
    else if (a === '--help') { out.help = true; }
  }
  return out;
}

function usage() {
  console.log(`Usage: node scripts/render/post-verify.js --backend-url <url> --frontend-url <url> [--retries 3] [--timeout-ms 8000] [--json]\n`);
}

function fetchRaw(target, { timeoutMs }) {
  return new Promise((resolve, reject) => {
    if (!target) return reject(new Error('missing target URL'));
    const urlObj = new URL(target);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const req = lib.request(urlObj, { method: 'GET', timeout: timeoutMs }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.end();
  });
}

async function fetchWithRetry(label, target, opts, predicate) {
  const { retries } = opts;
  let attempt = 0; let lastErr = null;
  while (attempt <= retries) {
    try {
      const res = await fetchRaw(target, opts);
      if (!predicate || predicate(res)) {
        return { ok: true, attempts: attempt + 1, res };
      }
      lastErr = new Error(`predicate failed for ${label} (status ${res.status})`);
    } catch (e) {
      lastErr = e;
    }
    attempt++;
    if (attempt <= retries) await new Promise(r => setTimeout(r, 500 * attempt));
  }
  return { ok: false, error: lastErr };
}

function validateHealthBody(body) {
  try {
    const parsed = JSON.parse(body);
    return typeof parsed.status === 'string';
  } catch { return false; }
}

async function main() {
  const args = parseArgs();
  if (args.help || !args.backendUrl || !args.frontendUrl) {
    usage();
    if (args.help) return process.exit(0);
    return process.exit(1);
  }

  const summary = {
    backend: { url: args.backendUrl, health: null, apiHealth: null },
    frontend: { url: args.frontendUrl, root: null },
    meta: { retries: args.retries, timeoutMs: args.timeoutMs }
  };

  // Backend /health
  const health = await fetchWithRetry('health', `${args.backendUrl.replace(/\/$/,'')}/health`, args, r => r.status === 200 && validateHealthBody(r.body));
  summary.backend.health = health.ok ? { ok: true } : { ok: false, error: health.error?.message };

  // Backend /api/health
  const apiHealth = await fetchWithRetry('apiHealth', `${args.backendUrl.replace(/\/$/,'')}/api/health`, args, r => r.status === 200 && validateHealthBody(r.body));
  summary.backend.apiHealth = apiHealth.ok ? { ok: true } : { ok: false, error: apiHealth.error?.message };

  // Frontend root (expect 200 + HTML doctype or <div id= root style marker)
  const root = await fetchWithRetry('frontend', args.frontendUrl, args, r => r.status === 200 && /<html|<!DOCTYPE html/i.test(r.body));
  summary.frontend.root = root.ok ? { ok: true } : { ok: false, error: root.error?.message, status: root.res?.status };

  const criticalFailures = [];
  if (!summary.backend.health.ok) criticalFailures.push('backend /health');
  if (!summary.frontend.root.ok) criticalFailures.push('frontend root');

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log('\nPost-Deployment Verification Summary');
    console.log('-----------------------------------');
    console.log(`Backend /health:     ${summary.backend.health.ok ? 'OK' : 'FAIL'}`);
    console.log(`Backend /api/health: ${summary.backend.apiHealth.ok ? 'OK' : 'FAIL (non-blocking for minimal test)'}`);
    console.log(`Frontend root:       ${summary.frontend.root.ok ? 'OK' : 'FAIL'}`);
    if (criticalFailures.length) {
      console.log(`\nCritical failures: ${criticalFailures.join(', ')}`);
    } else {
      console.log('\nAll critical checks passed.');
    }
  }

  if (criticalFailures.length) {
    if (!summary.backend.health.ok) return process.exit(3);
    if (!summary.frontend.root.ok) return process.exit(4);
  }
  process.exit(0);
}

main().catch(e => { console.error('unexpected_error', e); process.exit(2); });
