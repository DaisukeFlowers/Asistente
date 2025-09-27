# Schedulink Production Launch Checklist (Render)

Status legend: [ ] Pending · [~] In Progress / Partial · [x] Done · [!] Critical Blocker

## 1. Compliance & Security (Highest Priority)
- [x] OAuth Authorization Code with PKCE (S256) implemented
- [x] State parameter validation
- [x] ID token signature verification via Google JWKS
- [x] Limited scopes (openid, email, profile, calendar)
- [x] Confirm official Google Identity branding/button usage in UI
- [~] Session store: in-memory (replace with Redis in production for persistence & scaling)
- [x] Enforce Redis in production (guard added; test & verified)
	- Verified: starting with NODE_ENV=production and no REDIS_URL aborts with explicit error
	- Verified: providing REDIS_URL proceeds (logs connection errors if Redis unreachable, which is acceptable for startup but should be monitored)
- [x] Document re-auth/token refresh flow (graceful refresh vs forced login)
 	- Implemented automatic proactive refresh inside ensureSession when remaining lifetime < ACCESS_TOKEN_REFRESH_SKEW_SECONDS (default 60s)
 	- Added /api/auth/refresh endpoint for explicit client-initiated refresh
 	- On invalid_grant (revoked/expired refresh token) session is terminated & client receives re_auth_required to force clean login
 	- Audit events: token_refresh_success / token_refresh_failed / token_refresh_forced_success / token_refresh_forced_failed
 	- Configurable skew: ACCESS_TOKEN_REFRESH_SKEW_SECONDS env var
- [x] Refresh token encryption (AES-256-GCM) + key rotation support
- [x] Session idle + absolute timeouts & rotation
- [ ] Add manual session invalidation endpoint (security incident response)
- [ ] Anomalous session pattern detection (geo/IP variance)
- [x] CSRF protection for POST routes
- [x] CORS allow-list enforced (FRONTEND_BASE_URL + explicit origins)
- [x] Rate limiting (auth vs general buckets)
- [ ] Redis-backed distributed rate limiting (horizontal scale)
- [x] Security headers (CSP, X-Frame-Options, etc.)
- [x] Optional HSTS (enabled when prod HTTPS stable)
- [ ] CSP report endpoint (violation telemetry)
- [ ] Ensure ENFORCE_HTTPS=true in production environment
- [x] Structured audit logging (JSON events)
- [ ] Central log aggregation / retention policy
- [ ] PII minimization pass on logs (remove any non-essential fields)
- [ ] Build provenance: log commit SHA on startup
- [x] Secret validation & fingerprinting
- [ ] Disable PRINT_SECRET_FINGERPRINTS in production
- [ ] Add rotation runbook examples to docs
- [x] Bilingual Privacy Policy draft with version/date
- [x] Bilingual Terms of Service draft with version/date
- [x] Replace all legal placeholders with counsel-approved text
 - [x] Build gate added to fail if placeholders remain (scripts/check-legal.js)
 - [x] Add controller (legal entity) identification section (baseline filled)
 - [x] Add policy change notification mechanism (initial indicator; suppressed on baseline final pages)
 - [~] Version acceptance tracking (session-based; needs persistent user storage later)
- [ ] Ensure support/contact email is live (replace placeholder domain)
- [ ] Evaluate need for DPA / disclaim PHI if out of scope
- [ ] Data deletion request channel + documented SLA

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
