#!/usr/bin/env node
import { listServices, triggerDeploy } from './api.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { names: [], all: false };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--all') opts.all = true;
    else if (a === '--name') { opts.names.push(args[++i]); }
  }
  return opts;
}

async function resolveServiceMap() { return listServices(); }

async function main() {
  const opts = parseArgs();
  try {
    const services = await resolveServiceMap();
    let targets = [];
    if (opts.all) {
      targets = services;
    } else if (opts.names.length) {
      targets = services.filter(s => opts.names.includes(s.name));
    } else {
      console.error('Specify --all or --name <serviceName>');
      process.exit(1);
    }
    if (!targets.length) {
      console.error('No matching services found.');
      process.exit(1);
    }
    for (const svc of targets) {
  const res = await triggerDeploy(svc.id);
      console.log(`Triggered deploy: ${svc.name} -> deployId=${res.id}`);
    }
  } catch (e) {
    console.error('Deployment trigger failed:', e.message);
    process.exit(1);
  }
}
main();
