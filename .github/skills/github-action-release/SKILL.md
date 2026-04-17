---
name: github-action-release
description: >-
    **WORKFLOW SKILL** — End-to-end release process for a GitHub Action repository
    (e.g., Azure/setup-azd). Covers pre-release smoke testing with `@main`, version
    bumping across CHANGELOG/README/package.json/package-lock.json, tagging,
    drafting a GitHub Release, Marketplace publishing, and post-release validation
    against a consumer repo.

    INVOKES: git CLI, gh CLI, npm, ask_user, azd CLI.

    USE FOR: release a GitHub Action, cut a new GHA release, publish to GitHub
    Marketplace, tag new version of setup-azd, draft GitHub release, bump action
    version, release setup-azd v2.x, post-release verification, run release workflow
    for an action repo, validate new action version in a consumer repo, fix azd
    pipeline credentials after release.

    DO NOT USE FOR: general code PRs (use pull-request), code review (use
    code-review), building the action source (use implementation), releasing
    non-Action Node/npm packages (this skill is specific to GHA Marketplace
    releases).
---

# github-action-release

**WORKFLOW SKILL** — Cut and publish a new version of a GitHub Action, then validate it in a real consumer pipeline.

INVOKES: `git` CLI, `gh` CLI, `npm`, `ask_user`, `azd` CLI.

## When to use

- Releasing a new version of a GitHub Action repo (e.g., `Azure/setup-azd`) to GitHub Marketplace.
- Any change that requires bumping the action's version tag so downstream workflows (`uses: Org/action@vX.Y.Z`) can consume it.
- Post-release validation against a known consumer repo.

Do **not** use for general PR creation (use `pull-request`), code review (use `code-review`), or npm-library releases that are not GitHub Actions.

---

## Workflow

### Step 1 — Pre-release smoke test with `@main`

Before cutting a release, verify `main` is green end-to-end.

1. Confirm all PRs targeting the release are merged into `main` and CI on `main` is green (`gh run list --branch main --limit 5`).
2. In a consumer pipeline, temporarily pin the action to `@main` to exercise the un-released code:
   ```yaml
   - uses: Azure/setup-azd@main
   ```
3. Trigger the consumer workflow and confirm it succeeds. If it fails, fix forward on `main` before proceeding.

### Step 2 — Decide the new version

`ask_user` for the version bump (or infer from the changes):

- **Patch** (`x.y.Z`) — bug fixes, dependency bumps with no behavior change.
- **Minor** (`x.Y.0`) — new features, runtime upgrades (e.g., Node 20 → 24) that keep backward compat for most consumers.
- **Major** (`X.0.0`) — breaking changes (removed inputs, required runner upgrades, etc.).

### Step 3 — Update version-bearing files

Open a PR that updates **all four** files consistently:

