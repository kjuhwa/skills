---
name: vitest-per-package-environments
description: Per-package Vitest configs in a monorepo — node env for logic packages, jsdom env for UI packages, framework-specific mocks only in app packages.
category: testing
version: 1.0.0
tags: [vitest, monorepo, jsdom, testing, test-organization]
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: high
---

## When to use

- Pnpm/Turborepo monorepo with separate packages for logic, UI, and platform-specific wiring.
- You want fast tests for logic (no DOM) and realistic tests for components (jsdom + Testing Library).
- You want `turbo test` to run all of them in one command.

## Steps

1. In each logic-only package (stores, queries, hooks that don't touch DOM):
   ```ts
   // packages/core/vitest.config.ts
   import { defineConfig } from "vitest/config";
   export default defineConfig({
     test: {
       environment: "node",
       include: ["**/*.test.ts"],
     },
   });
   ```
2. In each UI package:
   ```ts
   // packages/views/vitest.config.ts
   import react from "@vitejs/plugin-react";
   import { defineConfig } from "vitest/config";
   export default defineConfig({
     plugins: [react()],
     test: {
       environment: "jsdom",
       setupFiles: ["./test/setup.ts"],
       include: ["**/*.test.tsx"],
     },
   });
   ```
   `test/setup.ts` registers `@testing-library/jest-dom` matchers.
3. In app packages where you test framework-specific code, mock the framework only there:
   ```ts
   // apps/web/test/setup.ts
   import { vi } from "vitest";
   vi.mock("next/navigation", () => ({
     useRouter: () => ({ push: vi.fn() }),
     usePathname: () => "/",
   }));
   ```
4. Root `package.json` delegates to Turborepo:
   ```json
   { "scripts": { "test": "turbo test" } }
   ```
   Turbo `tasks.test` depends on `^typecheck` so tests always run against a type-checked tree.
5. All test deps (vitest, jsdom, testing-library) live in the pnpm catalog for single-version pinning.

## Example

```
packages/core/     → node env, 0 mocks beyond `vi.fn()`
packages/views/    → jsdom env, mocks only `@org/core` stores
apps/web/          → jsdom env, mocks `next/navigation` for platform-wiring tests
e2e/               → Playwright (separate project, `pnpm exec playwright test`)
```

## Caveats

- If a `packages/views/` test needs to mock `next/*` or `react-router-dom`, the test is in the wrong package — move it to the app package.
- Don't share `setupFiles` across packages with different envs; the matchers import may be incompatible.
