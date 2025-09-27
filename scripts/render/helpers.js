// Shared helper utilities for Render CLI automation.
import fs from 'fs';

export function requireApiKey() {
  const key = process.env.RENDER_API_KEY || process.env.RENDER_TOKEN;
  if (!key) {
    console.error('Missing RENDER_API_KEY environment variable.');
    process.exit(1);
  }
  return key;
}

export async function renderFetch(path, options = {}) {
  const base = 'https://api.render.com/v1';
  const apiKey = requireApiKey();
  const res = await fetch(base + path, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`Render API ${res.status} ${res.statusText} -> ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function loadEnvFile(path) {
  const content = fs.readFileSync(path, 'utf8');
  const vars = {};
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) vars[key] = value;
  });
  return vars;
}
