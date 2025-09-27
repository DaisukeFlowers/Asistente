import pkg from 'pg';

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

// Fail fast (only in production) if DATABASE_URL is missing; in dev it's optional
if (process.env.NODE_ENV === 'production' && !connectionString) {
  throw new Error('DATABASE_URL is required in production');
}

export const pool = connectionString ? new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}) : null;

export async function testDbConnection() {
  if (!pool) return { ok: false, error: 'no_pool' };
  try {
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default pool;