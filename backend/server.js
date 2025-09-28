import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { execSync } from 'child_process';
import crypto from 'crypto';
import axios from 'axios';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import https from 'https';
import Redis from 'ioredis';
import pool, { testDbConnection } from './config/db.js';
import CONFIG from './config/env.js';

// Session cookie constant
CONFIG.SESSION_COOKIE_NAME = 'calassist_sid';

// -----------------------------------------------------------------------------
// Production guard: require Redis for session & rate limit persistence
// Unless explicitly bypassed with ALLOW_INMEMORY_SESSION_IN_PROD=true (emergency only)
// -----------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production' && !CONFIG.REDIS_URL && process.env.ALLOW_INMEMORY_SESSION_IN_PROD !== 'true') {
  throw new Error('REDIS_URL is required in production for persistent sessions & distributed rate limiting. Set ALLOW_INMEMORY_SESSION_IN_PROD=true only as a temporary emergency override.');
}
// Production guard: require DATABASE_URL (handled earlier in db.js but double-check here for clarity)
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production for persistence (user config, legal acceptance, etc).');
}

// Secret validation & fingerprinting centralized in config/env.js now.

// Session policy (idle & absolute timeouts + rotation). Overridable via env if needed.
const SESSION_IDLE_MAX_MS = CONFIG.SESSION_IDLE_MAX_MINUTES * 60 * 1000;
const SESSION_ABSOLUTE_MAX_MS = CONFIG.SESSION_ABSOLUTE_MAX_HOURS * 60 * 60 * 1000;
const SESSION_ROTATE_INTERVAL_MS = CONFIG.SESSION_ROTATE_MINUTES * 60 * 1000;

// -----------------------------------------------------------------------------
// Session & rate limit storage abstraction: in-memory fallback, Redis if configured
// -----------------------------------------------------------------------------
let redis = null;
let redisStatus = { connected: false, lastError: null };
if (CONFIG.REDIS_URL) {
  redis = new Redis(CONFIG.REDIS_URL, { lazyConnect: true });
  redis.on('error', e => { redisStatus.connected = false; redisStatus.lastError = e.message; console.error('redis_error', e.message); });
  redis.on('ready', () => { redisStatus.connected = true; redisStatus.lastError = null; console.log('Redis connected'); });
  redis.connect().catch(e=> console.error('Redis connect failed', e.message));
}

const memorySessions = new Map();

async function sessionGet(sid) {
  if (redis) {
    const raw = await redis.get(`${CONFIG.REDIS_NAMESPACE}:sess:${sid}`);
    return raw ? JSON.parse(raw) : null;
  }
  return memorySessions.get(sid) || null;
}
async function sessionSet(sid, value, ttlSeconds = 60*60*24*7) { // 7 days default
  if (redis) {
    await redis.set(`${CONFIG.REDIS_NAMESPACE}:sess:${sid}`, JSON.stringify(value), 'EX', ttlSeconds);
  } else {
    memorySessions.set(sid, value);
  }
}
async function sessionDel(sid) {
  if (redis) {
    await redis.del(`${CONFIG.REDIS_NAMESPACE}:sess:${sid}`);
  } else {
    memorySessions.delete(sid);
  }
}

// Rate limit bucket helpers
const rlBuckets = new Map();
async function rlGet(key) {
  if (redis) {
    const raw = await redis.get(`${CONFIG.REDIS_NAMESPACE}:rl:${key}`);
    return raw ? JSON.parse(raw) : null;
  }
  return rlBuckets.get(key) || null;
}
async function rlSet(key, val, ttlSeconds = 60) {
  if (redis) {
    await redis.set(`${CONFIG.REDIS_NAMESPACE}:rl:${key}`, JSON.stringify(val), 'EX', ttlSeconds);
  } else {
    rlBuckets.set(key, val);
  }
}

// PKCE helpers
function generatePkcePair() {
  // 43-128 char verifier recommended; 32 random bytes base64url gives ~43 chars
  const raw = crypto.randomBytes(32);
  const verifier = raw.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return { verifier, challenge };
}

// Encryption helpers with key versioning: output format v1:<fingerprint>:<base64payload>
function deriveKeyMaterial(secret) {
  const full = crypto.createHash('sha256').update(secret).digest();
  const fingerprint = full.toString('hex').slice(0,8); // first 4 bytes hex for short id
  return { key: full, fingerprint };
}
const primaryKey = deriveKeyMaterial(CONFIG.REFRESHTOKENENCRYPTIONKEY);
const previousKey = CONFIG.REFRESHTOKENENCRYPTIONKEY_PREVIOUS ? deriveKeyMaterial(CONFIG.REFRESHTOKENENCRYPTIONKEY_PREVIOUS) : null;

