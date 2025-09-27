## Render CLI / API Automation

This repository includes Infrastructure-as-Code (render.yaml) plus helper scripts to manage deployments and environment variables without visiting the dashboard.

### Files
| Path | Purpose |
|------|---------|
| `render.yaml` | Blueprint defining the backend web service (`schedulink-api`) and frontend static site (`schedulink-app`). |
| `scripts/render/list-services.js` | Lists services (id, name, type) via Render API. |
| `scripts/render/deploy.js` | Triggers one or all service deploys. |
| `scripts/render/update-env.js` | Syncs environment variables from a local file to a service. |
| `scripts/render/helpers.js` | Shared API + env file utilities. |

### Prerequisites
1. Generate a Render API key: Dashboard → Account Settings → API Keys.
2. Export it locally (never commit):
```bash
export RENDER_API_KEY=xxxxxxxxxxxxxxxx
```
You can also use a `.env.development.local` file (source it before running scripts) but do **not** commit it.

### Blueprint Deployment
If the services do not exist yet, create them via the Render Dashboard once or (when supported) by applying the blueprint manually. Subsequent pushes + `autoDeploy: true` will redeploy automatically; use scripts for on-demand triggers.

### NPM Scripts
| Command | Description |
|---------|-------------|
| `npm run render:services` | List service IDs & names. |
| `npm run render:deploy` | Trigger deploy for all defined services. |
| `npm run render:deploy:api` | Deploy backend only. |
| `npm run render:deploy:app` | Deploy frontend only. |
| `npm run render:env:sync` | Sync env vars (from `.env.production.sync`) to backend service. |

### Environment Variable Sync
Create a file (excluded from git) named `.env.production.sync` containing key=value lines. Run:
```bash
npm run render:env:sync
```
Script behavior:
- Creates missing variables (unless you pass `--no-create` directly to the script).
- Updates values that differ.
- Leaves unspecified existing variables untouched.

Sensitive keys are never echoed; only key names are shown.

### Deployment Trigger
Trigger a backend-only deploy:
```bash
npm run render:deploy:api
```
All services:
```bash
npm run render:deploy
```

### Health Check
The backend service blueprint uses `/api/health` as `healthCheckPath`.

### Security Notes
- Do not store secrets in `render.yaml`; only placeholders or non-sensitive toggles.
- API key should only exist in your shell session or a secure secret manager.
- Consider adding a pre-deploy check that ensures production hardening flags (ENFORCE_HTTPS, CSP_STRICT) are true.

### Future Enhancements
- Add a diff mode to `update-env` that aborts if it would overwrite a value without a `--force` flag.
- Add a GitHub Action invoking these scripts for controlled deployments.
- Add service creation via blueprint apply (when API fully supports it).
