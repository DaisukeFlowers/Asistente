## Render Deployment CLI

This repository provides automation for managing Render services (backend & frontend) using the Render HTTP API instead of the dashboard.

### Overview
Components:
- `render.yaml` blueprint (two services: `schedulink-api` web, `schedulink-app` static).
- API wrapper `scripts/render/api.js`.
- CLI scripts for listing services, triggering deploys, syncing environment variables.

### Prerequisites
1. Create a Render API Key (Dashboard → Account Settings → API Keys).
2. Export it or place in a non-committed file:
```bash
export RENDER_API_KEY=xxxxxxxxxxxxxxxx
# or
source .env.deployment.local
```

### NPM Commands
| Command | Description |
|---------|-------------|
| `npm run render:list` | List service IDs, names, types. |
| `npm run render:deploy:api` | Trigger deploy for backend only. |
| `npm run render:deploy:app` | Trigger deploy for frontend only. |
| `npm run render:deploy` | Deploy all services. |
| `npm run render:env:api` | Sync env vars from `.env.render.api` to backend. |
| `npm run render:env:app` | Sync env vars from `.env.render.app` to frontend. |

### Environment Variable Sync
Create files `.env.render.api` and/or `.env.render.app` (gitignored) with `KEY=VALUE` lines.

Run:
```bash
RENDER_API_KEY=... npm run render:env:api
```
Behavior:
- Creates missing variables.
- Updates changed variables.
- Leaves others untouched.
- Redacts sensitive values in output.

### Deploying
Backend only:
```bash
RENDER_API_KEY=... npm run render:deploy:api
```
Frontend only:
```bash
RENDER_API_KEY=... npm run render:deploy:app
```
All services:
```bash
RENDER_API_KEY=... npm run render:deploy
```

### Finding Service IDs
Use:
```bash
RENDER_API_KEY=... npm run render:list
```
Outputs tab-delimited rows: `<id> <name> <type>`.

### Security Notes
- Never commit real tokens or secrets to git.
- Example file `.env.deployment.example` shows expected variables.
- Limit scope of the Render API Key in your account if granular scopes become available.

### Validation Checklist
- Backend listens on `process.env.PORT` (already implemented in server code).
- `render.yaml` paths: backend `rootDir: ASISTENTE` (update if backend folder differs), frontend `rootDir: testapp`, publish `dist`.
- Start command does not require dev dependencies beyond runtime.

### Future Improvements
- Add dry-run flag for env sync.
- Add GitHub Action using these scripts.
- Support service creation when Render exposes blueprint apply endpoint.
