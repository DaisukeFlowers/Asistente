## Schedulink Production Launch Checklist

Status Legend:
- ✅ Complete (meets production requirement and enforced)
- ⚠️ Pending (required before public launch / GA)
- 📝 Optional (non‑blocking, post‑launch or nice‑to‑have)

This is the authoritative Go/No‑Go artifact. Update the Generated date on every revision. Items are written as objective, testable statements.

Key References
- Backend env schema: `backend/config/env.js`
- Server implementation: `backend/server.js`
- Render blueprint: `render.yaml`
- CI pipeline: `.github/workflows/deploy.yml`
- Security flag verifier: `scripts/verify-prod-flags.js`
- Env sync tooling: `docs/render-cli.md` & `scripts/render/*.js`
- Example env: `.env.example` (backend) and `testapp/.env.example` (frontend)

Staging vs Production Policy
- Distinct OAuth clients must be used (staging may allow relaxed CSP, secret fingerprints for debugging). Production requires CSP_STRICT=true, PRINT_SECRET_FINGERPRINTS=false.
- HSTS is only enabled (HSTS_ENABLED=true) after custom domain + TLS verification; staging keeps it false to avoid preload misconfiguration.
- No environment may bypass Redis or Postgres in production or staging (guards in `env.js`). Emergency overrides (`ALLOW_INMEMORY_SESSION_IN_PROD`, `ALLOW_HEALTH_PASS_WITHOUT_REDIS`) are forbidden and blocked.

Managed Service Provisioning
- Redis: Standard/production plan (not free) required prior to launch for durable sessions + distributed rate limiting.
- Postgres: Starter (or higher) plan already integrated; migrations applied via `scripts/db-migrate.js`.
- Verify capacity headroom (CPU/memory < 70% at expected load) during staging soak test.

First Deployment (Visibility-Only) – Minimal Priority Path
1. Create Render services (API + Static Site) using `render.yaml` guidance.  
2. Set minimal env vars (placeholders acceptable initially): CLIENT_ID, CLIENT_SECRET, REDIRECT_URI (Render backend URL + `/api/auth/google/callback`), FRONTEND_BASE_URL, SECRET_KEY, REFRESH_TOKEN_ENCRYPTION_KEY, N8N_WEBHOOK_URL (placeholder), DATABASE_URL, REDIS_URL.  
	- Dev convenience: If `SECRET_KEY` or `REFRESH_TOKEN_ENCRYPTION_KEY` are absent (or refresh key <32 chars) and `NODE_ENV=development`, the backend now auto-generates ephemeral strong values at startup (logged with a warning). Production & staging still REQUIRE explicit strong values (>=32 chars) and will fail fast.  
3. Deploy; confirm `/api/health` returns ok and frontend loads root page.  
4. Attempt Google login (expected pending until prod OAuth client finalization) → show graceful message.  
5. Enable commit SHA log (already implemented) and capture in deployment output.  
6. Open issues for each remaining ⚠️ item with owner + target date.  
7. Create staging OAuth client & configure relaxed CSP (CSP_STRICT=false) before tightening prod.

---
### Executive Snapshot
Completed: OAuth PKCE flow & ID token verification, encryption & token rotation mechanics, session lifecycle (in‑memory + Redis support), PostgreSQL integration + health reporting, security headers + CSP/HSTS toggles, CSRF, CORS allow‑list, rate limiting (pre-distributed), audit logging with PII minimization, deletion request endpoints, calendar events CRUD with retry/backoff, admin session invalidation endpoint, anomaly (multi-IP) detection, commit SHA logging.
Blocking Remaining: Redis-enforced session persistence (production instance), distributed rate limiter (Redis buckets), staging vs prod OAuth separation + finalized consent screen, persistence of legal acceptance & user configuration, centralized log sink/retention, support contact email confirmation, integration & core unit tests, domain + TLS + HSTS activation, review PII log redaction vs needs, finalize data deletion processing (actual purge/anonymization pass), environment documentation final polish.

