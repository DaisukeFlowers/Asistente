#!/usr/bin/env node
import { listServices } from './api.js';

async function main() {
  try {
    const services = await listServices();
    services.forEach(s => {
      console.log(`${s.id}\t${s.name}\t${s.type}`);
    });
  } catch (e) {
    console.error('Failed to list services:', e.message);
    process.exit(1);
  }
}
main();
