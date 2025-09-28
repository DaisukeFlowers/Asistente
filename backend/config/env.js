import crypto from 'crypto';
import { z } from 'zod';
import 'dotenv/config';

// Centralized environment + configuration schema (migrated to Diyartec naming).
// New variable names intentionally drop internal underscores for core security flags.
// Backward compatibility: if legacy Schedulink variable names are present (e.g. SECRET_KEY),
// they are mapped to the new names unless the new name is already explicitly set.

const raw = process.env;

// Backward compatibility mapping (only if new key missing)
const LEGACY_MAP = {
  SECRET_KEY: 'SECRETKEY',
  REFRESH_TOKEN_ENCRYPTION_KEY: 'REFRESHTOKENENCRYPTIONKEY',
  REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS: 'REFRESHTOKENENCRYPTIONKEY_PREVIOUS',
  ENFORCE_HTTPS: 'ENFORCEHTTPS',
  CSP_STRICT: 'CSPSTRICT',
  HSTS_ENABLED: 'HSTSENABLED',
  SECURITY_HEADERS_ENABLED: 'SECURITYHEADERSENABLED',
  RATE_LIMIT_ENABLED: 'RATELIMIT_ENABLED',
  CSRF_PROTECTION_ENABLED: 'CSRFPROTECTION_ENABLED'
};
for (const [oldKey, newKey] of Object.entries(LEGACY_MAP)) {
  if (raw[oldKey] && raw[newKey] === undefined) {
    raw[newKey] = raw[oldKey];
    console.warn(`[env:migration] Using legacy env var ${oldKey}; prefer ${newKey}.`);
  }
}

const bool = (def) => z.string().optional().transform(v => (v ?? String(def)).toLowerCase() === 'true');
const int = (def) => z.string().optional().transform(v => {
  const num = parseInt(v ?? String(def), 10); return Number.isFinite(num) ? num : def;
});

const schema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID required'),
  CLIENT_SECRET: z.string().min(1, 'CLIENT_SECRET required'),
  REDIRECT_URI: z.string().min(1, 'REDIRECT_URI required'),
  SECRETKEY: z.string().optional(),
  REFRESHTOKENENCRYPTIONKEY: z.string().optional(),
  REFRESHTOKENENCRYPTIONKEY_PREVIOUS: z.string().optional().nullable(),
  FRONTEND_BASE_URL: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().min(1, 'N8N_WEBHOOK_URL required'),
  REDIS_URL: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
  SUPPORT_CONTACT_EMAIL: z.string().optional(),
  LOG_FORWARD_WEBHOOK: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  // New optional observability
  SENTRYDSN: z.string().optional(),
  LOGLEVEL: z.string().optional().default('info'),

  // Security / policy toggles (new names)
  ENFORCEHTTPS: bool(true),
  CSPSTRICT: bool(true),
  PRINT_SECRET_FINGERPRINTS: bool(false),
  HSTSENABLED: bool(true),
  CSRFPROTECTION_ENABLED: bool(true),
  SECURITYHEADERSENABLED: bool(true),
  ALLOW_PII_LOGGING: bool(false),

  // Optional / feature flags
  AUDIT_LOG_ENABLED: bool(true),
  RATELIMIT_ENABLED: bool(true),
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
  REDIS_NAMESPACE: z.string().optional().default('diyartec'),
  PERFORMANCEBUDGETMAIN_MS: int(4000),

  PRIVACY_POLICY_VERSION: z.string().optional().default('PP-1.0.0'),
  TERMS_VERSION: z.string().optional().default('TOS-1.0.0'),

  ALLOW_INMEMORY_SESSION_IN_PROD: z.string().optional(),
  ALLOW_HEALTH_PASS_WITHOUT_REDIS: z.string().optional()
});

function placeholderWeak(v) { return /(changeme|placeholder|dummy|insecure)/i.test(v || ''); }

const parsed = schema.parse(raw);
const isProd = parsed.NODE_ENV === 'production';
const isStaging = parsed.NODE_ENV === 'staging';

