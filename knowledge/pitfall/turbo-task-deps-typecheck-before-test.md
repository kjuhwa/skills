---
version: 0.1.0-draft
name: turbo-task-deps-typecheck-before-test
summary: Configure Turbo so test depends on ^typecheck — running tests against unchecked code masks type errors as mysterious runtime failures.
category: pitfall
tags: [turbo, typecheck, testing, monorepo, ci]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: turbo.json
imported_at: 2026-04-18T00:00:00Z
---

In `turbo.json`, make the test task depend on typecheck in the dependency graph:

```json
{
  "tasks": {
    "build":     { "dependsOn": ["^build"] },
    "dev":       { "cache": false, "persistent": true },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "test":      { "dependsOn": ["^typecheck"] },
    "lint":      { "dependsOn": ["^typecheck"] }
  }
}
```

The `^` means "wait for this task on dependencies"; so testing package X waits for X's deps to typecheck first.

## Why

Without this dependency, `pnpm test` can run against a tree with type errors, producing runtime errors that are mysterious because they're actually "this function doesn't exist / has wrong signature" issues. The error messages are often about the runtime call site, not the underlying type mismatch.

Making tests block on typecheck costs maybe 10% extra runtime in CI and catches an entire class of bugs early. Fast local iteration can still run `pnpm test --filter=@org/core` to skip typechecks during tight inner loops.

## Evidence

- `turbo.json:17-36` — task dependency graph.
- CLAUDE.md, "AI Agent Verification Loop" — mention of typecheck before tests in the workflow.
