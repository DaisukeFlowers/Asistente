# Schedulink Production Launch Checklist (Render)

Status Legend:
- ✅ Complete (meets production requirement)
- ⚠️ Pending / Required before launch
- 📝 Optional / Nice-to-have (not launch‑blocking)

This document is the authoritative Go/No‑Go gate. Update the Generated date at bottom on each revision.

Key File References:
- Backend config schema: `backend/config/env.js`
- Env example: `.env.example`
- Render blueprint: `render.yaml`
- CI workflow: `.github/workflows/deploy.yml`
- Security flag verifier: `scripts/verify-prod-flags.js`
- Env sync tool: `scripts/render/set-env-from-file.js`
- Rollback tool: `scripts/render/rollback.js`
- Deploy docs: `docs/render-cli.md`

---

## 1. Compliance & Security (Highest Priority)
| Status | Item | Notes / Action |
|--------|------|----------------|
| ✅ | OAuth Authorization Code + PKCE | Implemented; see `backend/server.js` routes `/api/auth/google*` |
| ✅ | State parameter validation | Stored in short-lived cookie; verified on callback |
| ✅ | ID token signature verification | JWKS fetch & verify implemented (see server) |
| ✅ | Limited scopes | `GOOGLE_SCOPE` restricts scopes |
| ✅ | Google branding compliance | UI uses correct button (manual visual audit) |
| ⚠️ | Session store externalized (Redis) | In-memory only; requires Redis integration for prod resilience |
| ✅ | Redis required in prod (guard) | `env.js` aborts without REDIS_URL when prod/staging |
| ✅ | Token refresh logic | Proactive + `/api/auth/refresh` endpoint (audit events) |
| ✅ | Refresh token encryption & rotation scaffolding | AES-256-GCM + previous key support |
| ✅ | Session idle / absolute / rotation | Config vars: SESSION_* |
| ⚠️ | Manual session invalidation endpoint | Add admin/API route to kill session by ID/token |
| ⚠️ | Anomalous session detection | Add geo/IP fingerprint & heuristic logging |
| ✅ | CSRF protection | Double submit/HMAC implemented (verify middleware) |
| ✅ | CORS allow-list | Based on FRONTEND_BASE_URL + list; enforced in middleware |
| ✅ | Basic rate limiting | In-memory buckets implemented |
| ⚠️ | Distributed rate limiting | Implement Redis-backed counters (horizontal scale) |
| ✅ | Security headers | CSP/HSTS (toggle), X-Frame-Options, etc. |
| 📝 | CSP report endpoint | Add `/csp-report` + reporting-uri directive |
| ⚠️ | ENFORCE_HTTPS=true in prod | Enforced by verifier; ensure Render env variable set |
| ⚠️ | PRINT_SECRET_FINGERPRINTS=false in prod | Confirm production environment value; script verifies but env must set |
| ⚠️ | HSTS_ENABLED true (after domain verified) | Enable post TLS + domain cutover |
| ⚠️ | Central log aggregation | Choose stack (e.g. Render logs → Logtail/Datadog) |
| ⚠️ | PII minimization in logs | Review current audit payloads; redact emails if not required |
| ⚠️ | Commit SHA logging | Inject via env or read `git rev-parse HEAD` at startup |
| 📝 | Rotation runbook in docs | Document key rotation flow & staging rehearsal |
| ✅ | Secret validation (strength & placeholder rejection) | In `env.js` |
| ✅ | Legal documents (Privacy/Terms) | Placeholders removed; versioned |
| ⚠️ | Version acceptance persistence | Needs DB or durable store |
| ⚠️ | Support/contact email live | Replace placeholder; verify deliverability |
| ⚠️ | DPA / PHI scope evaluation | Determine if needed; add statement if out-of-scope |
| ⚠️ | Data deletion request channel + SLA | Add policy section + endpoint/workflow |