### Pre‑Deployment Gaps (Render Test Visibility Only)
Goal: Get backend & frontend visible at Render URLs (Google login may fail). All previously blocking gaps are now resolved (✅). Remaining informational items are listed for clarity.

| Status | Gap | Impact | Resolution / Notes |
|--------|-----|--------|--------------------|
| ✅ | `render.yaml` indentation & service key alignment | Parsing failure risk | Fixed: proper indentation committed (2025-09-27) |
| ✅ | Backend `rootDir` mismatch | Build failure | Set to `rootDir: .` so root scripts run |
| ✅ | Minimal env var scaffolding | Startup abort without placeholders | `.env.render.api` & `.env.render.app` created (placeholders) |
| ✅ | Gitignored Render env helper files absent | Slower manual entry | Added helper files + documented sync scripts |
| 📝 | Health check path alias `/health` vs `/api/health` | Non-blocking | Alias retained; may standardize later |
| 📝 | SPA fallback rewrite not codified | Deep link 404s | Added doc: /* → /index.html manual dashboard config |

Test Deployment Ready: ✅ (Proceed to create services from blueprint and sync placeholder env values; expect OAuth to fail gracefully until real credentials supplied.)

---
## Section 1: Security & Compliance
| Status | Item | Verification / Action |
|--------|------|-----------------------|
| ✅ | OAuth Authorization Code + PKCE implemented | `/api/auth/google` & callback with state + PKCE cookies |
| ✅ | ID token signature & iss/aud validation | JWKS fetch + `jwt.verify` in server |
| ✅ | Minimal scopes only (openid email profile calendar) | `CONFIG.GOOGLE_SCOPE` default examined |
| ✅ | CSRF protection active | `/api/auth/csrf-token` + HMAC sid check on mutating logout |
| ✅ | CORS allow‑list enforced | Dynamic origin set from `FRONTEND_BASE_URL` + additional list |
| ✅ | Security headers & CSP toggles | Strict vs relaxed branch in middleware |
| ✅ | HTTPS redirect (ENFORCE_HTTPS flag) implemented | Middleware checks `x-forwarded-proto` |
| ✅ | HSTS scaffold | Header set when HSTS_ENABLED && (prod or enforce https) |
| ✅ | Refresh token encryption (AES‑256‑GCM + key version) | `encrypt/decrypt` helpers with fingerprint prefixes |
| ✅ | Session idle/absolute/rotation policy | Values from env; rotation logged |
| ✅ | Token refresh (skew + explicit endpoint) | Automatic in `ensureSession`; manual `/api/auth/refresh` |
| ✅ | Secret strength & placeholder rejection | Zod + validation in `env.js` |
| ✅ | Production flag verifier script present | `verify-prod-flags.js` used in CI |
| ✅ | Safe config logging + commit SHA | `[config] ...` + `[build] commit_sha` on startup |
| ✅ | Multi-IP anomaly detection | `session.ipSet` threshold >3 triggers audit |
| ✅ | Admin session invalidation endpoint | `/api/admin/sessions/invalidate` (API key protected) |
| ✅ | Deletion request endpoints (create/process) | `/api/account/delete-request`, admin process route |
| ✅ | Calendar events CRUD with retry/backoff | `/api/calendar/events*` using gApi wrapper |
| ✅ | Audit logging with PII minimization | Redacts email unless `ALLOW_PII_LOGGING=true` |
| ⚠️ | Enforce Redis-backed session store only | Ensure prod Redis provisioned; remove any emergency override usage |
| ⚠️ | Distributed rate limiting (Redis) | Replace in-memory token buckets with Redis atomic ops (SET + LUA or INCR + TTL) |
| ⚠️ | Persist legal acceptance to DB | Add columns update (already present? ensure values stored on accept) |
| ⚠️ | Persist user configuration & preferences | Implement CRUD endpoints + migrations extension |
| ⚠️ | Central log aggregation & retention policy | Select provider (Logtail/Datadog/ELK); document retention (>=30d) |
| ⚠️ | Support/contact email functional | Verify `SUPPORT_CONTACT_EMAIL` inbox + link in UI footer |
| ⚠️ | Privacy & Terms URLs deployed & referenced in consent screen | Host static pages + set in Google console |
| ⚠️ | Data deletion actual purge/anonymization | Implement scheduled job or immediate purge of rows + tokens |
| ⚠️ | Staging vs production OAuth clients separated | Create prod client; remove localhost/test origins from prod |
| ⚠️ | HSTS enabled post domain verification | Toggle HSTS_ENABLED=true after DNS + TLS stable |
| ⚠️ | PII logging policy review | Confirm redaction logic vs operational needs |
| ⚠️ | DPA / PHI scope evaluation | Document “No PHI / medical data stored” if applicable |
| 📝 | CSP report-only endpoint & aggregation | Add `/csp-report` route & report-to header |
| 📝 | Key rotation runbook | Document rotation playbook & test in staging |
| 📝 | Geo/IP heuristic enrichment | (Optional) Add geo lookup for anomaly events |

## Section 2: Core Application Functionality
| Status | Item | Action |
|--------|------|--------|
| ✅ | Calendar list & events CRUD | Implemented with retries |
| ⚠️ | Time zone persistence | Store user tz in config table; adjust API responses |
| ⚠️ | Graceful upstream (Google) error mapping | Map status codes → user friendly codes JSON |
| ⚠️ | Revoked scope handling | Detect 401 insufficient permissions → instruct re-auth |
| 📝 | Recurring events support | Document limitation if deferred |
| 📝 | Idempotency keys for event mutations | Accept `Idempotency-Key` header + Redis guard |
| 📝 | Conflict detection (etag/updated) | Compare remote updated timestamp before PUT |
| ⚠️ | n8n workflow validation test | Add integration test harness |
| ⚠️ | Persist user configuration (availability, buffers) | Add endpoints + UI forms |
| 📝 | Circuit breaker/backoff wrapper | Wrap gApi with failure counters |
| 📝 | Signed inbound webhooks (future) | HMAC signature verification |

## Section 3: Localization & Content
| Status | Item | Action |
|--------|------|--------|
| ✅ | ES default / EN optional | Present |
| ⚠️ | Persist language preference | Store in user_config or cookie |
| ⚠️ | Externalize backend surfaced messages | Move to i18n map |
| ⚠️ | Translate system & rate limit responses | Add keys to locales |
| ⚠️ | Language switch everywhere (including legal) | Audit UI shells |
| 📝 | Localized meta/OG tags | Add per route |

## Section 4: UX & Accessibility
| Status | Item | Action |
|--------|------|--------|
| ✅ | Skip-to-content link | Implemented |
| ⚠️ | Keyboard focus states consistent | Tailwind focus ring pass |
| ⚠️ | Responsive layout audit | Mobile + tablet QA |
| ⚠️ | Favicon & OG metadata | Add assets + `<meta>` tags |
| ⚠️ | Consistent footer/navigation & support link | Include contact + legal links |
| 📝 | Skeleton/loading states | Improve perceived latency |
| 📝 | Onboarding checklist | Post-login guidance |
| 📝 | Accessibility heading/ARIA audit | Document findings |

## Section 5: Deployment & Infrastructure (Render)
| Status | Item | Verification / Action |
|--------|------|-----------------------|
| ✅ | Backend listens on `process.env.PORT` | `app.listen(port)` logic uses PORT fallback |
| ✅ | Frontend build pipeline outputs `testapp/dist` | Vite build in CI + scripts |
| ✅ | Health endpoints `/api/health` & `/health` | JSON status + dependency gating |
| ✅ | PostgreSQL connectivity test on startup | `testDbConnection()` call logs result |
| ✅ | Commit SHA logged | Added execSync rev-parse short hash |
| ✅ | CI verifies security flags pre-deploy | `verify-prod-flags.js` step |
| ✅ | Rollback & env sync scripts | `rollback.js`, `set-env-from-file.js` documented |
| ✅ | Redis usage abstraction present | Session & rate limit helpers (needs enforcement) |
| ⚠️ | Redis production instance provisioned | Provision & set REDIS_URL (Starter/Standard) |
| ⚠️ | Distributed rate limiting via Redis | Replace Map buckets with atomic operations |
| ⚠️ | JSON structured logs (no ANSI) in prod | Switch Morgan/console to plain / add flag |
| ⚠️ | Domain + TLS + HSTS rollout | Add custom domain, test redirects, enable HSTS |
| ⚠️ | Staging vs production env separation | Distinct OAuth creds + staging CSP_STRICT=false |
| ⚠️ | Central log sink configured | Forward webhook or agent (Datadog/Logtail) |
| ⚠️ | Support email displayed in UI footer | Add to frontend layout |
| ⚠️ | Render health check path set to `/api/health` | Confirm blueprint & dashboard settings |
| 📝 | Manual approval gate in CI | Add environment protection rule |
| 📝 | Preview (PR) environments | Optional for feature QA |

## Section 6: Testing & QA
| Status | Item | Action / Notes |
|--------|------|----------------|
| ⚠️ | Integration: OAuth login flow | Headless browser test (Playwright) |
| ⚠️ | Integration: Calendar event lifecycle | Create/read/update/delete test harness |
| ⚠️ | Unit: session lifecycle edge cases | Idle, absolute, rotation coverage |
| ⚠️ | Unit: encryption/rotation | Decrypt with previous key path |
| ⚠️ | Unit: rate limiting | Refill timing, burst exhaustion, Redis path |
| ⚠️ | Unit: CSRF middleware | Valid vs missing vs invalid token |
| ⚠️ | Unit: localization keys presence | Detect missing translations |
| ⚠️ | Vulnerability scan in CI | Add `npm audit --production` / Snyk step |
| ⚠️ | Pre-deploy script asserts commit SHA & flags | Extend or reuse existing scripts |
| 📝 | Load test (baseline) | k6 or autocannon scenario |
| 📝 | Pen test checklist | Manual header & injection audit |

## Section 7: Data Protection / Privacy
| Status | Item | Action |
|--------|------|--------|
| ✅ | Deletion request capture | Table + endpoints exist |
| ⚠️ | Actual data purge / anonymization process | Implement deletion job + audit record |
| ⚠️ | Support response SLA defined | Document (e.g. <5 business days) |
| ⚠️ | Policy version acceptance persisted | Write acceptance to users table columns |
| ⚠️ | Log retention + purge policy | Document (e.g. 30d app logs) |
| 📝 | Data export (user self-service) | Future capability |

## Section 8: Immediate Blockers (Must Resolve Before Public Launch)
1. Provision & enforce Redis session store (remove any in-memory allowance) and implement Redis-backed distributed rate limiting.
2. Persist legal acceptance + user configuration to Postgres (and migrate existing sessions if needed).
3. Staging vs production OAuth separation, finalize consent screen (logo, support email, privacy & terms URLs live).
4. Centralized log aggregation + retention policy finalized; verify PII redaction.
5. Domain + TLS + enable HSTS after verification.
6. Integration tests (OAuth & calendar CRUD) + core unit tests (session, encryption, CSRF, rate limit) in CI.
7. Implement actual deletion purge/anonymization and document SLA + retention policies.
8. Add support/contact email to UI footer + verify inbox deliverability.
9. Time zone + revoked scope handling + graceful Google error mapping.
10. Complete distributed rate limiting & review security flag values in production environment.

## Section 9: Optional / Post-Launch
Non-blocking improvement backlog: CSP report endpoint, key rotation runbook, advanced observability (tracing/metrics), recurring events, conflict detection, idempotency keys, webhook signing, PR preview envs, skeleton states, onboarding UX, load & pen tests, data export, geo anomaly enrichment.

Generated: 2025-09-27

