#!/usr/bin/env node
import { listServices, deleteService } from './api.js';

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('Usage: delete-service <service-name>');
    process.exit(1);
  }
  const services = await listServices();
  const svc = services.find(s => s.name === name);
  if (!svc) {
    console.error('Service not found:', name);
    process.exit(1);
  }
  await deleteService(svc.id);
  console.log('Deleted service', name, '(', svc.id, ')');
}
main();