// -----------------------------------------------------------------------------
// Audit logging
// -----------------------------------------------------------------------------
function hashSid(sid) {
  return crypto.createHash('sha256').update(sid).digest('hex').slice(0,16); // short hash to avoid leaking raw session id
}
function audit(event, fields = {}) {
  if (!CONFIG.AUDIT_LOG_ENABLED) return;
  try {
    const record = {
      ts: new Date().toISOString(),
      event,
      ...fields
    };
    // Avoid accidental secrets leakage: scrub potential token fields explicitly
    if (record.access_token) record.access_token = '[REDACTED]';
    if (record.refresh_token) record.refresh_token = '[REDACTED]';
    // PII minimization: remove raw emails unless explicitly permitted
    if (!CONFIG.ALLOW_PII_LOGGING && record.email) record.email = '[REDACTED_EMAIL]';
    // Forward log optionally
    if (CONFIG.LOG_FORWARD_WEBHOOK) {
      axios.post(CONFIG.LOG_FORWARD_WEBHOOK, record).catch(()=>{});
    }
    console.log(JSON.stringify(record));
  } catch (e) {
    console.error('audit_log_failure', e.message);
  }
}

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', primaryKey.key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, enc]).toString('base64');
  return `v1:${primaryKey.fingerprint}:${payload}`;
}
function tryDecryptWith(material, rawBuf) {
  const iv = rawBuf.subarray(0,12);
  const tag = rawBuf.subarray(12,28);
  const data = rawBuf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', material.key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
function decrypt(payload) {
  // Backward compatibility: if legacy (no prefix) treat as old single-key encoding
  if (!payload.startsWith('v1:')) {
    try {
      const raw = Buffer.from(payload, 'base64');
      return tryDecryptWith(primaryKey, raw);
    } catch (e) {
      if (previousKey) {
        try { return tryDecryptWith(previousKey, Buffer.from(payload, 'base64')); } catch {/* ignore */}
      }
      throw new Error('Unable to decrypt legacy refresh token');
    }
  }
  const parts = payload.split(':');
  if (parts.length !== 3) throw new Error('Malformed encrypted token');
  const [, fp, b64] = parts;
  const raw = Buffer.from(b64, 'base64');
  if (fp === primaryKey.fingerprint) return tryDecryptWith(primaryKey, raw);
  if (previousKey && fp === previousKey.fingerprint) return tryDecryptWith(previousKey, raw);
  throw new Error('Unknown key fingerprint for refresh token');
}

// -----------------------------------------------------------------------------
// Express setup
// -----------------------------------------------------------------------------
const app = express();
// Trust first proxy when deployed behind load balancer / ingress (required for x-forwarded-proto detection)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// -----------------------------------------------------------------------------
// Optional unified deployment: serve pre-built frontend assets when SERVE_STATIC=true
// This allows choosing between (A) separate static site on Render (recommended for CDN)
// and (B) single web service serving both API + static.
// Dist directory defaults to ../testapp/dist relative to backend.
// -----------------------------------------------------------------------------
if (process.env.SERVE_STATIC === 'true') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distDir = process.env.STATIC_ROOT || path.resolve(__dirname, '../testapp/dist');
  console.log('[static] Serving static assets from', distDir);
  app.use(express.static(distDir, { index: false, maxAge: '1h', setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }}));
  // SPA fallback (exclude /api/* routes)
  app.get('*', (req,res,next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

// -----------------------------------------------------------------------------
// CORS allow-list (item 1.13). Applies before rate limiting & routes.
// -----------------------------------------------------------------------------
if (CONFIG.CORS_ENABLED) {
  // Build allowed origins list
  const originList = new Set(
    CONFIG.CORS_ALLOWED_ORIGINS
      ? CONFIG.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
      : []
  );
  // Add FRONTEND_BASE_URL if it's an absolute URL
  if (/^https?:\/\//.test(CONFIG.FRONTEND_BASE_URL)) {
    originList.add(CONFIG.FRONTEND_BASE_URL.replace(/\/$/, ''));
  } else {
    // Fallback dev default
    originList.add('http://localhost:5173');
  }
  function isAllowed(origin) { return originList.has(origin.replace(/\/$/, '')); }
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) return next(); // same-site or non CORS
    if (!isAllowed(origin)) {
      audit('cors_reject', { rid: req.rid, origin, path: req.path });
      return res.status(403).json({ error: 'cors_denied' });
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    if (CONFIG.CORS_ALLOW_CREDENTIALS) res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });
}

// Request correlation / basic HTTP audit
app.use((req, res, next) => {
  const rid = crypto.randomBytes(8).toString('hex');
  req.rid = rid;
  res.setHeader('X-Request-Id', rid);
  req.requestIp = req.ip;
  const start = Date.now();
  res.on('finish', () => {
    audit('http_request', {
      rid,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      dur_ms: Date.now() - start,
      ip: req.requestIp,
      ua: req.headers['user-agent']
    });
  });
  next();
});

