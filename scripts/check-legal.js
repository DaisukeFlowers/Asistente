#!/usr/bin/env node
/**
 * Fails the build if legal drafts still contain placeholder markers.
 * Execution: part of prebuild step (package.json prebuild script).
 * Allows override via ALLOW_LEGAL_PLACEHOLDERS=true (for staging).
 */
import fs from 'fs';
import path from 'path';

const allow = process.env.ALLOW_LEGAL_PLACEHOLDERS === 'true';
const root = path.resolve(process.cwd(), '..');
const pagesDir = path.join(root, 'testapp', 'src', 'pages');
const targets = ['PrivacyPolicy.jsx', 'TermsOfService.jsx'];
const markers = [
  'BORRADOR', 'DRAFT', 'TODO)', 'TODO ', 'placeholder', 'Pendiente', 'Pending'
];

let failed = false;
const details = [];
for (const file of targets) {
  const fp = path.join(pagesDir, file);
  if (!fs.existsSync(fp)) continue;
  const content = fs.readFileSync(fp, 'utf8');
  for (const m of markers) {
    if (content.includes(m)) {
      failed = true;
      details.push(`${file}: found marker "${m}"`);
    }
  }
}

if (failed && !allow) {
  console.error('\nLegal placeholder enforcement failed. Remove draft markers before production build.');
  details.forEach(d => console.error(' - ' + d));
  console.error('\nSet ALLOW_LEGAL_PLACEHOLDERS=true to bypass for staging only.');
  process.exit(1);
} else if (failed) {
  console.warn('Legal placeholders present but allowed by ALLOW_LEGAL_PLACEHOLDERS flag.');
} else {
  console.log('Legal pages contain no placeholder markers.');
}