## 2. Core Functionality
| Status | Item | Notes / Action |
|--------|------|----------------|
| ⚠️ | Calendar CRUD (create/update/delete) | Only list implemented; expand API |
| 📝 | Recurring events support | Document limitations if deferred |
| ⚠️ | Time zone preference handling | Persist user TZ; normalize scheduling |
| 📝 | Idempotency for event creation/update | Use idempotency-key header (nanoid) |
| 📝 | Conflict detection | Use etag/updated timestamp vs stored version |
| ⚠️ | Graceful Google error mapping | Map 4xx/5xx to user-friendly errors |
| ⚠️ | Retry/backoff for transient Google errors | Exponential backoff wrapper |
| ⚠️ | n8n webhook workflow validation | Add integration test verifying token usage |
| 📝 | Signed inbound webhooks | HMAC signature if external callbacks added |
| ⚠️ | n8n docs & env var list | Extend README / render-cli docs |
| 📝 | Config UI (hours/buffer/reminders) | Frontend forms + backend persistence |
| ⚠️ | Persist user configuration | Add Postgres schema / key-value store |
| 📝 | Validation rules for settings | Enforce numeric ranges, overlap rules |
| ⚠️ | Availability preview UI | Needed for scheduling clarity |
| ⚠️ | Revoked scope handling | Detect API 401/insufficient permissions → re-auth prompt |
| 📝 | Circuit breaker/backoff upstream | Protect against cascading failures |

## 3. Content & Localization
| Status | Item | Notes |
|--------|------|------|
| ✅ | Spanish default / English optional | Implemented |
| ⚠️ | Persist language preference | Cookie or user profile field |
| ⚠️ | Audit for remaining English strings | Extraction pass needed |
| ⚠️ | Externalize backend user-facing errors | Map to i18n keys |
| ⚠️ | Language switch universal presence | Ensure on all pages (legal included) |
| 📝 | Localized meta/title tags | Add per-route metadata |
| ⚠️ | Translate system & rate-limit responses | i18n JSON entries required |

## 4. Design & UX
| Status | Item | Notes |
|--------|------|------|
| 📝 | Finalize brand palette & contrast audit | WCAG AA validation |
| ⚠️ | Keyboard focus visibility | Add focus ring utilities |
| ✅ | Skip-to-content link | Present |
| ⚠️ | Heading hierarchy & ARIA landmarks | Audit semantics |
| ⚠️ | Mobile responsive pass | Validate layouts on small screens |
| 📝 | Empty states | Add placeholders for no events/config |
| 📝 | Loading/skeleton states | Improve perceived performance |
| 📝 | Onboarding checklist | Persist completion state later |
| ⚠️ | Favicon & Open Graph metadata | Add to `testapp/index.html` & meta tags |
| ⚠️ | Consistent footer/navigation across locales | Unify layout component |

## 5. Deployment on Render
| Status | Item | Notes |
|--------|------|------|
| ✅ | Deployment model decided | Separate static + API (fallback unified) |
| ✅ | Frontend build pipeline | `build` script; verified dist output |
| ✅ | Static asset serving (unified mode) | SPA fallback + cache headers |
| ✅ | Health endpoints `/api/health` & `/health` | Implemented & documented |
| ✅ | Required core env vars set | Verified by `scripts/verify-env.js` |
| ⚠️ | ENFORCE_HTTPS/CSP_STRICT/PRINT_SECRET_FINGERPRINTS prod values | Ensure environment values set (verifier & CI flag check) |
| ⚠️ | Staging vs production separation | Distinct OAuth creds & relaxed CSP staging |
| ⚠️ | JSON log format (no ANSI) | Confirm run-time output & disable color in prod |
| ⚠️ | Domain + TLS + HSTS enablement | After custom domain binding |
| 📝 | Manual approval gate in CI | Add environment protection rule |
| ✅ | Rollback tooling | `rollback.js` (branch-based) + docs |
| ✅ | NPM cache strategy | actions/cache implemented |
| ⚠️ | Plan upgrades (Starter / Redis / Postgres) | Provision managed services |
| ⚠️ | Managed Redis for sessions & rate limit | Required for persistence & scale |
| ⚠️ | Postgres for user config persistence | Needed for preferences/version acceptance |
| ⚠️ | Update env vars list to include security flags | Ensure Render dashboard includes ENFORCE_HTTPS etc. |
| ⚠️ | Confirm health check path configured in Render | Should point to `/api/health` |
| 📝 | PR preview environments | Optional enhancement |
| ⚠️ | Commit SHA logging on startup | Append to safe config log |