// -----------------------------------------------------------------------------
// Rate limiting (simple in-memory token bucket). Replace with Redis for multi-instance.
// -----------------------------------------------------------------------------
if (CONFIG.RATELIMIT_ENABLED) {
  function classify(req) {
    if (req.path === '/api/health') return null; // skip health
    if (req.path.startsWith('/api/auth/google')) return 'auth';
    return 'api';
  }
  async function take(key, capacity, refillPerSec) {
    const now = Date.now();
    let b = await rlGet(key);
    if (!b) { b = { tokens: capacity, last: now }; }
    const delta = (now - b.last) / 1000;
    if (delta > 0) {
      b.tokens = Math.min(capacity, b.tokens + delta * refillPerSec);
      b.last = now;
    }
    let allowed = false;
    if (b.tokens >= 1) { b.tokens -= 1; allowed = true; }
    const ttl = 120; // seconds to retain bucket state
    await rlSet(key, b, ttl);
    return allowed;
  }
  app.use(async (req,res,next) => {
    const bucket = classify(req);
    if (!bucket) return next();
    const ip = req.ip;
    // Use user-based key if session cookie present (defer lookup cost by raw cookie id)
    const rawSid = req.cookies?.[CONFIG.SESSION_COOKIE_NAME];
    let capacity, refillPerSec;
    if (bucket === 'auth') {
      capacity = CONFIG.RATE_LIMIT_AUTH_BURST;
      refillPerSec = CONFIG.RATE_LIMIT_AUTH_REFILL_PER_MINUTE / 60;
    } else {
      capacity = CONFIG.RATE_LIMIT_API_BURST;
      refillPerSec = CONFIG.RATE_LIMIT_API_REFILL_PER_MINUTE / 60;
    }
    let key = `${bucket}:ip:${ip}`;
    if (rawSid) {
      // Associate session->user sub if existing in cache quickly
      const cached = await sessionGet(rawSid);
      if (cached?.user?.sub) key = `${bucket}:user:${cached.user.sub}`;
    }
    let allowed = true;
    try {
      allowed = await take(key, capacity, refillPerSec);
    } catch (e) {
      console.error('rate_limit_storage_error', e.message);
    }
    if (!allowed) {
      res.setHeader('Retry-After', '10'); // coarse hint
      audit('rate_limit_exceeded', { rid: req.rid, bucket, key, path: req.path });
      return res.status(429).json({ error: 'rate_limited', retry_after: 10 });
    }
    next();
  });
}

// Optional HTTPS enforcement (enabled when ENFORCEHTTPS=true). Excludes /api/health for uptime checks.
if (CONFIG.ENFORCEHTTPS) {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    if (proto !== 'https' && req.method === 'GET' && req.path !== '/api/health') {
      const host = req.headers.host;
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    next();
  });
}

// Security headers (basic)
if (CONFIG.SECURITYHEADERSENABLED) {
  app.use((req,res,next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'interest-cohort=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    // Content Security Policy
  if (CONFIG.CSPSTRICT) {
      const csp = [
        "default-src 'self'",
        "img-src 'self' https://*.googleusercontent.com data:",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'", // allow inline styles for Tailwind injected utilities; can tighten with nonce later
        "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'"
      ].join('; ');
      res.setHeader('Content-Security-Policy', csp);
    } else {
      // Relaxed CSP for local dev with Vite HMR (allows ws and inline scripts if needed)
      const csp = [
        "default-src 'self'",
        "img-src 'self' data: https://*.googleusercontent.com",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        `connect-src 'self' ws://localhost:5173 https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com`,
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'"
      ].join('; ');
      res.setHeader('Content-Security-Policy', csp);
    }
    // HSTS only when HTTPS enforced or production & enabled
  if (CONFIG.HSTSENABLED && (CONFIG.ENFORCEHTTPS || isProd)) {
      // preload token optional after domain qualifies; includeSubDomains if you plan to enforce on all subdomains
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains'); // 180 days
    }
    next();
  });
}

// Cookie options (secure only in production to allow local http:// testing)
const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
};

// -----------------------------------------------------------------------------
// OAuth Flow (Authorization Code)
// -----------------------------------------------------------------------------
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

// In-memory JWKS cache { keysByKid: Map, fetchedAt }
let jwksCache = { keys: new Map(), fetchedAt: 0 };
const JWKS_TTL_MS = parseInt(process.env.GOOGLE_JWKS_TTL_MS || '3600000', 10); // 1 hour default

