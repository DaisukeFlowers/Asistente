import crypto from 'crypto';
import { z } from 'zod';
import 'dotenv/config';

// Centralized environment + configuration schema for Schedulink backend.
// Single source of truth consumed both by runtime (server.js) and prestart verifier.

const raw = process.env;

const bool = (def) => z.string().optional().transform(v => (v ?? String(def)).toLowerCase() === 'true');
const int = (def) => z.string().optional().transform(v => {
  const num = parseInt(v ?? String(def), 10); return Number.isFinite(num) ? num : def;
});

const schema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  // Core required (prod) / defaults (dev)
  CLIENT_ID: z.string().min(1, 'CLIENT_ID required'),
  CLIENT_SECRET: z.string().min(1, 'CLIENT_SECRET required'),
  REDIRECT_URI: z.string().min(1, 'REDIRECT_URI required'),
  SECRET_KEY: z.string().optional(), // required in prod; dev fallback generated
  REFRESH_TOKEN_ENCRYPTION_KEY: z.string().min(32, 'REFRESH_TOKEN_ENCRYPTION_KEY must be >=32 chars'),
  REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS: z.string().optional().nullable(),
  FRONTEND_BASE_URL: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().min(1, 'N8N_WEBHOOK_URL required'),
  REDIS_URL: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
  SUPPORT_CONTACT_EMAIL: z.string().optional(),
  LOG_FORWARD_WEBHOOK: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // Security / policy toggles
  ENFORCE_HTTPS: bool(true),
  CSP_STRICT: bool(true),
  PRINT_SECRET_FINGERPRINTS: bool(false),
  HSTS_ENABLED: bool(true),
  CSRF_PROTECTION_ENABLED: bool(true),
  SECURITY_HEADERS_ENABLED: bool(true),
  ALLOW_PII_LOGGING: bool(false),

  // Optional / feature flags
  AUDIT_LOG_ENABLED: bool(true),
  RATE_LIMIT_ENABLED: bool(true),
  RATE_LIMIT_AUTH_BURST: int(5),
  RATE_LIMIT_AUTH_REFILL_PER_MINUTE: int(5),
  RATE_LIMIT_API_BURST: int(60),
  RATE_LIMIT_API_REFILL_PER_MINUTE: int(60),
  SESSION_IDLE_MAX_MINUTES: int(30),
  SESSION_ABSOLUTE_MAX_HOURS: int(24),
  SESSION_ROTATE_MINUTES: int(15),
  CORS_ALLOWED_ORIGINS: z.string().optional().default(''),
  CORS_ALLOW_CREDENTIALS: bool(true),
  CORS_ENABLED: bool(true),
  GOOGLE_SCOPE: z.string().optional().default('openid email profile https://www.googleapis.com/auth/calendar'),
  ACCESS_TOKEN_REFRESH_SKEW_SECONDS: int(60),
  REDIS_NAMESPACE: z.string().optional().default('schedulink'),

  // Legal / versions
  PRIVACY_POLICY_VERSION: z.string().optional().default('PP-1.0.0'),
  TERMS_VERSION: z.string().optional().default('TOS-1.0.0'),

  // Maintenance / discouraged overrides
  ALLOW_INMEMORY_SESSION_IN_PROD: z.string().optional(),
  ALLOW_HEALTH_PASS_WITHOUT_REDIS: z.string().optional(),
});

function placeholderWeak(v) {
  return /(changeme|placeholder|dummy|insecure)/i.test(v || '');
}

const parsed = schema.parse(raw);

// Environment classification
const isProd = parsed.NODE_ENV === 'production';
const isStaging = parsed.NODE_ENV === 'staging';

// Provide dev defaults for ease of local work
if (!parsed.SECRET_KEY) {
  if (isProd) throw new Error('SECRET_KEY missing in production');
  if (isStaging) {
    // Staging must explicitly set SECRET_KEY so accidental prod reuse can be audited.
    throw new Error('SECRET_KEY missing in staging');
  }
  parsed.SECRET_KEY = crypto.randomBytes(48).toString('hex');
  console.warn('[env] Generated ephemeral dev SECRET_KEY (do not rely on for prod/staging).');
}
if (!parsed.FRONTEND_BASE_URL) {
  if (isProd || isStaging) throw new Error('FRONTEND_BASE_URL required');
  parsed.FRONTEND_BASE_URL = 'http://localhost:5173';
}