## 6. Testing & QA
| Status | Item | Notes |
|--------|------|------|
| ⚠️ | Integration test: OAuth round-trip | Use Playwright/Cypress headless flow |
| ⚠️ | Integration test: Calendar CRUD | After CRUD endpoints implemented |
| ⚠️ | Test revoked scope re-auth | Simulate revocation then API call |
| ⚠️ | Unit: session management | Cover idle/absolute/rotation edge cases |
| ⚠️ | Unit: encryption & key rotation | Decrypt with previous key path |
| ⚠️ | Unit: rate limiter edge cases | Burst exhaustion / refill timing |
| ⚠️ | Unit: CSRF middleware | Valid/missing/invalid token cases |
| ⚠️ | Localization key coverage test | Ensure no missing translations |
| ⚠️ | Vulnerability scan in CI | Add `npm audit --production` / Snyk step |
| 📝 | Basic load test | k6 or autocannon scenario |
| 📝 | Pen test checklist | Manual / 3rd party pass |
| ⚠️ | Pre-deploy script prints commit SHA | Extend verify script or startup log |
| ✅ | GitHub Actions CI: lint + test + build | Implemented workflow with caching |

## 7. Future Expansion (Lower Priority)
(Unchanged; reference for roadmap — treat all as 📝 unless escalated.)

## 8. Immediate Action Summary (Go/No-Go Blockers)
The following ⚠️ items are mandatory before production launch:
1. Redis integration for sessions + distributed rate limiting.
2. Enable and verify production security flags (ENFORCE_HTTPS, CSP_STRICT, PRINT_SECRET_FINGERPRINTS=false, HSTS_ENABLED once domain live).
3. Manual session invalidation endpoint.
4. Calendar CRUD + error handling & retry/backoff.
5. Commit SHA logging & PII minimization review.
6. Staging environment with distinct OAuth credentials.
7. Centralized log aggregation target & retention policy.
8. Support/contact email + data deletion request channel.
9. Integration tests (OAuth + initial CRUD) & critical unit tests (sessions, encryption, CSRF, rate limit).
10. Domain/TLS configuration & confirm health check path on Render.

## 9. Optional / Post-Launch Priorities (📝)
- CSP report endpoint, webhook signing, advanced observability, feature flags, PR previews, load & pen tests, onboarding polish, UI accessibility refinements.

---
Generated: 2025-09-27 (update this date when checklist status changes).

## 2. Core Functionality
- [~] Calendar API: only list implemented; add CRUD (create/update/delete events)
- [ ] Support recurring events (document limitations if skipped)
- [ ] Time zone preference handling & conversion
- [ ] Idempotency keys for event creation/update
- [ ] Conflict detection on update (etag or lastModified comparison)
- [ ] Graceful Google API error mapping (user-friendly messages)
- [ ] Retry/backoff for transient Google errors
- [~] n8n webhook forward working (validate workflows consume tokens correctly)
- [ ] Signed callbacks or secret validation for inbound n8n/webhooks (if added)
- [ ] Document n8n workflow expectations and env vars
- [ ] Configuration UI: business hours
- [ ] Configuration UI: buffer times
- [ ] Configuration UI: reminder offsets
- [ ] Persist user configuration (DB schema or key-value store)
- [ ] Validation rules for schedule settings (no overlap, valid ranges)
- [ ] Availability preview UI
- [ ] Graceful handling of revoked Google scope mid-session (re-auth prompt)
- [ ] Circuit breaker / temporary backoff for upstream rate limiting

