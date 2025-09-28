#!/usr/bin/env node
import { createService } from './api.js';

async function main() {
  // Minimal service create payload matching render.yaml (excluding secrets)
  const payload = {
    service: {
      name: 'schedulink-api',
      type: 'web_service',
      plan: 'starter',
      region: 'oregon',
      autoDeploy: true,
      repo: 'https://github.com/DaisukeFlowers/Asistente',
      branch: 'main',
      rootDir: '.',
      ownerId: 'tea-d3bvcsripnbc7388o33g',
      environmentId: 'evm-d3c03immcj7s73d5sorg',
      serviceDetails: {
        env: 'node',
        buildCommand: 'npm ci && npm run build',
        startCommand: 'npm run start',
        healthCheckPath: '/health'
      },
      envVars: [
        { key: 'ENFORCE_HTTPS', value: 'true' },
        { key: 'CSP_STRICT', value: 'true' },
        { key: 'PRINT_SECRET_FINGERPRINTS', value: 'false' }
      ]
    }
  };
  const created = await createService(payload);
  console.log('Created service schedulink-api:', created.service?.id || created.id);
}
main().catch(e => { console.error(e); process.exit(1); });
