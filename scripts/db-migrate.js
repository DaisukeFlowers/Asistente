#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { pool } from '../backend/config/db.js';

async function main() {
  if (!pool) { console.error('DB not configured'); process.exit(1); }
  const dir = path.resolve('backend/migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  await pool.query('CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, filename TEXT UNIQUE NOT NULL, applied_at TIMESTAMPTZ DEFAULT now())');
  const appliedRes = await pool.query('SELECT filename FROM migrations');
  const applied = new Set(appliedRes.rows.map(r => r.filename));
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(dir, file), 'utf8');
    console.log('[migrate] applying', file);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO migrations(filename) VALUES($1)', [file]);
      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('[migrate] failed', file, e.message);
      process.exit(2);
    }
  }
  console.log('[migrate] complete');
  process.exit(0);
}
main();
