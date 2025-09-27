#!/usr/bin/env node
// Verifies required production security flags.
// Usage: node scripts/verify-prod-flags.js
// Fails (exit 1) if any required flag missing or incorrect.

const REQUIRED = {
  ENFORCE_HTTPS: 'true',
  CSP_STRICT: 'true',
  PRINT_SECRET_FINGERPRINTS: 'false',
  HSTS_ENABLED: 'true',
  CSRF_PROTECTION_ENABLED: 'true',
  SECURITY_HEADERS_ENABLED: 'true'
};

function main() {
  const failures = [];
  for (const [k, expected] of Object.entries(REQUIRED)) {
    const actual = process.env[k];
    if (actual !== expected) failures.push(`${k} expected=${expected} actual=${actual === undefined ? '(missing)' : actual}`);
  }
  if (failures.length) {
    console.error('Production security flag validation FAILED:');
    failures.forEach(f => console.error('  -', f));
    process.exit(1);
  }
  console.log('All required production flags are correctly set.');
}

main();
