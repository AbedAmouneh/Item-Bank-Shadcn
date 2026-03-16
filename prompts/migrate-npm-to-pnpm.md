# Migrate Package Manager: npm → pnpm

## Context

This is an Nx v22 monorepo (`@item-bank/source`) with the following structure:
- `apps/item-bank` — main React/Vite app
- `libs/ui`, `libs/auth`, `libs/questions`, `libs/profile`, `libs/i18n` — shared libraries
- Currently using **npm** (`package-lock.json` present, no `pnpm-lock.yaml`)
- Node version: check `.nvmrc` or `engines` field if present

The goal is to fully migrate to **pnpm** as the package manager, configure Nx to use it, and verify the workspace is healthy after migration.

---

## Prerequisites (verify before starting)

```bash
# Check pnpm is installed
pnpm --version

# If not installed:
npm install -g pnpm

# Check Node version (pnpm requires Node >= 18)
node --version
```

---

## Step 1 — Import the existing lockfile

pnpm can convert `package-lock.json` directly. Run at the repo root:

```bash
pnpm import
```

This generates `pnpm-lock.yaml` from the existing `package-lock.json`. Do **not** delete `package-lock.json` yet — keep it until the end as a rollback reference.

---

## Step 2 — Configure pnpm workspace

Create `pnpm-workspace.yaml` at the repo root:

```yaml
packages:
  - 'apps/*'
  - 'libs/*'
```

This tells pnpm which directories contain workspace packages. Nx will discover projects via `nx.json` as usual, but pnpm needs its own workspace config.

---

## Step 3 — Set `packageManager` field in `package.json`

Add the `packageManager` field to the root `package.json` so Node/Corepack and Nx both know which package manager to use:

```json
{
  "name": "@item-bank/source",
  "packageManager": "pnpm@10.x.x"
}
```

Replace `10.x.x` with the actual version from `pnpm --version`.

---

## Step 4 — Configure pnpm shamefully-hoist (important for Nx + Vite)

Create `.npmrc` at the repo root with the following content:

```ini
# Required for Nx + Vite + React to resolve peer deps correctly
shamefully-hoist=true

# Prevents phantom dependency issues in libs
strict-peer-dependencies=false

# Needed for some Nx plugins that expect flat node_modules
node-linker=hoisted
```

> **Why**: Vite, certain Nx plugins, and React peer deps rely on flat `node_modules` resolution. Without `shamefully-hoist=true`, you'll get "cannot find module" errors at build time for packages that are peers but not direct dependencies.

---

## Step 5 — Delete npm artifacts and reinstall

```bash
# Remove npm lockfile and node_modules
rm package-lock.json
rm -rf node_modules

# Remove any nested node_modules in libs/apps (shouldn't exist but clean up)
find . -name "node_modules" -not -path "*/.git/*" -prune -exec rm -rf {} + 2>/dev/null; true

# Clean Nx cache
rm -rf .nx/cache .nx/workspace-data

# Fresh install with pnpm
pnpm install
```

---

## Step 6 — Update `nx.json` to declare the package manager

Add the `packageManager` field to `nx.json`:

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "packageManager": "pnpm",
  ...
}
```

This is the field Nx v22 uses to pick the correct package manager for `nx add`, `nx generate`, etc.

---

## Step 7 — Update CI / scripts that call `npm`

Search for any hardcoded `npm install`, `npm run`, or `npm ci` references:

```bash
grep -rn "npm install\|npm run\|npm ci\|npm test\|npm build" --include="*.yml" --include="*.yaml" --include="*.sh" --include="*.json" .
```

Replace all occurrences:
- `npm install` → `pnpm install`
- `npm run <script>` → `pnpm <script>` (pnpm runs scripts directly without `run`)
- `npm ci` → `pnpm install --frozen-lockfile`
- `npm test` → `pnpm test`

---

## Step 8 — Verify the workspace

Run these checks in order:

```bash
# 1. Verify pnpm is resolving packages correctly
pnpm list --depth=0

# 2. Verify Nx can read the workspace
pnpm nx show projects

# 3. Build the main app
pnpm nx build item-bank

# 4. Serve the main app (confirm it boots)
pnpm nx serve item-bank

# 5. Run tests
pnpm nx test item-bank

# 6. Type-check all libs
pnpm nx run-many --target=typecheck --all
```

All six checks must pass before considering the migration complete.

---

## Step 9 — Update `.gitignore`

Ensure `.gitignore` includes pnpm-specific entries (add if not already present):

```gitignore
# pnpm
.pnpm-store/
.pnpm-debug.log
```

The `pnpm-lock.yaml` file **must be committed** (equivalent to `package-lock.json`).

---

## Step 10 — Commit

```bash
git add pnpm-lock.yaml pnpm-workspace.yaml .npmrc nx.json package.json .gitignore
git rm --cached package-lock.json   # stop tracking the old lockfile
git commit -m "chore: migrate package manager from npm to pnpm"
```

---

## Rollback Plan

If anything goes wrong after Step 5:

```bash
# Restore npm
rm -rf node_modules pnpm-lock.yaml pnpm-workspace.yaml .npmrc
git checkout package-lock.json
npm install
```

---

## Common Issues

| Error | Cause | Fix |
|---|---|---|
| `ERR_PNPM_PEER_DEP_ISSUES` | Strict peer deps | Add `strict-peer-dependencies=false` to `.npmrc` |
| `Cannot find module 'vite'` | Phantom deps not hoisted | Ensure `shamefully-hoist=true` in `.npmrc` |
| `nx: command not found` | pnpm didn't hoist nx binary | Run `pnpm nx ...` or add `.bin` to PATH |
| `ENOENT pnpm-lock.yaml` | Nx trying to read pnpm lockfile before it exists | Run `pnpm install` first |
| Workspace packages not linked | Missing `pnpm-workspace.yaml` | Create the file as shown in Step 2 |
