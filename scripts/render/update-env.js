#!/usr/bin/env node
import { loadEnvFile, renderFetch } from './helpers.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { file: null, service: null, allowCreate: true };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--file') opts.file = args[++i];
    else if (a === '--service') opts.service = args[++i];
    else if (a === '--no-create') opts.allowCreate = false;
  }
  if (!opts.file || !opts.service) {
    console.error('Usage: update-env --service <name> --file <envFile>');
    process.exit(1);
  }
  return opts;
}

async function getServices() {
  const data = await renderFetch('/services');
  return data.map(item => item.service || item);
}

async function getEnvVars(serviceId) {
  return renderFetch(`/services/${serviceId}/env-vars`);
}

async function createEnvVars(serviceId, pairs) {
  return renderFetch(`/services/${serviceId}/env-vars`, {
    method: 'POST',
    body: JSON.stringify({ envVars: pairs })
  });
}

async function updateEnvVar(serviceId, envVarId, value) {
  return renderFetch(`/services/${serviceId}/env-vars/${envVarId}`, {
    method: 'PATCH',
    body: JSON.stringify({ value })
  });
}

function redact(key) {
  if (/(SECRET|KEY|TOKEN|PASSWORD)/i.test(key)) return '[redacted]';
  return key;
}

async function main() {
  const opts = parseArgs();
  const vars = loadEnvFile(opts.file);
  const services = await getServices();
  const svc = services.find(s => s.name === opts.service);
  if (!svc) {
    console.error('Service not found:', opts.service);
    process.exit(1);
  }
  const existing = await getEnvVars(svc.id); // [{ id, key, value, ... }]
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
  if (toCreate.length) {
    await createEnvVars(svc.id, toCreate);
    console.log('Created:', toCreate.map(c => c.key).join(', '));
  }
  for (const item of toUpdate) {
    await updateEnvVar(svc.id, item.id, item.value);
    console.log(`Updated: ${item.key}`);
  }
  if (!toCreate.length && !toUpdate.length) {
    console.log('No changes needed.');
  }
  console.log(`Synced env vars to service ${opts.service} (${svc.id}).`);
}
main();
