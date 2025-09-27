#!/usr/bin/env node
// Rollback helper: lists recent deploys and triggers new deploy for a selected previous commit.
import { listServices, triggerDeploy } from './api.js';
import { requireApiKey } from './helpers.js';
import { execSync } from 'child_process';
import readline from 'readline';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { service: null, list: false, deployId: null, commit: null, force: false };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--service') opts.service = args[++i];
    else if (a === '--list') opts.list = true;
  else if (a === '--deploy') opts.deployId = args[++i];
  else if (a === '--commit') opts.commit = args[++i];
  else if (a === '--force') opts.force = true;
  }
  if (!opts.service) {
    console.error('Usage: rollback --service <name> [--list] [--deploy <deployId>] [--commit <sha>] [--force]');
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
  if (opts.list) {
    console.log(`Recent deploys for ${opts.service}:`);
    deploys.forEach(d => {
      console.log(`${d.id}\t${d.status}\t${d.commit?.id || ''}\t${d.createdAt}`);
    });
  }
  if (opts.commit) {
    // Validate commit exists
    try { execSync(`git rev-parse --verify ${opts.commit}`, { stdio: 'ignore' }); }
    catch { console.error('Commit not found locally:', opts.commit); process.exit(1); }
    const short = opts.commit.slice(0, 12);
    const branch = `rollback-${short}`;
    let proceed = true;
    if (process.stdout.isTTY && !opts.force) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      proceed = await new Promise(res => rl.question(`Create and push branch ${branch} from ${opts.commit}? (y/N) `, ans => { rl.close(); res(/^y(es)?$/i.test(ans)); }));
    }
    if (!proceed) { console.log('Aborted.'); process.exit(0); }
    try {
      execSync(`git branch ${branch} ${opts.commit}`, { stdio: 'inherit' });
    } catch { /* branch may exist */ }
    execSync(`git push origin ${branch}`, { stdio: 'inherit' });
    console.log(`Pushed rollback branch ${branch}. Triggering deploy...`);
    const redeploy = await triggerDeploy(svc.id);
    console.log(`Triggered deploy id=${redeploy.id}. When stable, optionally delete branch: git push origin :${branch}`);
    return;
  }
  if (opts.deployId) {
    const target = deploys.find(d => d.id === opts.deployId);
    if (!target) { console.error('Deploy ID not found in recent list:', opts.deployId); process.exit(1); }
    const redeploy = await triggerDeploy(svc.id);
    console.log(`Triggered redeploy for service ${opts.service}. New deploy id=${redeploy.id}`);
    return;
  }
  if (!opts.list) {
    console.log('Nothing to do (use --list, --deploy, or --commit).');
  }
}
main();
