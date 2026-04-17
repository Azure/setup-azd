# AGENTS.md — setup-azd

Guidance for Copilot (Chat, CLI, code review) and other AI agents working in the `Azure/setup-azd` repository. Read this file in its entirety before making changes.

## About this repository

`Azure/setup-azd` is a **GitHub Action** that installs the Azure Developer CLI (`azd`) onto a workflow runner. The action is authored in TypeScript under `src/`, bundled with `@vercel/ncc` into `dist/index.js`, and published to the GitHub Marketplace.

Key files:

| File | Purpose |
|------|---------|
| `action.yml` | Action manifest. `runs.using` controls the Node.js runtime. |
| `src/main.ts` | Action entry point. |
| `dist/index.js` | Bundled output — committed to the repo and **must stay in sync** with `src/`. Enforced by `.github/workflows/check-dist.yml`. |
| `package.json` / `package-lock.json` | Action version lives here (`version` field). Must match CHANGELOG. |
| `CHANGELOG.md` | Release history. Append a new section at the top for every release. |
| `README.md` | Marketplace-facing docs. `uses:` samples use the latest floating major tag. |

## General conventions

- **Never** edit `dist/` by hand. Regenerate with `npm run all` (or `npm run build && npm run package`) and commit the result.
- **Never** pin `uses: Azure/setup-azd@vX.Y.Z` in `README.md`. The public samples use the latest floating major tag so users do not have to update docs on every release.
- **Always** rebuild `dist/` when `src/` changes. The `check-dist` CI will fail otherwise.
- On Windows, `prettier` and `ncc` may rewrite line endings (LF→CRLF). If the only diff after rebuilding `dist/` is line endings (`git diff --ignore-space-at-eol dist/` is empty), discard the change — do not commit EOL-only churn.

## Release workflow

This is the canonical procedure for cutting a new release. The matching Copilot skill lives at [`.github/skills/github-action-release/SKILL.md`](.github/skills/github-action-release/SKILL.md) — invoke it when available; otherwise follow these steps literally.

### 1. Pre-release smoke test

Before bumping any version, pin a consumer pipeline to `@main` and make sure it passes end-to-end:

```yaml
- uses: Azure/setup-azd@main
```

### 2. Decide the version

- **Patch** — bug fixes, dependency bumps with no behavior change.
- **Minor** — new features, runtime upgrades (e.g., Node 20 → 24).
- **Major** — breaking changes (removed inputs, required runner upgrades, etc.). A major bump also requires creating a new floating tag (`v3`) and updating README samples to `@v3`.

Ask the user if unsure.

### 3. Version-bump PR

Open a PR (use the `pull-request` skill if available) with these changes and nothing else:

1. **`CHANGELOG.md`** — prepend a new section:

   ```markdown
   ## X.Y.Z (YYYY-MM-DD)

   ### Features Added
   - [[PR#]](https://github.com/Azure/setup-azd/pull/PR#) Short description.

   ### Breaking Changes
   - ...

   ### Bugs Fixed
   - ...

   ### Other Changes
   - ...
   ```

   Omit empty sections. Reference PR #220 for a good example.

2. **`README.md`** — update only the embedded `action.yml` snippet (e.g., `using: 'nodeNN'`) and any other code examples that reflect implementation details. **Leave `uses: Azure/setup-azd@v2` alone** in the copy-paste samples.

3. **`package.json`** — bump the top-level `version`.

4. **`package-lock.json`** — bump **both** `version` fields (the top-level one and the one under `packages.""`).

5. **`dist/`** — if `src/` changed as part of the release, run `npm ci && npm run all` and commit the regenerated bundle. If only version metadata changed, `dist/` should be untouched (verify with `git diff --ignore-space-at-eol dist/`).

Link the PR to any related issue. For issues filed in `Azure/azure-dev`, use a cross-repo reference like:

```
Relates to Azure/azure-dev#NNNN
```

### 4. Merge and tag

After the PR merges to `main`:

```pwsh
git checkout main
git pull upstream main    # or origin main in an Azure org clone

# Full SemVer tag
git tag -a v2.3.0 -m "Release 2.3.0"
git push upstream v2.3.0

# Move the floating major tag so `uses: Azure/setup-azd@v2` resolves to this release
git tag -fa v2 -m "Update v2 to 2.3.0"
git push upstream v2 --force
```

For a **major** bump, create a new floating tag (`v3`) instead of moving `v2`, and open a follow-up PR updating the README samples to `@v3`. Always confirm with the user before any `--force` push.

### 5. Draft the GitHub Release

1. Go to https://github.com/Azure/setup-azd/releases → **Draft a new release**.
2. **Tag**: select the `vX.Y.Z` tag from Step 4 (or type a new tag name to have GitHub create it on publish).
3. **Target**: `main`.
4. **Title**: `vX.Y.Z`.
5. **Description**: paste the CHANGELOG entry. "Generate release notes" can seed it; trim to match.
6. Check **"Publish this Action to the GitHub Marketplace"** and select the same primary/secondary categories as the previous release.
7. Leave **"Set as the latest release"** checked unless back-porting.
8. **Publish release**.

Reference: [Publishing actions in GitHub Marketplace](https://docs.github.com/en/actions/sharing-automations/creating-actions/publishing-actions-in-github-marketplace).

### 6. Post-release validation

Re-run the consumer pipeline twice — once pinned to the new SemVer tag, once on the floating major tag:

```yaml
- uses: Azure/setup-azd@v2.3.0   # exact tag
# and separately
- uses: Azure/setup-azd@v2       # floating major tag, must resolve to the new release
```

## Code-review checklist

When reviewing PRs on this repo, flag any of the following as blockers:

- `dist/` edited manually, or out of sync with `src/` (check-dist will fail).
- `package.json` / `package-lock.json` / `CHANGELOG.md` version drift.
- README `uses:` sample pinned to a full SemVer instead of `@v2`.
- `action.yml` `runs.using` not on a supported Node.js version (currently `node24`).
- Workflow files using deprecated action versions (baseline: `actions/checkout@v6`, `actions/setup-node@v6`, `actions/upload-artifact@v7`, `github/codeql-action/*@v4`).
- Release PRs missing a corresponding CHANGELOG entry or not linking the related issue.
