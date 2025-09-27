## Render Blueprint & CLI Automation

Single source documentation for all Render-related automation (blueprint, local CLI, and GitHub Actions CI/CD).

### Services Overview
The blueprint `render.yaml` defines two services:
- `schedulink-api` (type: web, Node) – backend API (Express) located under `backend/`.
- `schedulink-app` (type: static) – Vite React frontend in `testapp/`.

### File Map
| Path | Purpose |
|------|---------|
| `render.yaml` | Infrastructure-as-Code blueprint for both services. |
| `scripts/render/api.js` | Low-level Render API wrapper. |
| `scripts/render/list-services.js` | List existing Render services (id, name, type). |
| `scripts/render/deploy.js` | Trigger deploy(s) by name or all. |
| `scripts/render/set-env-from-file.js` | Sync env vars from a local file (with optional dry-run). |
| `scripts/render/update-env.js` | Legacy env sync script (retained; prefer `set-env-from-file.js`). |
| `.env.deployment.example` | Example of local deployment-related variables (no secrets). |
| `.github/workflows/deploy.yml` | CI workflow to deploy on push/tag. |

### Prerequisites (Local CLI)
1. Create a Render API Key (Dashboard → Account Settings → API Keys).
2. Export it (preferred) or source a gitignored file:
```bash
export RENDER_API_KEY=xxxxxxxxxxxxxxxx
# or
source .env.deployment.local
```
3. (Optional) Capture service IDs once and store them locally (not committed).

### NPM Scripts
| Command | Description |
|---------|-------------|
| `npm run render:list` | List service IDs, names, types. |
| `npm run render:deploy:api` | Trigger backend deploy only. |
| `npm run render:deploy:app` | Trigger frontend deploy only. |
| `npm run render:deploy` | Deploy both services. |
| `npm run render:env:api` | Sync backend env vars from `.env.render.api`. |
| `npm run render:env:app` | Sync frontend env vars from `.env.render.app`. |
| `npm run render:rollback:api` | List recent backend deploys (add --deploy <id> to redeploy). |
| `npm run render:rollback:app` | List recent frontend deploys. |

### Environment Variable Sync Workflow
1. Create gitignored files:
	- `.env.render.api`
	- `.env.render.app`
2. Populate each with `KEY=VALUE` lines.
3. Dry-run review (after implementation of `--dry-run`):
```bash
RENDER_API_KEY=... node scripts/render/set-env-from-file.js --service schedulink-api --file .env.render.api --dry-run
```
4. Apply changes:
```bash
RENDER_API_KEY=... npm run render:env:api
```
Behavior:
- Creates missing vars (unless you pass `--no-create`).
- Updates differing values.
- Leaves unspecified vars untouched.
- Redacts sensitive values (matches SECRET|TOKEN|KEY|PASSWORD).

### Dry Run & Prune Details
When `--dry-run` is provided, the script outputs a categorized diff without modifying remote state:
- Adds: variables that would be created.
- Updates: old → new values (new redacted if sensitive).
- Unchanged: variables matching exactly.
If `--prune` is also provided, remote-only variables are listed under "Would remove". Add `--force` to actually delete them (without `--dry-run`).
Return code is 0 even if changes are pending (treat as advisory). Use tooling to flag non-empty diff if gating CI.

### Deploying from CLI
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
```bash
RENDER_API_KEY=... npm run render:list
```
Output columns: `<id>\t<name>\t<type>`.

### CI/CD (GitHub Actions)
A workflow at `.github/workflows/deploy.yml` deploys on pushes to `main` and on semver tags. It:
1. Checks out code
2. Installs dependencies (root + frontend)
3. Runs backend lint & tests (placeholders currently)
4. Runs frontend lint & build
5. Validates production security flags (`scripts/verify-prod-flags.js`)
6. Triggers backend & frontend Render deploys sequentially (waits for completion)

#### Required GitHub Secrets
| Secret | Description |
|--------|-------------|
| `RENDER_API_KEY` | Render API key with deploy permissions. |
| `RENDER_SERVICE_ID_API` | Service ID for backend (`schedulink-api`). |
| `RENDER_SERVICE_ID_APP` | Service ID for frontend (`schedulink-app`). |

Add these under: Repository Settings → Secrets and variables → Actions.

### Security Best Practices
- Never commit secrets or tokens (only example placeholders).
- Rotate `RENDER_API_KEY` periodically and on contributor offboarding.
- Use least privilege (when Render offers scoped keys) and store secrets in GitHub Actions secrets manager.
- Validate production hardening flags (ENFORCE_HTTPS, CSP_STRICT, PRINT_SECRET_FINGERPRINTS=false) in a pre-deploy step.
	- Implemented via `scripts/verify-prod-flags.js` in CI.

### Validation Checklist
- Backend listens on `process.env.PORT` (implemented).
- `render.yaml` backend `rootDir` matches actual backend folder (`backend/`).
- Frontend build outputs `testapp/dist`.
- Health endpoint at `/health` returns 200 (or 503 when dependencies missing) for Render health check.

### Future Enhancements
- Add `--force-remove` / diff-only mode for variables present remotely but absent locally.
- Integrate semantic release to tag + auto trigger deploys.
- Cache dependency installs in GitHub Actions for speed.
 - Replace backend lint/test placeholders with real ESLint config and Jest/Vitest suite.
 - Improve rollback to target a specific past deploy commit when API adds direct rollback endpoint.

### Quick Start Summary
```bash
export RENDER_API_KEY=xxxxx
npm run render:list
npm run render:deploy:api
node scripts/render/set-env-from-file.js --service schedulink-api --file .env.render.api --dry-run
npm run render:env:api
```

