#!/usr/bin/env node
// Prints non-secret configuration for debugging (staging/dev). Secrets are NOT output.
import 'dotenv/config';
import { CONFIG } from '../backend/config/env.js';

function redact(v) { return v ? '[set]' : '[unset]'; }

const output = {
  env: CONFIG.NODE_ENV,
  frontend_base_url: CONFIG.FRONTEND_BASE_URL,
  enforce_https: CONFIG.ENFORCE_HTTPS,
  csp_strict: CONFIG.CSP_STRICT,
  hsts_enabled: CONFIG.HSTS_ENABLED,
  csrf: CONFIG.CSRF_PROTECTION_ENABLED,
  security_headers: CONFIG.SECURITY_HEADERS_ENABLED,
  rate_limit_enabled: CONFIG.RATE_LIMIT_ENABLED,
  audit_log_enabled: CONFIG.AUDIT_LOG_ENABLED,
  redis_present: !!CONFIG.REDIS_URL,
  session_idle_minutes: CONFIG.SESSION_IDLE_MAX_MINUTES,
  session_absolute_hours: CONFIG.SESSION_ABSOLUTE_MAX_HOURS,
  session_rotate_minutes: CONFIG.SESSION_ROTATE_MINUTES,
  access_token_refresh_skew_s: CONFIG.ACCESS_TOKEN_REFRESH_SKEW_SECONDS,
  cors_allowed_origins: CONFIG.CORS_ALLOWED_ORIGINS,
  // Redacted presence indicators for secrets
  client_id: redact(CONFIG.CLIENT_ID),
  client_secret: redact(CONFIG.CLIENT_SECRET),
  secret_key: redact(CONFIG.SECRET_KEY),
  refresh_token_encryption_key: redact(CONFIG.REFRESH_TOKEN_ENCRYPTION_KEY),
  refresh_token_encryption_key_previous: redact(CONFIG.REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS),
  n8n_webhook_url: CONFIG.N8N_WEBHOOK_URL ? '[set]' : '[unset]'
};

console.log(JSON.stringify(output, null, 2));
