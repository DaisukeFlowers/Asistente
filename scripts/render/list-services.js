#!/usr/bin/env node
import { renderFetch } from './helpers.js';

async function main() {
  try {
    const services = await renderFetch('/services');
    services.forEach(s => {
      console.log(`${s.id}\t${s.service.name || s.name}\t${s.service.type || s.type}\t${s.service.slug || ''}`);
    });
  } catch (e) {
    console.error('Failed to list services:', e.message);
    process.exit(1);
  }
}
main();