async function fetchGoogleJWKS() {
  const now = Date.now();
  if (jwksCache.keys.size > 0 && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  return new Promise((resolve, reject) => {
    https.get(GOOGLE_JWKS_URI, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const map = new Map();
            (json.keys || []).forEach(k => map.set(k.kid, k));
          jwksCache = { keys: map, fetchedAt: Date.now() };
          resolve(map);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function pemFromJwk(jwk) {
  // Minimal conversion for RSA public key (n,e) to PEM
  const { n, e } = jwk;
  if (!n || !e) throw new Error('Invalid JWK');
  const der = rsaPublicKeyDer(n, e);
  const b64 = der.toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN RSA PUBLIC KEY-----\n${b64}\n-----END RSA PUBLIC KEY-----\n`;
}

function rsaPublicKeyDer(modulusB64Url, exponentB64Url) {
  const modulus = Buffer.from(modulusB64Url.replace(/-/g,'+').replace(/_/g,'/'), 'base64');
  const exponent = Buffer.from(exponentB64Url.replace(/-/g,'+').replace(/_/g,'/'), 'base64');
  // ASN.1 DER encoding for RSAPublicKey (sequence of modulus INTEGER, exponent INTEGER)
  function encodeInteger(buf) {
    // Ensure positive integer (prepend 0x00 if high bit set)
    if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0x00]), buf]);
    return Buffer.concat([Buffer.from([0x02, buf.length]), buf]);
  }
  function encodeLength(len) {
    if (len < 128) return Buffer.from([len]);
    const hex = len.toString(16);
    const bytes = hex.length % 2 === 0 ? hex : '0' + hex;
    const lenBytes = Buffer.from(bytes, 'hex');
    return Buffer.concat([Buffer.from([0x80 | lenBytes.length]), lenBytes]);
  }
  const modInt = encodeInteger(modulus);
  const expInt = encodeInteger(exponent);
  const seqLen = modInt.length + expInt.length;
  const full = Buffer.concat([Buffer.from([0x30]), encodeLength(seqLen), modInt, expInt]);
  return full;
}

// -----------------------------------------------------------------------------
// Health endpoint: liveness + basic readiness (Redis if required)
// Returns 503 when Redis is configured but not connected (unless override set)
// -----------------------------------------------------------------------------
// Provide /health alias for platform health checks (maps to /api/health logic)
app.get(['/api/health', '/health'], async (req,res) => {
  const requireRedis = !!CONFIG.REDIS_URL && process.env.ALLOW_HEALTH_PASS_WITHOUT_REDIS !== 'true';
  const redisOk = !requireRedis || redisStatus.connected;
  let db = { configured: !!process.env.DATABASE_URL, status: null, error: null };
  if (process.env.DATABASE_URL) {
    const r = await testDbConnection();
    db.status = r.ok ? 'ok' : 'error';
    if (!r.ok) db.error = r.error;
  }
  const overallOk = redisOk && (db.status !== 'error');
  const body = {
    ok: overallOk,
    uptime_s: Math.round(process.uptime()),
    ts: new Date().toISOString(),
    redis: CONFIG.REDIS_URL ? { required: requireRedis, connected: redisStatus.connected, lastError: redisStatus.lastError } : { required: false, connected: null },
    db
  };
  if (!overallOk) return res.status(503).json(body);
  res.json(body);
});

// ---------------------------------------------------------------------------
// Version / build metadata endpoint (/api/version)
// Exposes non-sensitive build info for diagnostics & cache busting.
// commit_sha attempts to read from env COMMIT_SHA else git, populated at runtime.
// ---------------------------------------------------------------------------
let buildInfoCache = null;
function loadBuildInfo() {
  if (buildInfoCache) return buildInfoCache;
  let commit = process.env.COMMIT_SHA || null;
  try {
    if (!commit) {
      commit = execSync('git rev-parse --short HEAD').toString().trim();
    }
  } catch { /* ignore */ }
  buildInfoCache = {
    name: 'diyartec-api',
    version: '1.0.0-diyartec',
    commit_sha: commit,
    build_time: new Date().toISOString(),
    node: process.version,
    security: {
      enforce_https: CONFIG.ENFORCEHTTPS,
      csp_strict: CONFIG.CSPSTRICT,
      hsts_enabled: CONFIG.HSTSENABLED,
      security_headers: CONFIG.SECURITYHEADERSENABLED,
      rate_limit: CONFIG.RATELIMIT_ENABLED
    }
  };
  return buildInfoCache;
}
app.get('/api/version', (_req,res) => {
  res.json(loadBuildInfo());
});

// Step 1: Redirect user to Google auth consent
// Initiates Google OAuth Authorization Code flow with PKCE and state for CSRF protection.
// The 'state' value is stored in a short‑lived httpOnly cookie (5 min) and must match on callback.
// PKCE verifier persisted in a transient cookie; both cleared after callback to reduce exposure.
app.get('/api/auth/google', (req, res) => {
  const state = nanoid(24);
  const { verifier, challenge } = generatePkcePair();
  const params = new URLSearchParams({
    client_id: CONFIG.CLIENT_ID,
    redirect_uri: CONFIG.REDIRECT_URI,
    response_type: 'code',
    scope: CONFIG.GOOGLE_SCOPE,
    access_type: 'offline', // request refresh token
    include_granted_scopes: 'true',
    prompt: 'consent', // ensure refresh token on repeated logins (within reason)
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });
  // Save CSRF state in temp cookie (alternatively server memory)
  res.cookie('oauth_state', state, { ...cookieOpts, maxAge: 300000 });
  res.cookie('pkce_verifier', verifier, { ...cookieOpts, maxAge: 300000 });
  res.redirect(`${AUTH_ENDPOINT}?${params.toString()}`);
});

// Step 2: Callback to exchange code
// OAuth callback: validates state (CSRF), optionally includes PKCE verifier, exchanges code for tokens.
// NOTE: In production, add explicit timeout validation beyond cookie maxAge if using a persistent store.
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies['oauth_state'];
  const pkceVerifier = req.cookies['pkce_verifier'];
  if (!code || !state || state !== storedState) {
    audit('auth_login_failed', { rid: req.rid, reason: 'state_mismatch_or_missing_code', state, storedState });
    return res.status(400).send('Invalid state or missing code');
  }
  res.clearCookie('oauth_state');
  if (pkceVerifier) res.clearCookie('pkce_verifier');
  try {
    const body = new URLSearchParams({
      code,
      client_id: CONFIG.CLIENT_ID,
      client_secret: CONFIG.CLIENT_SECRET,
      redirect_uri: CONFIG.REDIRECT_URI,
      grant_type: 'authorization_code',
      ...(pkceVerifier ? { code_verifier: pkceVerifier } : {})
    });
    const tokenRes = await axios.post(TOKEN_ENDPOINT, body.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 });
    const tokens = tokenRes.data; // { access_token, expires_in, refresh_token?, id_token, scope, token_type }

    // Verify ID token
    // Verify ID token signature using Google JWKS
    let verifiedPayload;
    try {
      const decodedHeader = jwt.decode(tokens.id_token, { complete: true });
      if (!decodedHeader) return res.status(400).send('Invalid id_token');
      const kid = decodedHeader.header.kid;
      const keys = await fetchGoogleJWKS();
      const jwk = keys.get(kid);
      if (!jwk) return res.status(400).send('Unknown key id');
      const pem = pemFromJwk(jwk);
      verifiedPayload = jwt.verify(tokens.id_token, pem, { algorithms: ['RS256'], audience: CONFIG.CLIENT_ID });
      if (!['accounts.google.com', 'https://accounts.google.com'].includes(verifiedPayload.iss)) return res.status(400).send('iss mismatch');
    } catch (e) {
      console.error('ID token verification failed', e.message);
      audit('auth_login_failed', { rid: req.rid, reason: 'id_token_verification_failed', error: e.message });
      return res.status(400).send('Invalid id_token_signature');
    }

    // Fetch userinfo (optional if payload already has email/profile fields)
    let profile = {
      sub: verifiedPayload.sub,
      email: verifiedPayload.email,
      name: verifiedPayload.name,
      picture: verifiedPayload.picture
    };
    try {
      const profRes = await axios.get(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${tokens.access_token}` }, timeout: 5000 });
      profile = profRes.data;
    } catch {/* ignore fallback to payload */}

    // Persist user in DB (upsert) & session (Redis)
    if (pool) {
      try {
        await pool.query(
          `INSERT INTO users (google_sub,email,name,picture,privacy_version,terms_version)
           VALUES ($1,$2,$3,$4,NULL,NULL)
           ON CONFLICT (google_sub) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, picture=EXCLUDED.picture, updated_at=now()`,
           [profile.sub, profile.email, profile.name, profile.picture]
        );
      } catch (e) { console.error('user_upsert_failed', e.message); }
    }
    const sessionId = nanoid(32);
    await sessionSet(sessionId, {
      user: profile,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        scope: tokens.scope,
        acquired_at: Date.now(),
        expires_in: tokens.expires_in
      },
      createdAt: Date.now(),
      lastAccess: Date.now(),
      csrfSecret: crypto.randomBytes(16).toString('hex'),
      accepted: { privacyVersion: null, termsVersion: null },
      ipSet: [req.requestIp]
    });

    res.cookie(CONFIG.SESSION_COOKIE_NAME, sessionId, cookieOpts);
    audit('auth_login_success', { rid: req.rid, sub: profile.sub, email: profile.email, sid_hash: hashSid(sessionId) });

    // Forward to n8n (fire-and-forget style)
    if (CONFIG.N8N_WEBHOOK_URL) {
      axios.post(CONFIG.N8N_WEBHOOK_URL, { profile, tokens: { ...tokens, refresh_token: tokens.refresh_token ? '[ENCRYPTED_STORED]' : null } })
        .catch(e => console.error('n8n webhook error', e.message));
    }

  // Redirect back to frontend dashboard using configured base URL
  const base = CONFIG.FRONTEND_BASE_URL.endsWith('/') ? CONFIG.FRONTEND_BASE_URL.slice(0,-1) : CONFIG.FRONTEND_BASE_URL;
  res.redirect(`${base}/dashboard`);
  } catch (e) {
    console.error('OAuth callback error', e.response?.data || e.message);
    audit('auth_login_failed', { rid: req.rid, reason: 'oauth_exchange_error', error: e.message, status: e.response?.status });
    res.status(502).send('OAuth exchange failed');
  }
});

