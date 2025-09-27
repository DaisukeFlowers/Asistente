#!/usr/bin/env node
// Rollback helper: lists recent deploys and triggers new deploy for a selected previous commit.
import { listServices, triggerDeploy } from './api.js';
import { requireApiKey } from './helpers.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { service: null, list: false, deployId: null };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--service') opts.service = args[++i];
    else if (a === '--list') opts.list = true;
    else if (a === '--deploy') opts.deployId = args[++i];
  }
  if (!opts.service) {
    console.error('Usage: rollback --service <name> [--list] [--deploy <deployId>]');
    process.exit(1);
  }
  return opts;
}

async function fetchDeploys(serviceId) {
  const key = requireApiKey();
  const res = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=20`, {
    headers: { 'Authorization': `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`Failed to list deploys: ${res.status}`);
  return res.json();
}

async function main() {
  const opts = parseArgs();
  const services = await listServices();
  const svc = services.find(s => s.name === opts.service);
  if (!svc) {
    console.error('Service not found:', opts.service);
    process.exit(1);
  }
  const deploys = await fetchDeploys(svc.id);
  if (opts.list || !opts.deployId) {
    console.log(`Recent deploys for ${opts.service}:`);
    deploys.forEach(d => {
      console.log(`${d.id}\t${d.status}\t${d.commit?.id || ''}\t${d.createdAt}`);
    });
    if (!opts.deployId) return; // listing only
  }
  const target = deploys.find(d => d.id === opts.deployId);
  if (!target) {
    console.error('Deploy ID not found in recent list:', opts.deployId);
    process.exit(1);
  }
  // Render does not provide a direct rollback endpoint; trigger a new deploy (if commit is still HEAD or rely on redeploy).
  // If the commit differs from current HEAD, you must push that commit or use Render dashboard's rollback UI.
  const redeploy = await triggerDeploy(svc.id);
  console.log(`Triggered redeploy for service ${opts.service}. New deploy id=${redeploy.id}`);
  console.log('NOTE: To truly rollback to a previous commit, re-push or cherry-pick that commit so it becomes the new HEAD.');
}
main();