// Development fallback generation (no automatic fallback in production/staging)
if (!parsed.SECRETKEY) {
  if (isProd) throw new Error('SECRETKEY missing in production');
  if (isStaging) throw new Error('SECRETKEY missing in staging');
  parsed.SECRETKEY = crypto.randomBytes(48).toString('hex');
  console.warn('[env] Generated ephemeral dev SECRETKEY');
}
if (!parsed.REFRESHTOKENENCRYPTIONKEY || parsed.REFRESHTOKENENCRYPTIONKEY.length < 32) {
  if (isProd || isStaging) throw new Error('REFRESHTOKENENCRYPTIONKEY must be >=32 chars (missing or too short)');
  parsed.REFRESHTOKENENCRYPTIONKEY = crypto.randomBytes(48).toString('hex');
  console.warn('[env] Generated ephemeral dev REFRESHTOKENENCRYPTIONKEY');
}
if (!parsed.FRONTEND_BASE_URL) {
  if (isProd || isStaging) throw new Error('FRONTEND_BASE_URL required');
  parsed.FRONTEND_BASE_URL = 'http://localhost:5173';
}

// Staging relaxed defaults
if (isStaging) {
  if (raw.CSPSTRICT === undefined && raw.CSP_STRICT === undefined) parsed.CSPSTRICT = false;
  if (raw.PRINT_SECRET_FINGERPRINTS === undefined) parsed.PRINT_SECRET_FINGERPRINTS = true;
  if (raw.HSTSENABLED === undefined && raw.HSTS_ENABLED === undefined) parsed.HSTSENABLED = false;
  if (raw.RATELIMIT_ENABLED === undefined && raw.RATE_LIMIT_ENABLED === undefined) parsed.RATELIMIT_ENABLED = false;
  if (raw.SESSION_IDLE_MAX_MINUTES === undefined) parsed.SESSION_IDLE_MAX_MINUTES = 5;
}

