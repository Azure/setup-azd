# setup-azd — Instructions for Copilot Chat and Copilot code review

For any work in this repository, especially release work and code reviews, you MUST read [AGENTS.md](../AGENTS.md) in its entirety first.

## Release work

When the user asks to cut a release, publish a new version, tag, or draft a GitHub Release for this action, follow the release workflow documented in [AGENTS.md](../AGENTS.md) § Release workflow, which mirrors the local Copilot skill at [`.github/skills/github-action-release/SKILL.md`](skills/github-action-release/SKILL.md). Invoke the `github-action-release` skill if available.

Never skip these invariants:

- Bump `version` in **all four** files: `CHANGELOG.md`, `README.md` (only the embedded `action.yml` snippet — NOT the `uses:` samples), `package.json`, and **both** `version` fields in `package-lock.json`.
- README `uses:` samples stay on the latest floating major tag (for example, `@v2`), not a pinned SemVer.
- After merge, create the full SemVer tag AND force-move the latest floating major tag to the new commit.
- Always pre-flight with `uses: Azure/setup-azd@main` in a consumer pipeline before releasing.
- Always post-validate with the new tag in a consumer pipeline after publishing.
