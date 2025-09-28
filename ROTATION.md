## Secret & Encryption Key Rotation (Diyartec)

This document defines the safe rotation procedure for core backend secrets and encryption keys.

### Scope
- SESSION signing / integrity secret: `SECRETKEY`
- Refresh token encryption key (primary): `REFRESHTOKENENCRYPTIONKEY`
- Refresh token encryption key (previous during rotation window): `REFRESHTOKENENCRYPTIONKEY_PREVIOUS`

### Invariants
1. Production/staging must always have a strong (>=64 hex recommended) `SECRETKEY` and `REFRESHTOKENENCRYPTIONKEY`.
2. Never reuse an old key once removed from both variables.
3. Rotation is atomic per environment (staging first, observe, then production).

### Rotation Steps (Encryption Key)
1. Generate new 64+ char hex key: `openssl rand -hex 48`.
2. Set current `REFRESHTOKENENCRYPTIONKEY` value aside as OLD.
3. In Render dashboard (or env sync script):
   - Set `REFRESHTOKENENCRYPTIONKEY_PREVIOUS` = OLD
   - Set `REFRESHTOKENENCRYPTIONKEY` = NEW
4. Deploy. Verify:
   - Existing sessions continue to refresh access tokens (decrypt with PREVIOUS).
   - New logins encrypt refresh tokens with NEW key fingerprint.
5. After minimum overlap period (e.g. 72h) or when metrics show >99% of sessions reissued:
   - Remove `REFRESHTOKENENCRYPTIONKEY_PREVIOUS` (unset) and redeploy.
6. Document rotation (date, operator, NEW fingerprint) in internal security log.

### Emergency Rotation
If compromise suspected:
1. Immediately set BOTH `REFRESHTOKENENCRYPTIONKEY` and `REFRESHTOKENENCRYPTIONKEY_PREVIOUS` to fresh strong random values (OLD discarded).
2. This invalidates all stored encrypted refresh tokens → forces user re-auth (acceptable under incident conditions).
3. Announce forced logout to status page / comms channel.

### Session Secret Rotation (`SECRETKEY`)
Changing `SECRETKEY` invalidates server-side HMAC / crypto usages that rely on it (e.g., if later used for signing). Current implementation uses it for future signing expansion only; rotate with a short notice window to minimize potential impact.

Procedure:
1. Generate NEW key (64+ hex) and update `SECRETKEY`.
2. Deploy – all ephemeral derived usages (if added later) will adopt new value. If future cookie signatures are introduced, expect session invalidation.

### Validation Checklist
After rotation deploy:
- `/api/version` still returns 200 with expected security flags.
- Existing user sessions still pass `/api/auth/me` (encryption key rotation only).
- New login refresh token payload contains new key fingerprint (log audit event `token_refresh_success` or login event).

### Metrics to Watch
- Rate of `token_refresh_failed` events.
- Spike in `auth_login_success` vs baseline (indicates re-auth churn).
- Error rate on `/api/auth/me` (unexpected session invalidations).

### Fingerprint Derivation
Key fingerprint is first 4 bytes (8 hex characters) of SHA-256(secret). Never log full secret; only fingerprint.

---
Last Updated: 2025-09-28