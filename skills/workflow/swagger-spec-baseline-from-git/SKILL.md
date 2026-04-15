---
name: swagger-spec-baseline-from-git
description: Re-run spec-based optimization workflow on a clean branch without running the Spring Boot app — restore prior baseline artifacts (swagger-before.json + scripts) via `git show <sha>:<path>` from the commit on another branch that already captured them.
category: workflow
tags: [swagger, openapi, git, baseline, spring-boot]
triggers:
  - "swagger 전체 재실행"
  - "rerun swagger optimization"
  - "baseline 없이 시작"
scope: user
version: 1.0.0
---

# Baseline spec from git instead of a running app

Phase 1 of the `swagger-ai-optimization` workflow normally requires running the Spring Boot app to dump `/v3/api-docs`. On environments without DB/secrets/ports available — or when you've switched to a clean branch where a prior optimization run already exists on another branch — you can bootstrap without the app.

## When to activate

- You're on branch B; branch A already has a commit that includes `docs/swagger-before.json`, `docs/swagger-after.json`, and `scripts/*.py`.
- Branch B's current code state matches (or is close enough to) the state branch A was at when it captured `swagger-before.json`.
- You cannot or do not want to boot the Spring app in this environment.

## Steps

1. Find the artifact-carrying commit:
   ```bash
   git log --all --oneline --grep="<ticket-id>\|Swagger"
   ```

2. Restore baseline + scripts into the current tree (do NOT merge the commit — just extract files):
   ```bash
   mkdir -p scripts docs
   for f in scripts/measure-tokens.py scripts/prune-swagger.py scripts/verify-swagger-ai.py scripts/prompt-caching-example.py docs/swagger-before.json; do
     git show <commit-sha>:$f > $f
   done
   ```

3. Verify the baseline is still representative by measuring:
   ```bash
   python -X utf8 scripts/measure-tokens.py docs/swagger-before.json
   ```

4. Proceed with Phase 2+. After your code changes, ask the user (in their dev environment with DB/app running) to dump the new spec:
   ```
   curl http://localhost:<port>/v3/api-docs > docs/swagger-after.json
   ```

## Caveats

- If branch B has diverged significantly in controller/DTO code since branch A, the restored `swagger-before.json` is no longer the true baseline — treat it as approximate and note the divergence in the final report.
- Don't cherry-pick the Java code changes from branch A; only the generated artifacts + scripts. You want a fresh pass on current code.
