#!/usr/bin/env node
// Simple PostgreSQL connectivity test: runs SELECT NOW(); prints result.
import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW() as now');
    console.log('DB OK', res.rows[0]);
    await client.end();
  } catch (e) {
    console.error('DB ERROR', e.message);
    process.exit(2);
  }
}

main();