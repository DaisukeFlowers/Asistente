## Render Blueprint & CLI Automation

Single source documentation for all Render-related automation (blueprint, local CLI, and GitHub Actions CI/CD).

### Services Overview
The blueprint `render.yaml` defines two services:
- `diyartec-api` (type: web, Node) – backend API (Express). Root directory is the repo root (`.`) for shared scripts.
- `diyartec-app` (type: static) – Vite React frontend in `testapp/`.

Rationale for backend `rootDir: .`:
### Deploy Button
Use the repository README Deploy to Render button for a one-click setup. After creation, immediately set env vars (placeholders from `.env.example`).

Previously scripts lived at the repository root (build aggregates frontend build verification). Setting `rootDir: backend` caused Render to execute build/start where those scripts were absent → failure. Adjusting to `.` unblocks minimal deployment. A future refactor could relocate scripts into `backend/` and revert `rootDir` if desired.

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
| `npm --prefix backend run lint` | Run backend ESLint. |
| `npm --prefix backend run test` | Run backend Jest tests. |

### Environment Variable Sync Workflow
1. Create gitignored files (already referenced in `.gitignore`):
	- `.env.render.api` (example placeholders created by tooling)
	- `.env.render.app`
2. Populate each with `KEY=VALUE` lines.
3. Dry-run review (after implementation of `--dry-run`):
```bash
RENDER_API_KEY=... node scripts/render/set-env-from-file.js --service diyartec-api --file .env.render.api --dry-run
```
4. Apply changes (npm script shorthand wraps the same tool):
```bash
RENDER_API_KEY=... npm run render:env:api
RENDER_API_KEY=... npm run render:env:app
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

### Backend Linting & Testing
Backend uses ESLint (recommended rules) and Jest for tests.
Run lint:
```bash
npm --prefix backend run lint
```
Auto-fix:
```bash
npm --prefix backend run lint:fix
```
Run tests:
```bash
npm --prefix backend test
```
Watch mode:
```bash
npm --prefix backend run test:watch
```

### Commit-Based Rollback
### PostgreSQL Configuration
Set `DATABASE_URL` in the Render dashboard (Backend Web Service → Environment) using the Internal URL provided by Render:

Internal (preferred inside same region network):
```
postgresql://schedulink_data_user:********@dpg-d3c3fammcj7s73d7rc9g-a/schedulink_data
```

Local development or external connections can use the external hostname variant (replace password):
```
postgresql://schedulink_data_user:replace_with_password@dpg-d3c3fammcj7s73d7rc9g-a.oregon-postgres.render.com/schedulink_data
```

Example placeholder added to `.env.example` (never commit real password). The backend will:
- Fail fast in production if `DATABASE_URL` missing.
- Log a safe message `Connected to PostgreSQL` on successful startup test.
- Expose DB status in `/api/health` (fields: `db.status` = ok|error).

Quick connectivity test locally:
```bash
DATABASE_URL=postgresql://... npm run db:test
```

Use the rollback script with a commit SHA to create and push a temporary branch and trigger a deploy:
```bash
RENDER_API_KEY=... node scripts/render/rollback.js --service diyartec-api --commit <commit-sha>
```
Behavior:
1. Verifies commit exists locally.
2. Creates `rollback-<sha>` branch (if missing) and pushes it.
3. Triggers a new deploy (latest code at that branch).
4. After verification, you can delete the branch:
```bash
git push origin :rollback-<sha>
```
If non-interactive or you want to skip confirmation: add `--force`.

Direct deploy of an arbitrary historical commit (without a branch) isn’t directly supported via current Render API; this branch strategy emulates rollback.

### Workflow Caching
CI uses `actions/cache@v3` for the global npm cache (`~/.npm`) keyed by all `package-lock.json` files. This speeds repeated installs while keeping deterministic builds via `npm ci`.

### Interactive Prune Confirmation
When using `--prune` without `--force` in a TTY session, you'll be prompted to confirm deletion of remote-only keys. Use `--force` for non-interactive (CI) pruning, or omit pruning entirely for safety.

### CI/CD (GitHub Actions)
A workflow at `.github/workflows/deploy.yml` deploys on pushes to `main` and on semver tags. It:
1. Checkout
2. Restore npm cache (global)
3. Install root, backend, frontend dependencies
4. Run backend ESLint + tests
5. Run frontend lint + build
6. Verify production security flags
7. Deploy backend then frontend (wait for completion)

#### Required GitHub Secrets
| Secret | Description |
|--------|-------------|
| `RENDER_API_KEY` | Render API key with deploy permissions. |
| `RENDER_SERVICE_ID_API` | Service ID for backend (`diyartec-api`). |
| `RENDER_SERVICE_ID_APP` | Service ID for frontend (`diyartec-app`). |

Add these under: Repository Settings → Secrets and variables → Actions.

### Security Best Practices
- Never commit secrets or tokens (only example placeholders).
- Rotate `RENDER_API_KEY` periodically and on contributor offboarding.
- Use least privilege (when Render offers scoped keys) and store secrets in GitHub Actions secrets manager.
- Validate production hardening flags (ENFORCEHTTPS, CSPSTRICT, PRINT_SECRET_FINGERPRINTS=false) in a pre-deploy step.
	- Implemented via `scripts/verify-prod-flags.js` in CI.

### Validation Checklist (Minimal Visibility Deploy)
- Backend listens on `process.env.PORT` (implemented).
- `render.yaml` backend `rootDir` set to `.` (intentional so root scripts run).
- Frontend build outputs `testapp/dist`.
- Health endpoint at `/health` (alias of `/api/health`) returns 200 when dependencies OK.
- Placeholder OAuth client values accepted by schema (login may fail gracefully until real credentials provided).

### SPA Fallback (Static Site)
For client-side routing (React Router, etc.), configure a fallback so deep links (e.g., `/dashboard`) resolve to `index.html` instead of 404.
In Render Dashboard → Static Site → Settings → Redirects / Rewrites add:

```
/*    /index.html    200
```

Future enhancement: This could be codified if/when Render adds blueprint-level SPA fallback configuration.
Until then, remember to re-add the rule if the static site is recreated.

### Future Enhancements
- Add `--force-remove` / diff-only mode for variables present remotely but absent locally.
- Integrate semantic release to tag + auto trigger deploys.
- Cache dependency installs in GitHub Actions for speed.
 - Replace backend lint/test placeholders with real ESLint config and Jest/Vitest suite.
 - Add coverage reporting & thresholds.
 - Multi-stage deploy (staging → production promotion).
 - Improve rollback to target a specific past deploy commit when API adds direct rollback endpoint.

### Quick Start Summary
```bash
export RENDER_API_KEY=xxxxx
npm run render:list
npm run render:deploy:api
node scripts/render/set-env-from-file.js --service diyartec-api --file .env.render.api --dry-run
npm run render:env:api
```

