#!/usr/bin/env node
import { renderFetch } from './helpers.js';

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

async function resolveServiceMap() {
  const data = await renderFetch('/services');
  // API returns array of objects with shape { service: {...} } for blueprints.
  return data.map(item => item.service || item);
}

async function trigger(serviceId) {
  const resp = await renderFetch(`/services/${serviceId}/deploys`, {
    method: 'POST',
    body: JSON.stringify({ clearCache: false })
  });
  return resp;
}

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
      const res = await trigger(svc.id);
      console.log(`Triggered deploy: ${svc.name} -> deployId=${res.id}`);
    }
  } catch (e) {
    console.error('Deployment trigger failed:', e.message);
    process.exit(1);
  }
}
main();