// Staging relaxed defaults (only if unset by user)
if (isStaging) {
  if (raw.CSP_STRICT === undefined) parsed.CSP_STRICT = false; // allow easier debugging
  if (raw.PRINT_SECRET_FINGERPRINTS === undefined) parsed.PRINT_SECRET_FINGERPRINTS = true; // enable diagnostic fingerprints
  if (raw.HSTS_ENABLED === undefined) parsed.HSTS_ENABLED = false; // avoid premature strict transport preload
  if (raw.RATE_LIMIT_ENABLED === undefined) parsed.RATE_LIMIT_ENABLED = false; // reduce friction in QA
  if (raw.SESSION_IDLE_MAX_MINUTES === undefined) parsed.SESSION_IDLE_MAX_MINUTES = 5; // shorter feedback loop
}

if (isProd || isStaging) {
  const fail = [];
  if (!parsed.REDIS_URL) fail.push('REDIS_URL required in ' + (isProd ? 'production' : 'staging'));
  if (!parsed.DATABASE_URL) fail.push('DATABASE_URL required in ' + (isProd ? 'production' : 'staging'));
  if (!parsed.ENFORCE_HTTPS) fail.push('ENFORCE_HTTPS must be true in ' + (isProd ? 'production' : 'staging'));
  if (isProd && !parsed.CSP_STRICT) fail.push('CSP_STRICT must be true in production');
  if (isProd && parsed.PRINT_SECRET_FINGERPRINTS) fail.push('PRINT_SECRET_FINGERPRINTS must be false in production');
  if (!/^https?:\/\//.test(parsed.FRONTEND_BASE_URL || '')) fail.push('FRONTEND_BASE_URL must be absolute URL');
  if (placeholderWeak(parsed.SECRET_KEY)) fail.push('SECRET_KEY looks placeholder/weak');
  if (placeholderWeak(parsed.REFRESH_TOKEN_ENCRYPTION_KEY)) fail.push('REFRESH_TOKEN_ENCRYPTION_KEY looks placeholder/weak');
  if (parsed.ALLOW_INMEMORY_SESSION_IN_PROD === 'true') fail.push('ALLOW_INMEMORY_SESSION_IN_PROD not permitted');
  if (parsed.ALLOW_HEALTH_PASS_WITHOUT_REDIS === 'true') fail.push('ALLOW_HEALTH_PASS_WITHOUT_REDIS not permitted');
  if (fail.length) {
    throw new Error((isProd ? 'Production' : 'Staging') + ' environment validation failed:\n - ' + fail.join('\n - '));
  }
}

// Additional secret strength checks
if (parsed.SECRET_KEY.length < 32) throw new Error('SECRET_KEY must be >=32 chars');
if (parsed.REFRESH_TOKEN_ENCRYPTION_KEY.length < 32) throw new Error('REFRESH_TOKEN_ENCRYPTION_KEY must be >=32 chars');
if (parsed.REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS && parsed.REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS.length < 32) {
  throw new Error('REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS must be >=32 chars');
}

// Public (non-secret) configuration object exported to server.
export const CONFIG = {
  CLIENT_ID: parsed.CLIENT_ID,
  CLIENT_SECRET: parsed.CLIENT_SECRET,
  REDIRECT_URI: parsed.REDIRECT_URI,
  SECRET_KEY: parsed.SECRET_KEY,
  REFRESH_TOKEN_ENCRYPTION_KEY: parsed.REFRESH_TOKEN_ENCRYPTION_KEY,
  REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS: parsed.REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS || '',
  FRONTEND_BASE_URL: parsed.FRONTEND_BASE_URL,
  N8N_WEBHOOK_URL: parsed.N8N_WEBHOOK_URL,
  REDIS_URL: parsed.REDIS_URL || '',
  ADMIN_API_KEY: parsed.ADMIN_API_KEY || '',
  SUPPORT_CONTACT_EMAIL: parsed.SUPPORT_CONTACT_EMAIL || '',
  LOG_FORWARD_WEBHOOK: parsed.LOG_FORWARD_WEBHOOK || '',
  DATABASE_URL: parsed.DATABASE_URL || '',
  REDIS_NAMESPACE: parsed.REDIS_NAMESPACE,
  GOOGLE_SCOPE: parsed.GOOGLE_SCOPE,
  ENFORCE_HTTPS: parsed.ENFORCE_HTTPS,
  CSP_STRICT: parsed.CSP_STRICT,
  PRINT_SECRET_FINGERPRINTS: parsed.PRINT_SECRET_FINGERPRINTS,
  HSTS_ENABLED: parsed.HSTS_ENABLED,
  CSRF_PROTECTION_ENABLED: parsed.CSRF_PROTECTION_ENABLED,
  SECURITY_HEADERS_ENABLED: parsed.SECURITY_HEADERS_ENABLED,
  ALLOW_PII_LOGGING: parsed.ALLOW_PII_LOGGING,
  AUDIT_LOG_ENABLED: parsed.AUDIT_LOG_ENABLED,
  RATE_LIMIT_ENABLED: parsed.RATE_LIMIT_ENABLED,
  RATE_LIMIT_AUTH_BURST: parsed.RATE_LIMIT_AUTH_BURST,
  RATE_LIMIT_AUTH_REFILL_PER_MINUTE: parsed.RATE_LIMIT_AUTH_REFILL_PER_MINUTE,
  RATE_LIMIT_API_BURST: parsed.RATE_LIMIT_API_BURST,
  RATE_LIMIT_API_REFILL_PER_MINUTE: parsed.RATE_LIMIT_API_REFILL_PER_MINUTE,
  SESSION_IDLE_MAX_MINUTES: parsed.SESSION_IDLE_MAX_MINUTES,
  SESSION_ABSOLUTE_MAX_HOURS: parsed.SESSION_ABSOLUTE_MAX_HOURS,
  SESSION_ROTATE_MINUTES: parsed.SESSION_ROTATE_MINUTES,
  CORS_ALLOWED_ORIGINS: parsed.CORS_ALLOWED_ORIGINS,
  CORS_ALLOW_CREDENTIALS: parsed.CORS_ALLOW_CREDENTIALS,
  CORS_ENABLED: parsed.CORS_ENABLED,
  ACCESS_TOKEN_REFRESH_SKEW_SECONDS: parsed.ACCESS_TOKEN_REFRESH_SKEW_SECONDS,
  PRIVACY_POLICY_VERSION: parsed.PRIVACY_POLICY_VERSION,
  TERMS_VERSION: parsed.TERMS_VERSION,
  NODE_ENV: parsed.NODE_ENV
};

// Safe structured logging of non-secret config facets (booleans, counts, presence flags)
function logSafeConfig() {
  const safe = {
  env: CONFIG.NODE_ENV,
  staging: isStaging,
    enforce_https: CONFIG.ENFORCE_HTTPS,
    csp_strict: CONFIG.CSP_STRICT,
    hsts_enabled: CONFIG.HSTS_ENABLED,
    csrf: CONFIG.CSRF_PROTECTION_ENABLED,
    security_headers: CONFIG.SECURITY_HEADERS_ENABLED,
    audit_log: CONFIG.AUDIT_LOG_ENABLED,
    rate_limit_enabled: CONFIG.RATE_LIMIT_ENABLED,
    frontend_base_url: CONFIG.FRONTEND_BASE_URL,
    redis_present: !!CONFIG.REDIS_URL,
  db_present: !!CONFIG.DATABASE_URL,
    print_secret_fingerprints: CONFIG.PRINT_SECRET_FINGERPRINTS,
    session_idle_min: CONFIG.SESSION_IDLE_MAX_MINUTES,
    session_absolute_h: CONFIG.SESSION_ABSOLUTE_MAX_HOURS,
    session_rotate_min: CONFIG.SESSION_ROTATE_MINUTES,
    access_token_refresh_skew_s: CONFIG.ACCESS_TOKEN_REFRESH_SKEW_SECONDS
  };
  console.log('[config]', JSON.stringify(safe));
}
logSafeConfig();

// Optional secret fingerprint logging (dev only when explicitly enabled)
if (CONFIG.PRINT_SECRET_FINGERPRINTS && CONFIG.NODE_ENV !== 'production') {
  const hash = (v) => crypto.createHash('sha256').update(v || '').digest('hex').slice(0,12);
  console.log('[config:fingerprints]', JSON.stringify({
    client_id_fp: hash(CONFIG.CLIENT_ID),
    client_secret_fp: hash(CONFIG.CLIENT_SECRET),
    refresh_key_fp: hash(CONFIG.REFRESH_TOKEN_ENCRYPTION_KEY),
    refresh_prev_fp: CONFIG.REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS ? hash(CONFIG.REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS) : null,
    secret_key_fp: hash(CONFIG.SECRET_KEY)
  }));
}

export default CONFIG;
