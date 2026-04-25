---
version: 0.1.0-draft
name: tests-follow-code-not-app
summary: Tests live next to the code, not the app. If a test mocks next/navigation to test a shared component, the test is in the wrong package.
category: decision
tags: [testing, monorepo, vitest, test-organization]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: CLAUDE.md
imported_at: 2026-04-18T00:00:00Z
---

Four-layer convention for a cross-platform monorepo:

| What you're testing | Where the test lives |
|---|---|
| Shared business logic (stores, queries, hooks) | `packages/core/*.test.ts` |
| Shared UI components (pages, forms, modals) | `packages/views/*.test.tsx` |
| Platform-specific wiring (cookies, redirects, searchParams) | `apps/web/*.test.tsx` or `apps/desktop/` |
| End-to-end user flows | `e2e/*.spec.ts` |

## Why

If a test for a component in `packages/views/` needs to mock `next/navigation`, the mock is proof that the code under test secretly depends on Next.js — either the component is impure (should be moved to `apps/web/`) or the test is in the wrong place. Moving the test to `packages/views/` forces you to replace the mock with the shared `NavigationAdapter`, which is the right abstraction.

Infrastructure per layer:
- `packages/core/` → Vitest, Node env (no DOM).
- `packages/views/` → Vitest, jsdom env, `@testing-library/react`.
- `apps/web/` → Vitest, jsdom env, framework-specific mocks.
- `e2e/` → Playwright.

All test deps come from a single pnpm catalog for unified versioning.

## Evidence

- CLAUDE.md, "Testing Rules" → "Where to write tests".
- `packages/core/vitest.config.ts` vs `packages/views/vitest.config.ts` — env differences.
- `e2e/helpers.ts` — self-contained fixtures via `TestApiClient`.