// Step 3: Session introspection
app.get('/api/auth/me', async (req, res) => {
  const result = await ensureSession(req, res);
  if (!result) return; // ensureSession already responded
  const { session } = result;
  res.json({ authenticated: true, user: session.user });
 });

// ---------------------------------------------------------------------------
// Legal acceptance tracking (temporary session-based storage)
// ---------------------------------------------------------------------------
const PRIVACY_VERSION = CONFIG.PRIVACY_POLICY_VERSION;
const TERMS_VERSION = CONFIG.TERMS_VERSION;

app.get('/api/legal/acceptance', async (req,res) => {
  const result = await ensureSession(req,res);
  if (!result) return;
  const { session } = result;
  const acceptedPrivacy = session.accepted.privacyVersion === PRIVACY_VERSION;
  const acceptedTerms = session.accepted.termsVersion === TERMS_VERSION;
  res.json({ acceptedPrivacy, acceptedTerms, privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION });
});

app.post('/api/legal/accept', async (req,res) => {
  const result = await ensureSession(req,res);
  if (!result) return;
  const { session } = result;
  const { document } = req.body || {};
  if (!['privacy','terms'].includes(document)) return res.status(400).json({ error: 'invalid_document' });
  if (document === 'privacy') session.accepted.privacyVersion = PRIVACY_VERSION;
  if (document === 'terms') session.accepted.termsVersion = TERMS_VERSION;
  await sessionSet(result.sid, session);
  audit('legal_accept', { doc: document, privacy_v: session.accepted.privacyVersion, terms_v: session.accepted.termsVersion });
  res.json({ ok: true });
});

