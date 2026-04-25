---
version: 0.1.0-draft
name: github-variables-version-management
summary: Storing version strings in GitHub Actions repository variables (not committed files) avoids merge conflicts on automated version bumps and provides a single source of truth accessible to both CI jobs and local scripts via the `gh` CLI.
category: ci-cd
tags: [github-actions, versioning, repository-variables, ci-cd, automation, merge-conflicts]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# GitHub Variables for Version Management

## Context

Projects that automatically track upstream dependency versions (a CLI tool,
an Electron app, a language runtime) need to store the current upstream version
somewhere. Common choices:
- A committed file (`VERSION`, `version.txt`, a line in a shell script).
- A git tag.
- A CI/CD platform secret or variable.

The committed-file approach causes frequent merge conflicts: when an automation
bot updates `build.sh` with a new download URL, and a developer also has a
branch with changes to `build.sh`, rebase conflicts occur on every upstream
update cycle.

## Observation

GitHub Actions repository variables (Settings → Secrets and variables →
Variables) provide a key-value store that is:
- Not part of the git tree (no merge conflicts).
- Readable from within any workflow via `${{ vars.VARIABLE_NAME }}`.
- Readable from the `gh` CLI: `gh variable get VARIABLE_NAME`.
- Writable from automation: `gh variable set VARIABLE_NAME --body "value"`.

By storing the upstream version in a repository variable instead of a committed
file, the automation bot can update it without touching any tracked file,
eliminating the merge conflict vector entirely.

The version can still be embedded into committed files (e.g., download URLs in
a build script) when a release is triggered, but the canonical source of truth
is the variable, not the committed value.

## Why it happens

git merge conflicts on version files arise because the file changes frequently
(on every upstream release) and multiple branches coexist (developer feature
branches, bot update branches). Every branch that touches the file needs to
be rebased against the bot's changes.

Repository variables live outside the git DAG entirely. Any number of branches
can coexist, and no rebase is needed when the variable changes. The variable
is only read at CI runtime.

## Practical implication

Define two types of variables:
- **Wrapper/project version** (bumped manually by maintainers):
  `REPO_VERSION` = `1.3.23`
- **Upstream dependency version** (updated automatically by a CI job):
  `UPSTREAM_VERSION` = `1.1.8629`

Use them from CI:
```yaml
# In a workflow job:
env:
  VERSION: ${{ vars.REPO_VERSION }}
  UPSTREAM_VERSION: ${{ vars.UPSTREAM_VERSION }}
```

Use them locally:
```bash
gh variable get UPSTREAM_VERSION
gh variable set REPO_VERSION --body "1.3.24"
```

Tag releases combining both:
```bash
TAG="v$(gh variable get REPO_VERSION)+upstream$(gh variable get UPSTREAM_VERSION)"
git tag "$TAG"
git push origin "$TAG"
```

The automated version-check workflow pattern:
1. Resolve the latest upstream version (API, Playwright, etc.).
2. Compare against `UPSTREAM_VERSION` variable.
3. If changed: update the variable, update any committed URLs/hashes, create
   a release tag — all in sequence within one workflow run.
4. The committed file update (if needed) happens via a bot commit on `main`,
   but only for non-version-string content (download URLs, checksums) that
   must be in the repo for non-CI builds.

## Source reference

- `CLAUDE.md`: "Versioning" section — describes `REPO_VERSION` and
  `CLAUDE_DESKTOP_VERSION` variables, tag format, and manual bump commands.
- `CLAUDE.md`: "Common Gotchas" — warns contributors to check the variable
  before committing `build.sh` to avoid stale URLs.
