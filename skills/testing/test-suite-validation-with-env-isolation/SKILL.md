---
name: test-suite-validation-with-env-isolation
description: Run test suite with isolated environment (NODE_ENV=test, specific env vars, no bridge)
category: testing
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [evolver, testing, env-isolation, node-test]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - scripts/validate-suite.js
imported_at: 2026-04-18T00:00:00Z
---

# Env-isolated node test runner

Wrap `node --test <glob>` in a script that hand-builds the child's `env`:
- set `NODE_ENV=test`, `GEP_ASSETS_DIR=<tmp>` and similar sandbox roots,
- **clear** production-only vars (e.g. `EVOLVE_BRIDGE`) so a left-over shell export can't leak into the suite,
- stream stdout/stderr back, parse the final `tests <n>` / `fail <n>` lines, exit non-zero on failure.

## Why

`node --test` is ergonomic but inherits the shell env — which silently causes flaky pass/fails when a local dev has a bridge daemon running or custom API keys set. Isolating the env locally gives you CI-grade reliability on a laptop.

## Mechanism

```js
const env = {
  ...process.env,
  NODE_ENV: 'test',
  GEP_ASSETS_DIR: mkdtempSync('gep-'),
};
delete env.EVOLVE_BRIDGE;
const { status } = spawnSync('node', ['--test', ...globSync(glob)], { env, stdio: 'inherit' });
process.exit(status);
```

## When to reuse

Node.js projects using `node --test` or `vitest` where env contamination is a recurring issue.
