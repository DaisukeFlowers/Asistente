# Diyartec Website – Backend & Frontend (Render Ready)

This repository contains the Diyartec API (Node/Express) and Diyartec React frontend (Vite). It evolved from the original Schedulink codebase and has been rebranded & hardened: new environment variable naming, /api/version endpoint, and CI/rotation scaffolding.

## 🚀 Key Features (Backend)

- Google OAuth Authorization Code + PKCE
- AES‑256‑GCM encrypted refresh tokens (key rotation path)
- Session idle/absolute timeout + rotation policy
- Calendar events CRUD (Google Calendar API) with retry/backoff
- Audit logging (PII‑minimized) & security headers (CSP/HSTS toggles)
- Health endpoints: `/api/health` and `/health`

## 🗂 Monorepo Layout

```
render.yaml            # Blueprint (backend + static frontend)
backend/               # Express server, config, middleware
testapp/               # Vite React frontend
scripts/render/        # Render automation (deploy, env sync, rollback)
.env.example           # Backend env template (placeholders)
testapp/.env.example   # Frontend env template (placeholders)
```

## 📋 Prerequisites

- Node.js 18+ (Render Node runtime currently >=18)
- (Optional) Redis + Postgres for production hardening
- Google Cloud project (OAuth consent + Calendar API)
- n8n workflow endpoint (optional integration)

## ⚡ Quick Start (Local Development)

```bash
git clone https://github.com/DaisukeFlowers/Asistente.git
cd Asistente
npm ci

# Backend env
cp .env.example .env.development.local
# Edit required values (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, FRONTEND_BASE_URL, SECRETKEY, REFRESHTOKENENCRYPTIONKEY)

# Frontend env (public vars only)
cp testapp/.env.example testapp/.env.development.local

# Run backend (port picked by env or default)
npm run start

# Run frontend in another shell
cd testapp && npm run dev
```

## 🌐 Deployment (Render)

### Option A – Deploy Button

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/DaisukeFlowers/Asistente)

1. Click the button.
2. In Render, review the two services (backend web + static site) from `render.yaml`.
3. Add required environment variables before first deploy completes (see `.env.example`).
4. Finish deploy; visit service URLs shown in dashboard.

### Option B – Render CLI
```bash
npm install -g @renderinc/cli
render login              # or export RENDER_API_KEY=...
render blueprint apply render.yaml --confirm

# Populate gitignored helper files with placeholders
cp .env.example .env.render.api
cp testapp/.env.example .env.render.app

# (Edit .env.render.* with actual values)
npm run render:env:api     # sync backend env vars
npm run render:env:app     # sync frontend env vars

# Deploy both services
npm run render:deploy
```

### Verification
```bash
curl -s https://<backend-service>.onrender.com/health | jq .
open https://<frontend-service>.onrender.com/
```
If you use client‑side routing in the frontend, add this rewrite in the static site settings: `/* -> /index.html (200)`.

## 🔐 Environment Strategy

Backend uses a centralized Zod schema (`backend/config/env.js`). Load order:
1. `.env.development.local` (if NODE_ENV=development)
2. Render / process environment for staging & production (no file load in prod)

Staging: set `NODE_ENV=staging`; requires full core variables (mirrors prod but allows relaxed CSP / fingerprints).

Never commit real secrets – only `.env.example` and `.env.staging.example` remain tracked.

## 📡 Core Backend Routes (Representative)
| Route | Purpose |
|-------|---------|
| `GET /api/health` | Liveness/readiness summary |
| `GET /api/version` | Build metadata (commit, version, flags) |
| `GET /api/auth/google` | Start OAuth flow |
| `GET /api/auth/google/callback` | OAuth callback (code→tokens) |
| `POST /api/auth/refresh` | Refresh access token using encrypted refresh token |
| `POST /api/logout` | Invalidate session |
| `GET /api/calendar/events` | List calendar events |
| `POST /api/calendar/events` | Create event |

## 🔄 High Level Auth Flow
1. User starts OAuth (PKCE verifier + state stored in cookies)
2. Google redirects back with code
3. Backend exchanges code → access & refresh tokens (refresh encrypted at rest)
4. Session established; rotation & idle timers enforced
5. Calendar operations call Google APIs (retry/backoff)
6. (Optional) n8n webhook receives token metadata

## 🧪 Basic Local Smoke Test
```bash
curl -s http://localhost:3000/api/health | jq .
curl -I http://localhost:3000/health
```

### Test Google OAuth

1. Login first using the above curl commands
2. Visit `http://localhost:5000/login` in your browser
3. Complete the Google OAuth flow
4. Check your n8n webhook for received tokens

## 🔧 Configuration Notes
- All required env vars enumerated in `.env.example`.
- Production/staging must explicitly provide strong secrets (>=32 chars length, prefer >=64 hex). (SECRETKEY, REFRESHTOKENENCRYPTIONKEY)
- Dev convenience: secrets auto-generate only in NODE_ENV=development (ephemeral, warned).

### Security Notes

- Authorization Code + PKCE; refresh tokens encrypted (AES-256-GCM) with key rotation support.
- Sessions rotate & enforce idle/absolute timeouts.
- CSP strict in production; staging may run relaxed (`CSPSTRICT=false`).
- HTTPS, HSTS enforced in production when TLS validated.

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the frontend URL is in the CORS origins list
2. **OAuth Redirect Mismatch**: Verify the redirect URI in Google Console matches exactly
3. **n8n Webhook Fails**: Check that your n8n instance is accessible and the webhook URL is correct
4. **Session Issues**: Ensure cookies are enabled and working properly

### Debug Mode

The app runs in debug mode by default. For production:

```python
app.run(debug=False, host='0.0.0.0')
```

## 📊 Data Flow (Simplified)
```
Browser -> Vite Frontend -> Express Backend -> Google OAuth -> Google Calendar API
                               ↓
                             n8n Webhook
```

## 🧹 Environment File Policy

Removed legacy templates: `.env.production.example`, `.env.original.example` (duplicated / outdated). Use `.env.example` (backend) + `testapp/.env.example` (frontend). Create per‑environment local overrides:

Backend:
```
.env.development.local
.env.staging.local (optional for local staging simulation)
# Production via Render dashboard only
```

Frontend (Vite – only public vars):
```
testapp/.env.development.local
testapp/.env.staging.local
```

All custom variables consumed by frontend must be prefixed `VITE_`.

Run `node scripts/print-effective-config.js` to inspect non-secret config (uses new flag names: ENFORCEHTTPS, CSPSTRICT, etc.).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support
Open an issue or create a discussion in the repository.