if (isProd || isStaging) {
  const fail = [];
  if (!parsed.REDIS_URL) fail.push('REDIS_URL required in ' + (isProd ? 'production' : 'staging'));
  if (!parsed.DATABASE_URL) fail.push('DATABASE_URL required in ' + (isProd ? 'production' : 'staging'));
  if (!parsed.ENFORCEHTTPS) fail.push('ENFORCEHTTPS must be true in ' + (isProd ? 'production' : 'staging'));
  if (isProd && !parsed.CSPSTRICT) fail.push('CSPSTRICT must be true in production');
  if (isProd && parsed.PRINT_SECRET_FINGERPRINTS) fail.push('PRINT_SECRET_FINGERPRINTS must be false in production');
  if (!/^https?:\/\//.test(parsed.FRONTEND_BASE_URL || '')) fail.push('FRONTEND_BASE_URL must be absolute URL');
  if (placeholderWeak(parsed.SECRETKEY)) fail.push('SECRETKEY looks placeholder/weak');
  if (placeholderWeak(parsed.REFRESHTOKENENCRYPTIONKEY)) fail.push('REFRESHTOKENENCRYPTIONKEY looks placeholder/weak');
  if (parsed.ALLOW_INMEMORY_SESSION_IN_PROD === 'true') fail.push('ALLOW_INMEMORY_SESSION_IN_PROD not permitted');
  if (parsed.ALLOW_HEALTH_PASS_WITHOUT_REDIS === 'true') fail.push('ALLOW_HEALTH_PASS_WITHOUT_REDIS not permitted');
  if (fail.length) throw new Error((isProd ? 'Production' : 'Staging') + ' environment validation failed:\n - ' + fail.join('\n - '));
}

if (parsed.SECRETKEY.length < 32) throw new Error('SECRETKEY must be >=32 chars');
if (parsed.REFRESHTOKENENCRYPTIONKEY.length < 32) throw new Error('REFRESHTOKENENCRYPTIONKEY must be >=32 chars');
if (parsed.REFRESHTOKENENCRYPTIONKEY_PREVIOUS && parsed.REFRESHTOKENENCRYPTIONKEY_PREVIOUS.length < 32) throw new Error('REFRESHTOKENENCRYPTIONKEY_PREVIOUS must be >=32 chars');

export const CONFIG = {
  CLIENT_ID: parsed.CLIENT_ID,
  CLIENT_SECRET: parsed.CLIENT_SECRET,
  REDIRECT_URI: parsed.REDIRECT_URI,
  SECRETKEY: parsed.SECRETKEY,
  REFRESHTOKENENCRYPTIONKEY: parsed.REFRESHTOKENENCRYPTIONKEY,
  REFRESHTOKENENCRYPTIONKEY_PREVIOUS: parsed.REFRESHTOKENENCRYPTIONKEY_PREVIOUS || '',
  FRONTEND_BASE_URL: parsed.FRONTEND_BASE_URL,
  N8N_WEBHOOK_URL: parsed.N8N_WEBHOOK_URL,
  REDIS_URL: parsed.REDIS_URL || '',
  ADMIN_API_KEY: parsed.ADMIN_API_KEY || '',
  SUPPORT_CONTACT_EMAIL: parsed.SUPPORT_CONTACT_EMAIL || '',
  LOG_FORWARD_WEBHOOK: parsed.LOG_FORWARD_WEBHOOK || '',
  DATABASE_URL: parsed.DATABASE_URL || '',
  REDIS_NAMESPACE: parsed.REDIS_NAMESPACE,
  GOOGLE_SCOPE: parsed.GOOGLE_SCOPE,
  ENFORCEHTTPS: parsed.ENFORCEHTTPS,
  CSPSTRICT: parsed.CSPSTRICT,
  PRINT_SECRET_FINGERPRINTS: parsed.PRINT_SECRET_FINGERPRINTS,
  HSTSENABLED: parsed.HSTSENABLED,
  CSRFPROTECTION_ENABLED: parsed.CSRFPROTECTION_ENABLED,
  SECURITYHEADERSENABLED: parsed.SECURITYHEADERSENABLED,
  ALLOW_PII_LOGGING: parsed.ALLOW_PII_LOGGING,
  AUDIT_LOG_ENABLED: parsed.AUDIT_LOG_ENABLED,
  RATELIMIT_ENABLED: parsed.RATELIMIT_ENABLED,
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
  PERFORMANCEBUDGETMAIN_MS: parsed.PERFORMANCEBUDGETMAIN_MS,
  SENTRYDSN: parsed.SENTRYDSN || '',
  LOGLEVEL: parsed.LOGLEVEL,
  NODE_ENV: parsed.NODE_ENV
};

function logSafeConfig() {
  const safe = {
    env: CONFIG.NODE_ENV,
    staging: isStaging,
    enforce_https: CONFIG.ENFORCEHTTPS,
    csp_strict: CONFIG.CSPSTRICT,
    hsts_enabled: CONFIG.HSTSENABLED,
    csrf: CONFIG.CSRFPROTECTION_ENABLED,
    security_headers: CONFIG.SECURITYHEADERSENABLED,
    audit_log: CONFIG.AUDIT_LOG_ENABLED,
    rate_limit_enabled: CONFIG.RATELIMIT_ENABLED,
    frontend_base_url: CONFIG.FRONTEND_BASE_URL,
    redis_present: !!CONFIG.REDIS_URL,
    db_present: !!CONFIG.DATABASE_URL,
    session_idle_min: CONFIG.SESSION_IDLE_MAX_MINUTES,
    session_absolute_h: CONFIG.SESSION_ABSOLUTE_MAX_HOURS,
    session_rotate_min: CONFIG.SESSION_ROTATE_MINUTES,
    access_token_refresh_skew_s: CONFIG.ACCESS_TOKEN_REFRESH_SKEW_SECONDS
  };
  console.log('[config]', JSON.stringify(safe));
}
logSafeConfig();

if (CONFIG.PRINT_SECRET_FINGERPRINTS && CONFIG.NODE_ENV !== 'production') {
  const hash = (v) => crypto.createHash('sha256').update(v || '').digest('hex').slice(0,12);
  console.log('[config:fingerprints]', JSON.stringify({
    client_id_fp: hash(CONFIG.CLIENT_ID),
    client_secret_fp: hash(CONFIG.CLIENT_SECRET),
    refresh_key_fp: hash(CONFIG.REFRESHTOKENENCRYPTIONKEY),
    refresh_prev_fp: CONFIG.REFRESHTOKENENCRYPTIONKEY_PREVIOUS ? hash(CONFIG.REFRESHTOKENENCRYPTIONKEY_PREVIOUS) : null,
    secret_key_fp: hash(CONFIG.SECRETKEY)
  }));
}

export default CONFIG;
