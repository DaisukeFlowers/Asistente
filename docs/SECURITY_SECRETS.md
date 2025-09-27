# Secret Management (Item 1.15)

This document lists sensitive configuration values, their purpose, rotation guidance, and validation rules enforced at runtime.

## 1. Inventory

| Name | Classification | Purpose | Required | Notes |
|------|----------------|---------|----------|-------|
| CLIENT_ID | Public OAuth Metadata | Google OAuth client identifier | Yes | Not secret, but validated for presence. |
| CLIENT_SECRET | Sensitive Secret | Google OAuth client secret for code exchange | Yes | Rotate immediately if leaked. |
| REDIRECT_URI | Config | OAuth redirect endpoint | Yes | Must match Google Console settings. |
| SECRET_KEY | Sensitive Secret | Internal signing / future token HMAC uses | Yes | 32+ bytes recommended. |
| REFRESH_TOKEN_ENCRYPTION_KEY | Sensitive Secret | AES-256-GCM key (derived via SHA-256) for encrypting stored refresh tokens | Yes | MUST be strong & random; placeholder forbidden in production. |
| REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS | Sensitive Secret (transitional) | Previous key for seamless rotation | No | Remove after rotation window closes. |
| N8N_WEBHOOK_URL | External Endpoint | Downstream automation hook | Yes | Not inherently secret but may reveal architecture; treat as internal. |
| FRONTEND_BASE_URL | Config | Allowed origin / redirect target | Yes | Used for CORS allow-list. |

## 2. Runtime Validation

The backend performs validation at startup (see `server.js`):
- Ensures required secrets exist.
- Minimum length constraints (CLIENT_SECRET >= 8, encryption & internal keys >= 32 chars).
- Rejects placeholder patterns ("changeme", "insecure", "placeholder").
- Production hard fail if `REFRESH_TOKEN_ENCRYPTION_KEY` is the insecure default.
- Emits `secret_validation_failed` audit events for each failing secret before aborting.
- Emits non-production fingerprint summary (`secret_fingerprints`) when `PRINT_SECRET_FINGERPRINTS=true` (default) to assist troubleshooting without exposing raw values.

## 3. Fingerprinting

Fingerprints use SHA-256(secret) truncated to 12 hex chars. NEVER derived from truncated raw secret — only the hash. Use fingerprints when comparing deployed vs intended values in logs.

## 4. Rotation Strategy

| Secret | Rotation Cadence | Trigger Conditions | Procedure |
|--------|------------------|--------------------|-----------|
| CLIENT_SECRET | Annual / On leak | Suspected compromise | Create new OAuth client or regenerate secret; deploy; revoke old if unused. |
| REFRESH_TOKEN_ENCRYPTION_KEY | 6–12 months / On leak | Audit finding, breach | Set new key as REFRESH_TOKEN_ENCRYPTION_KEY; move old to REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS; deploy; allow re-encryption as sessions refresh; remove previous after 30 days. |
| SECRET_KEY | 6–12 months / On leak | Breach or rotation policy | Generate 32+ random bytes; deploy; (future) invalidates signed artifacts if used. |

## 5. Rotation Timeline Example (Encryption Key)
Day 0: Deploy new primary + set previous.
Day 1–30: Both accepted for decrypt; new encrypt uses primary.
Day 31: Remove previous env var; restart services; any session still using the old fingerprint will fail and re-authenticate.

## 6. Secure Generation
Use a cryptographically secure random source:
```
node -e "console.log(crypto.randomBytes(48).toString('hex'))"
```
Or a secret manager (AWS Secrets Manager, GCP Secret Manager, Vault) with automatic rotation jobs.

## 7. Storage & Access
- Never commit raw secrets to VCS.
- Use per-environment `.env` files excluded from version control or better a secrets manager.
- Limit IAM to least privilege; only deploy service account/team should read.
- Avoid printing secrets; rely on fingerprints.

## 8. Incident Response
1. Revoke or rotate compromised secret (generate replacement).
2. Invalidate affected sessions/tokens where feasible.
3. Audit logs for abnormal access patterns.
4. Document event & remediation in incident register.

## 9. Future Enhancements
- Integrate with a managed secret manager provider.
- Add health endpoint section summarizing fingerprint freshness (non-prod only).
- Implement automatic key rotation workflow and alert on stale age.

## 10. Environment Variable Quick Checklist
Required every deploy (non-test): CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SECRET_KEY, REFRESH_TOKEN_ENCRYPTION_KEY, N8N_WEBHOOK_URL, FRONTEND_BASE_URL.

Transitional (if rotating): REFRESH_TOKEN_ENCRYPTION_KEY_PREVIOUS.

Optional toggles: AUDIT_LOG_ENABLED, RATE_LIMIT_ENABLED, CSRF_PROTECTION_ENABLED, CORS_ENABLED, SECURITY_HEADERS_ENABLED, CSP_STRICT, HSTS_ENABLED, PRINT_SECRET_FINGERPRINTS.

---
Maintained as part of security checklist item 1.15.