1. **`CHANGELOG.md`** — add a new section at the top following the existing template. Example (from `Azure/setup-azd` PR #220):
   ```markdown
   ## 2.3.0 (YYYY-MM-DD)

   ### Features Added
   - [[PR#]](https://github.com/Org/repo/pull/PR#) Short description.

   ### Breaking Changes
   - ...

   ### Bugs Fixed
   - ...

   ### Other Changes
   - ...
   ```
   Omit sections that have no entries.

2. **`README.md`** — update the embedded `action.yml` snippet (e.g., `using: 'nodeNN'`) and any other code examples that reference implementation details. **Do not** pin `uses: Org/action@vX.Y.Z` in the README — by convention the README uses the **floating major tag** (`@v2`), which gets moved to the new release in Step 4. Pinning to a full SemVer in README docs would force every downstream copy-paster to re-update on every release.

3. **`package.json`** — bump the top-level `version` field.

4. **`package-lock.json`** — bump **both** `version` entries (the top-level one and the one under `packages.""`).

5. If the action has a compiled output (e.g., `dist/index.js`), rebuild and commit:
   ```pwsh
   npm ci
   npm run all   # or: npm run build && npm run package
   ```
   The repo's `check-dist` CI job will fail if `dist/` is out of sync.

6. Open the PR via the **`pull-request`** skill (do not run `gh pr create` directly).

### Step 4 — Merge and tag

Once the version-bump PR is merged into `main`:

1. Sync local: `git checkout main && git pull origin main`.
2. Create the tag. For `Azure/setup-azd`, maintain **both** a full SemVer tag and a floating major tag — this is required because the README and most consumers reference the major tag (`@v2`), so it must be moved forward on every minor/patch release:
   ```pwsh
   git tag -a v2.3.0 -m "Release 2.3.0"
   git push origin v2.3.0

   # Move the floating major tag so `uses: Org/action@v2` points at the new release
   git tag -fa v2 -m "Update v2 to 2.3.0"
   git push origin v2 --force
   ```
   On a **major** bump, create a new floating tag (`v3`) instead of moving `v2`, and open a follow-up PR to update the README samples to `@v3`. Always `ask_user` before any `--force` push.

   You may also create the SemVer tag directly in the GitHub Releases UI in Step 5 instead of using `git tag`, but the floating major tag must still be moved manually via `git tag -f` + `git push --force`.

### Step 5 — Draft the GitHub Release

1. Go to `https://github.com/Org/repo/releases` → **Draft a new release**.
2. **Tag**: select the tag created in Step 4 (or type a new tag name to create it on publish).
3. **Target**: `main`.
4. **Title**: the version, e.g., `v2.3.0`.
5. **Description**: paste the CHANGELOG entry for this version. Use *"Generate release notes"* as a starting point, then trim to match the CHANGELOG.
6. Check **"Publish this Action to the GitHub Marketplace"** and select the primary + secondary categories (match the existing release's categories).
7. Leave **"Set as the latest release"** checked unless this is a back-port.
8. **Publish release**.

Reference: [Publishing actions in GitHub Marketplace](https://docs.github.com/en/actions/sharing-automations/creating-actions/publishing-actions-in-github-marketplace).

### Step 6 — Post-release validation

Run the consumer pipeline **twice** against the newly published version:

1. In the consumer repo, pin the action to the new tag:
   ```yaml
   - uses: Azure/setup-azd@v2.3.0   # or @v2 to exercise the floating major tag
   ```
2. Trigger the workflow (push a dummy commit or use `gh workflow run`).
3. Watch: `gh run list --repo <custom-test-repo> --limit 3`.
4. Inspect failures: `gh run view <run-id> --repo <custom-test-repo> --log-failed`.

### Step 7 — Fix consumer auth if the pipeline fails on Azure login

The most common post-release failure is `az login` / federated-credential misconfiguration in the consumer repo (not a real regression in the action). Reconfigure with `azd`:

```pwsh
cd <consumer-repo>
azd pipeline config
```

`azd pipeline config` prompts interactively. **You must `ask_user` for each selection** — do not guess. Typical prompts:

- **CI/CD provider** → `GitHub Actions` (vs. Azure DevOps).
- **Authentication type** → `Federated Credential (OIDC)` (recommended) vs. `Client Credentials (service principal + secret)`.
- **Azure subscription** → one of the signed-in subscriptions.
- **Azure location / region** → e.g., `eastus2`.
- **Service principal** → create a new one or reuse an existing name.
- **Commit & push generated workflow changes?** → usually `No` unless the user explicitly opts in.

After `azd pipeline config` succeeds, re-run the consumer workflow and confirm it passes.

### Step 8 — Announce / close out

- Verify the release is visible at `https://github.com/marketplace/actions/<action-name>` (Marketplace listing can take a few minutes).
- Close the release issue / milestone if one exists.
- Notify the team / post release notes to the usual channel.

---

## Error handling

- **`check-dist` CI fails on version PR** → `dist/` was not rebuilt. Run `npm ci && npm run all` and amend the PR.
- **`git push origin v2 --force` refused** → branch protection on tags; push via the Releases UI or ask an admin.
- **Release published but Marketplace listing missing** → confirm "Publish to Marketplace" was checked and categories are set; edit the release and re-save.

---

## References

- Example CHANGELOG-bump PR: [Azure/setup-azd#220](https://github.com/Azure/setup-azd/pull/220)
- [Publishing actions in GitHub Marketplace](https://docs.github.com/en/actions/sharing-automations/creating-actions/publishing-actions-in-github-marketplace)
- [Releases · Azure/setup-azd](https://github.com/Azure/setup-azd/releases)
- `azd pipeline config` — [docs](https://learn.microsoft.com/azure/developer/azure-developer-cli/reference#azd-pipeline-config)
