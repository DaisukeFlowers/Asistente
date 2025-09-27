#!/usr/bin/env node
import fs from 'fs';
import { listServices, getEnvVars, patchEnvVar, createEnvVars } from './api.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { file: null, service: null, allowCreate: true, dryRun: false };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--file') opts.file = args[++i];
    else if (a === '--service') opts.service = args[++i];
  else if (a === '--no-create') opts.allowCreate = false;
  else if (a === '--dry-run') opts.dryRun = true;
  }
  if (!opts.file || !opts.service) {
    console.error('Usage: set-env-from-file --service <name> --file <envFile>');
    process.exit(1);
  }
  return opts;
}

function loadEnv(path) {
  const content = fs.readFileSync(path, 'utf8');
  const vars = {};
  content.split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const idx = t.indexOf('=');
    if (idx === -1) return;
    const key = t.slice(0, idx).trim();
    const value = t.slice(idx+1).trim();
    if (key) vars[key] = value;
  });
  return vars;
}

function shouldRedact(key) { return /(SECRET|TOKEN|KEY|PASSWORD)/i.test(key); }

async function main() {
  const opts = parseArgs();
  const vars = loadEnv(opts.file);
  const services = await listServices();
  const svc = services.find(s => s.name === opts.service);
  if (!svc) {
    console.error('Service not found:', opts.service);
    process.exit(1);
  }
  const existing = await getEnvVars(svc.id);
  const existingMap = new Map(existing.map(e => [e.key, e]));
  const toCreate = [];
  const toUpdate = [];
  for (const [k,v] of Object.entries(vars)) {
    if (existingMap.has(k)) {
      if (existingMap.get(k).value !== v) toUpdate.push({ id: existingMap.get(k).id, key: k, value: v });
    } else if (opts.allowCreate) {
      toCreate.push({ key: k, value: v });
    }
  }
  if (opts.dryRun) {
    const unchanged = [];
    for (const [k,v] of Object.entries(vars)) {
      if (existingMap.has(k) && existingMap.get(k).value === v) unchanged.push(k);
    }
    console.log(`DRY RUN for ${opts.service}`);
    console.log('Would create:', toCreate.map(v => v.key).length ? toCreate.map(v => v.key).join(', ') : '(none)');
    console.log('Would update:', toUpdate.length ? toUpdate.map(v => v.key).join(', ') : '(none)');
    console.log('Unchanged:', unchanged.length ? unchanged.join(', ') : '(none)');
    // Provide masked diff details for updates
    toUpdate.forEach(item => {
      const oldVal = existingMap.get(item.key).value;
      const newVal = item.value;
      const redactedOld = shouldRedact(item.key) ? '[redacted]' : oldVal;
      const redactedNew = shouldRedact(item.key) ? '[redacted]' : newVal;
      console.log(`  UPDATE ${item.key}: ${redactedOld} -> ${redactedNew}`);
    });
    process.exit(0);
  } else {
    if (toCreate.length) {
      await createEnvVars(svc.id, toCreate);
      console.log('Created:', toCreate.map(v => v.key).join(', '));
    }
    for (const item of toUpdate) {
      await patchEnvVar(svc.id, item.id, item.value);
      console.log(`Updated: ${item.key}`);
    }
    console.log(`Synced ${opts.service}. Summary:`);
    console.log('  Created:', toCreate.length);
    console.log('  Updated:', toUpdate.length);
    console.log('  Skipped:', Object.keys(vars).length - toCreate.length - toUpdate.length);
    Object.keys(vars).forEach(k => {
      console.log(`  ${k}=${shouldRedact(k) ? '[redacted]' : vars[k]}`);
    });
  }
}
main();
