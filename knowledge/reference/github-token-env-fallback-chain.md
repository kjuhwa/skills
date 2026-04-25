---
version: 0.1.0-draft
name: github-token-env-fallback-chain
summary: When resolving a GitHub token from the environment in a tool that runs under both CI and human-local setups, check `GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_PAT` in that order, and treat "no token found" as silent-skip (not an error) for optional features like auto-issue reporting and release creation.
category: reference
tags: [github-token, env-fallback, ci, gh-cli, graceful-degradation]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - src/gep/issueReporter.js
  - README.md (Auto GitHub Issue Reporting, Public Release sections)
imported_at: 2026-04-18T03:00:00Z
---

# GitHub Token Env Fallback Chain

If your tool optionally authenticates to the GitHub API, resolve the token from **three** env vars in this order:

```js
function getGithubToken() {
  return process.env.GITHUB_TOKEN
      || process.env.GH_TOKEN
      || process.env.GITHUB_PAT
      || '';
}
```

## Why all three

| Env var | Where it comes from |
|---|---|
| `GITHUB_TOKEN` | GitHub Actions injects this automatically; also the canonical name in most docs |
| `GH_TOKEN` | What the `gh` CLI sets/reads; a developer who has `gh auth login` configured will have this populated |
| `GITHUB_PAT` | Common personal-access-token name in long-lived shell configs and PaaS dashboards |

Checking only `GITHUB_TOKEN` means a local developer has to re-export their token just to use your tool; checking only `GH_TOKEN` breaks CI. Accepting all three covers every reasonable setup.

## Degrade silently, don't error

If none of the three is set, treat token-dependent features as *skipped*, not *failed*:

```js
const token = getGithubToken();
if (!token) {
  console.log('[IssueReporter] No GitHub token available. Skipping auto-report.');
  return;
}
```

Rationale: auto-issue-reporting and release-creation are optional affordances. A missing token is not an input error — it's a configuration choice. Hard-failing on missing token breaks users who explicitly don't want the feature on.

## Exception: when to *require* a token

If the tool's primary purpose *is* GitHub interaction (a PR linter, a label bot, a release publisher invoked directly), require the token explicitly and fail fast with a message naming all three env var names. The silent-skip rule is for auxiliary features.