## 3. Content & Localization
- [x] Spanish default / English optional
- [ ] Persist language preference across sessions (cookie or server side)
- [ ] Audit for remaining hard-coded English strings
- [ ] Externalize backend error messages into translation keys (where exposed to UI)
- [ ] Language switch presence on all pages (verify legal pages)
- [ ] Localized meta/title tags per route
- [ ] Translate system error & rate limit responses surfaced to UI

## 4. Design & UX
- [~] Modern Tailwind styling; finalize brand palette & contrast audit (WCAG AA)
- [ ] Keyboard focus visibility for all interactive elements
- [x] Add skip-to-content link for accessibility
- [ ] Verify heading hierarchy & ARIA landmarks
- [ ] Mobile responsive pass (dashboard, legal pages, long lists)
- [ ] Empty states (no events/config yet)
- [ ] Loading/skeleton states for session fetch & calendar operations
- [~] Onboarding checklist after first login (client-side placeholder)
- [ ] Favicon & Open Graph / social preview metadata
- [ ] Consistent footer/navigation across locales

## 5. Deployment on Render
 - [x] Decide deployment model (serve frontend from backend or separate static site)
 	- Default decision: Separate Static Site on Render for CDN + cache efficiency
 	- Fallback unified mode supported via SERVE_STATIC=true (serves ../testapp/dist with SPA fallback)
 	- STATIC_ROOT override supported; index.html set no-cache; other assets cache 1h
 	- Render config: Web Service runs API only; Static Site handles frontend (/* -> index.html)
- [x] Production build pipeline (npm ci && npm run build for frontend) before start
 	- Root build script executes Vite build (testapp/dist produced)
 	- prestart hook verify:frontend-build ensures dist exists; auto-build if SERVE_STATIC=true and missing
 	- Verified: npm start (SERVE_STATIC=true) performed verification and launched API
 	- Follow-up (optional): add "type": "module" at root to remove Node ESM warning
- [x] Serve built assets (if unified service) or configure static site fallback routing
 	- Unified mode: SERVE_STATIC=true serves testapp/dist (verified root / and /dashboard return index.html)
 	- SPA fallback implemented (non-/api paths -> index.html)
 	- index.html Cache-Control: no-cache (via explicit header logic); static assets 1h cache
 	- Separate static site path: configure Render Static Site fallback /* -> /index.html (documentation pending)
- [x] Health endpoint /api/health
 - [x] Configure Render health check path & alerting
 	- /api/health returns 200 (ok:true) or 503 when Redis required but disconnected
 	- Includes uptime, timestamp, redis status (required/connected/lastError)
 	- Validation: scenarios tested (no Redis required vs required & unreachable => 503)
 	- Render setup: set health check path to /api/health; alert policy: 2 consecutive failures (degrade) / 5 (critical)
 	- Optional override ALLOW_HEALTH_PASS_WITHOUT_REDIS for maintenance windows
- [x] Set required env vars in Render (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SECRET_KEY, REFRESH_TOKEN_ENCRYPTION_KEY, FRONTEND_BASE_URL, N8N_WEBHOOK_URL)
 	- Added scripts/verify-env.js executed in prestart (fails fast on missing/placeholder)
 	- Validates length of SECRET_KEY & REFRESH_TOKEN_ENCRYPTION_KEY (>=32)
 	- Tested: missing vars => startup blocked; populated vars => startup succeeds
 	- Placeholder patterns (dummy/changeme/placeholder/insecure) rejected
 	- Render action: add all variables in dashboard + mark SECRET_KEY separate from REFRESH_TOKEN_ENCRYPTION_KEY
- [ ] ENFORCE_HTTPS=true, CSP_STRICT=true, PRINT_SECRET_FINGERPRINTS=false (prod)
- [ ] Add environment separation (staging vs production) with distinct OAuth credentials
- [ ] Logging: ensure JSON uncolored output in production
- [ ] Domain + TLS configuration (custom domain, HSTS after validation)
- [ ] Automated deployment workflow with manual approval gate
- [ ] Rollback procedure documented (tags/releases)
- [ ] .npmrc or caching strategy for faster builds
 - [x] Render Web Service: Node.js LTS (build: "npm ci && npm run build"; start: "npm run start")
 	- Root scripts added (build delegates to testapp build; start runs backend/server.js)
 	- Successful local production build validated (vite output in testapp/dist)
 	- Add "type": "module" root consideration (warning observed) – optional follow-up
 - [ ] Render Plan: Use Starter plan for production web service (avoid free tier for OAuth)
 - [ ] Managed Redis (Standard plan) for session persistence & distributed rate limiting
 - [ ] Static Site (if frontend separated) with fallback routing (/* -> index.html)
 - [ ] Postgres (Starter plan) for user configuration persistence
 - [ ] Configure env vars on Render (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, SECRET_KEY, REFRESH_TOKEN_ENCRYPTION_KEY, FRONTEND_BASE_URL, N8N_WEBHOOK_URL, ENFORCE_HTTPS, CSP_STRICT, PRINT_SECRET_FINGERPRINTS)
 - [ ] Render health check path set to /api/health with alerting thresholds
 - [ ] Custom domain + TLS (Let's Encrypt) configured; enable HSTS post validation
 - [ ] JSON log format confirmed (no ANSI colors) in Render environment
 - [ ] GitHub repo connected with auto deploy on main branch
 - [ ] Rollback procedure executable (tags/releases) – verify Render rollback steps
 - [ ] PR preview environments enabled (optional)

## 6. Testing & QA
- [ ] Integration test: OAuth round-trip (Playwright/Cypress)
- [ ] Integration test: Calendar CRUD (mock or sandbox project)
- [ ] Test: revoked scope triggers re-auth flow
- [ ] Unit: session management (idle/absolute/rotation)
- [ ] Unit: encryption & key rotation decrypt path
- [ ] Unit: rate limiter edge cases
- [ ] Unit: CSRF middleware (valid / missing / invalid token)
- [ ] Localization key coverage test (no missing keys ES/EN)
- [ ] Vulnerability scan (npm audit / Snyk) integrated into CI
- [ ] Basic load test (auth + calendar endpoints)
- [ ] Pen test checklist execution (headers, redirects, error disclosure)
- [ ] Pre-deploy script verifies env + builds + prints commit SHA
- [ ] GitHub Actions CI: lint + test + build

## 7. Future Expansion (Lower Priority)
- [ ] Redis/Postgres session & config persistence
- [ ] Feature flags framework
- [ ] WhatsApp integration (Meta Cloud API scaffolding)
- [ ] Telegram / SMS channel placeholders
- [ ] Webhook event ingestion & signature validation
- [ ] Background job queue (BullMQ / worker dyno)
- [ ] Observability stack (tracing + metrics)
- [ ] Data export & deletion API
- [ ] Admin support panel with audit controls
- [ ] Policy version changelog (public)

## 8. Execution Order (Recommended)
1. Finalize legal + replace placeholders (critical blocker)
2. Externalize sessions & rate limiting (Redis), enforce HTTPS, tighten prod env flags
3. Implement calendar CRUD + config UI (core value prop)
4. Build out tests & CI pipeline
5. Deployment hardening (logging, rollback, staging separation)
6. Localization persistence & accessibility polish
7. n8n workflow robustness & idempotency
8. Scale & observability enhancements

---
Generated: 2025-09-22 (update this date when checklist status changes).