// CSRF token retrieval (double submit cookie pattern: send value in JS-visible cookie)
if (CONFIG.CSRFPROTECTION_ENABLED) {
  app.get('/api/auth/csrf-token', async (req,res) => {
    const result = await ensureSession(req, res);
    if (!result) return;
    const { session } = result;
    // Derive token as HMAC(session.csrfSecret, sessionId) to allow rotation with session
    const sid = result.sid;
    const token = crypto.createHmac('sha256', session.csrfSecret).update(sid).digest('hex');
    // Non-httpOnly so frontend JS can read; still sameSite=lax
    res.cookie('csrf_token', token, { ...cookieOpts, httpOnly: false, maxAge: 60*60*1000 });
    res.json({ token });
  });
}

// Logout
app.post('/api/auth/logout', async (req,res) => {
  const sid = req.cookies[CONFIG.SESSION_COOKIE_NAME];
  if (CONFIG.CSRFPROTECTION_ENABLED) {
    // Validate CSRF token from header X-CSRF-Token or custom header
    if (!sid || !(await sessionGet(sid))) {
      audit('csrf_validation_failed', { reason: 'no_session_for_logout' });
      return res.status(401).json({ error: 'not_authenticated' });
    }
    const session = await sessionGet(sid);
    const expected = crypto.createHmac('sha256', session.csrfSecret).update(sid).digest('hex');
    const provided = req.headers['x-csrf-token'];
    if (!provided) {
      audit('csrf_token_missing', { path: req.path });
      return res.status(403).json({ error: 'csrf_required' });
    }
    if (provided !== expected) {
      audit('csrf_validation_failed', { reason: 'mismatch', path: req.path });
      return res.status(403).json({ error: 'csrf_invalid' });
    }
  }
  if (sid) await sessionDel(sid);
  res.clearCookie(CONFIG.SESSION_COOKIE_NAME, cookieOpts);
  res.json({ ok: true });
  audit('auth_logout', { rid: req.rid, sid_hash: sid ? hashSid(sid) : null });
});

// Basic calendar proxy example (optional future use)
app.get('/api/calendar/primary', async (req,res) => {
  const result = await ensureSession(req, res);
  if (!result) return; // unauthorized or expired already handled
  const { session } = result;
  try {
    const calRes = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', { headers: { Authorization: `Bearer ${session.tokens.access_token}` }, timeout: 6000 });
    res.json(calRes.data);
    audit('calendar_list_success', { rid: req.rid, sid_hash: hashSid(result.sid), item_count: Array.isArray(calRes.data.items) ? calRes.data.items.length : undefined });
  } catch (e) {
    res.status(502).json({ error: 'calendar_fetch_failed', detail: e.message });
    audit('calendar_list_failed', { rid: req.rid, sid_hash: hashSid(result.sid), error: e.message });
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ error: 'internal_error' });
});

const port = process.env.BACKEND_PORT || process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend listening on :${port}`);
  if (pool) {
    testDbConnection().then(r => {
      if (r.ok) console.log('Connected to PostgreSQL');
      else console.error('PostgreSQL connection failed:', r.error);
    });
  } else {
    console.log('PostgreSQL not configured (DATABASE_URL missing)');
  }
  try {
    const sha = execSync('git rev-parse --short HEAD').toString().trim();
    console.log('[build] commit_sha', sha);
  } catch {/* ignore in container without git */}
});

// ---------------------------------------------------------------------------
// Helper: validate & rotate session (idle timeout, absolute timeout)
// ---------------------------------------------------------------------------
async function ensureSession(req, res) {
  const sid = req.cookies[CONFIG.SESSION_COOKIE_NAME];
  if (!sid) {
    res.status(401).json({ authenticated: false });
    audit('session_invalid', { reason: 'missing_or_unknown_sid' });
    return null;
  }
  const now = Date.now();
  let session = await sessionGet(sid);
  if (!session) {
    res.status(401).json({ authenticated: false });
    audit('session_invalid', { reason: 'unknown_sid' });
    return null;
  }
  // Anomaly detection: multiple distinct IPs exceeding threshold
  if (session.ipSet) {
    if (!session.ipSet.includes(req.requestIp)) {
      session.ipSet.push(req.requestIp);
      if (session.ipSet.length > 3) {
        audit('session_anomaly_multi_ip', { sid_hash: hashSid(sid), ip_count: session.ipSet.length });
      }
    }
  } else {
    session.ipSet = [req.requestIp];
  }
  // Absolute timeout
  if (session.createdAt + SESSION_ABSOLUTE_MAX_MS < now) {
    await sessionDel(sid);
    res.clearCookie(CONFIG.SESSION_COOKIE_NAME, cookieOpts);
    res.status(401).json({ authenticated: false, reason: 'session_expired_absolute' });
    audit('session_expired', { type: 'absolute', sid_hash: hashSid(sid) });
    return null;
  }
  // Idle timeout
  if (session.lastAccess + SESSION_IDLE_MAX_MS < now) {
    await sessionDel(sid);
    res.clearCookie(CONFIG.SESSION_COOKIE_NAME, cookieOpts);
    res.status(401).json({ authenticated: false, reason: 'session_expired_idle' });
    audit('session_expired', { type: 'idle', sid_hash: hashSid(sid) });
    return null;
  }
  // Rotation (issue new session id periodically to reduce fixation risk)
  let currentSid = sid;
  if (session.lastAccess + SESSION_ROTATE_INTERVAL_MS < now) {
    const newSid = nanoid(32);
    await sessionSet(newSid, { ...session, lastAccess: now });
    await sessionDel(sid);
    res.cookie(CONFIG.SESSION_COOKIE_NAME, newSid, cookieOpts);
    currentSid = newSid;
    session = await sessionGet(newSid);
    audit('session_rotated', { old_sid_hash: hashSid(sid), new_sid_hash: hashSid(newSid) });
  } else {
    session.lastAccess = now;
    await sessionSet(currentSid, session); // persist updated lastAccess
  }

  // -------------------------------------------------------------------------
  // Graceful access token refresh (before expiry) using stored refresh token.
  // Attempt if remaining lifetime < skew threshold. If refresh fails with
  // invalid_grant we terminate the session forcing re-auth.
  // -------------------------------------------------------------------------
  try {
    if (session.tokens && session.tokens.access_token && session.tokens.expires_in) {
      const expiresAt = session.tokens.acquired_at + (session.tokens.expires_in * 1000);
      const remainingMs = expiresAt - now;
      if (remainingMs < CONFIG.ACCESS_TOKEN_REFRESH_SKEW_SECONDS * 1000) {
        if (session.tokens.refresh_token) {
          const form = new URLSearchParams({
            client_id: CONFIG.CLIENT_ID,
            client_secret: CONFIG.CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: decrypt(session.tokens.refresh_token)
          });
          try {
            const tokenRes = await axios.post('https://oauth2.googleapis.com/token', form.toString(), { headers: { 'Content-Type':'application/x-www-form-urlencoded' }, timeout: 8000 });
            const data = tokenRes.data; // { access_token, expires_in, scope, token_type, refresh_token? }
            session.tokens.access_token = data.access_token;
            session.tokens.expires_in = data.expires_in;
            session.tokens.acquired_at = Date.now();
            if (data.refresh_token) {
              session.tokens.refresh_token = encrypt(data.refresh_token);
            }
            await sessionSet(currentSid, session);
            audit('token_refresh_success', { sid_hash: hashSid(currentSid), new_exp: session.tokens.expires_in });
          } catch (e) {
            const status = e.response?.status;
            const body = e.response?.data;
            const errStr = body?.error || e.message;
            audit('token_refresh_failed', { sid_hash: hashSid(currentSid), status, error: errStr });
            // If refresh is invalid (invalid_grant) terminate session to force clean re-auth
            if (body?.error === 'invalid_grant') {
              await sessionDel(currentSid);
              res.clearCookie(CONFIG.SESSION_COOKIE_NAME, cookieOpts);
              return res.status(401).json({ authenticated: false, reason: 're_auth_required' });
            }
            // Otherwise proceed (client may retry later); we do not expose internal error detail
          }
        } else {
          // No refresh token present -> require re-auth if already expired
          if (remainingMs <= 0) {
            await sessionDel(currentSid);
            res.clearCookie(CONFIG.SESSION_COOKIE_NAME, cookieOpts);
            audit('session_ended_no_refresh_token', { sid_hash: hashSid(currentSid) });
            return res.status(401).json({ authenticated: false, reason: 'no_refresh_token' });
          }
        }
      }
    }
  } catch (e) {
    console.error('refresh_flow_unexpected_error', e.message);
  }
  return { sid: currentSid, session };
}

// Explicit refresh endpoint (optional proactive refresh). Returns new expiry.
app.post('/api/auth/refresh', async (req,res) => {
  const result = await ensureSession(req,res);
  if (!result) return; // ensureSession already handled response
  const { session, sid } = result;
  if (!session.tokens || !session.tokens.refresh_token) {
    return res.status(400).json({ error: 'no_refresh_token' });
  }
  // Force refresh by setting skew large enough
  try {
    const form = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      client_secret: CONFIG.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: decrypt(session.tokens.refresh_token)
    });
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', form.toString(), { headers: { 'Content-Type':'application/x-www-form-urlencoded' }, timeout: 8000 });
    const data = tokenRes.data;
    session.tokens.access_token = data.access_token;
    session.tokens.expires_in = data.expires_in;
    session.tokens.acquired_at = Date.now();
    if (data.refresh_token) session.tokens.refresh_token = encrypt(data.refresh_token);
    await sessionSet(sid, session);
    audit('token_refresh_forced_success', { sid_hash: hashSid(sid), new_exp: data.expires_in });
    res.json({ ok: true, expires_in: data.expires_in, acquired_at: session.tokens.acquired_at });
  } catch (e) {
    const status = e.response?.status;
    const body = e.response?.data;
    audit('token_refresh_forced_failed', { sid_hash: hashSid(sid), status, error: body?.error || e.message });
    if (body?.error === 'invalid_grant') {
      await sessionDel(sid);
      res.clearCookie(CONFIG.SESSION_COOKIE_NAME, cookieOpts);
      return res.status(401).json({ error: 're_auth_required' });
    }
    res.status(502).json({ error: 'refresh_failed' });
  }
});

// ---------------------------------------------------------------------------
// Admin: Manual session invalidation
// ---------------------------------------------------------------------------
app.post('/api/admin/sessions/invalidate', async (req,res) => {
  if (!CONFIG.ADMIN_API_KEY || req.headers['x-admin-key'] !== CONFIG.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const { sid, sub } = req.body || {};
  let count = 0;
  if (sid) {
    await sessionDel(sid); count = 1;
  } else if (sub && redis) {
    // Scan keys (bounded) for user sub (lightweight pattern). For large scale, maintain index.
    const stream = redis.scanStream({ match: `${CONFIG.REDIS_NAMESPACE}:sess:*`, count: 100 });
    for await (const keys of stream) {
      for (const k of keys) {
        const raw = await redis.get(k);
        if (raw && JSON.parse(raw)?.user?.sub === sub) { await redis.del(k); count++; }
      }
    }
  } else {
    return res.status(400).json({ error: 'sid_or_sub_required' });
  }
  audit('admin_session_invalidate', { sid_hash: sid ? hashSid(sid) : null, sub, count });
  res.json({ ok: true, invalidated: count });
});

// ---------------------------------------------------------------------------
// Deletion request workflow (user initiated)
// ---------------------------------------------------------------------------
app.post('/api/account/delete-request', async (req,res) => {
  const result = await ensureSession(req,res); if (!result) return;
  const { session } = result;
  if (!pool) return res.status(503).json({ error: 'db_unavailable' });
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE google_sub=$1', [session.user.sub]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'user_not_found' });
    const userId = userRes.rows[0].id;
    await pool.query('INSERT INTO deletion_requests(user_id) VALUES($1)', [userId]);
    audit('deletion_request_created', { sub: session.user.sub });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'request_failed' });
  }
});

// Admin process deletion (mark processed)
app.post('/api/admin/deletion-requests/:id/process', async (req,res) => {
  if (!CONFIG.ADMIN_API_KEY || req.headers['x-admin-key'] !== CONFIG.ADMIN_API_KEY) return res.status(401).json({ error: 'unauthorized' });
  if (!pool) return res.status(503).json({ error: 'db_unavailable' });
  const id = req.params.id;
  try {
    await pool.query('UPDATE deletion_requests SET status=\'processed\', processed_at=now() WHERE id=$1', [id]);
    audit('deletion_request_processed', { id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'process_failed' }); }
});

// ---------------------------------------------------------------------------
// Calendar Events CRUD (Google Calendar API proxy) with retry/backoff
// ---------------------------------------------------------------------------
async function gApi(session, method, url, data) {
  const headers = { Authorization: `Bearer ${session.tokens.access_token}` };
  const max = 3;
  for (let attempt=1; attempt<=max; attempt++) {
    try {
      const res = await axios({ method, url, data, headers, timeout: 8000 });
      return res.data;
    } catch (e) {
      const status = e.response?.status;
      if (attempt < max && (status === 429 || (status >=500 && status <=599))) {
        await new Promise(r=>setTimeout(r, 300 * attempt));
        continue;
      }
      throw e;
    }
  }
}

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
app.post('/api/calendar/events', async (req,res) => {
  const result = await ensureSession(req,res); if (!result) return;
  try {
    const data = await gApi(result.session, 'post', GCAL_BASE, req.body);
    audit('calendar_event_create', { rid: req.rid });
    res.status(201).json(data);
  } catch (e) {
    audit('calendar_event_create_failed', { rid: req.rid, error: e.response?.status });
    res.status(502).json({ error: 'event_create_failed' });
  }
});
app.get('/api/calendar/events/:id', async (req,res) => {
  const result = await ensureSession(req,res); if (!result) return;
  try {
    const data = await gApi(result.session, 'get', `${GCAL_BASE}/${req.params.id}`);
    res.json(data);
  } catch (e) {
    res.status(e.response?.status === 404 ? 404 : 502).json({ error: e.response?.status === 404 ? 'not_found' : 'event_fetch_failed' });
  }
});
app.put('/api/calendar/events/:id', async (req,res) => {
  const result = await ensureSession(req,res); if (!result) return;
  try {
    const data = await gApi(result.session, 'put', `${GCAL_BASE}/${req.params.id}`, req.body);
    audit('calendar_event_update', { rid: req.rid });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'event_update_failed' });
  }
});
app.delete('/api/calendar/events/:id', async (req,res) => {
  const result = await ensureSession(req,res); if (!result) return;
  try {
    await gApi(result.session, 'delete', `${GCAL_BASE}/${req.params.id}`);
    audit('calendar_event_delete', { rid: req.rid });
    res.json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'event_delete_failed' });
  }
});
