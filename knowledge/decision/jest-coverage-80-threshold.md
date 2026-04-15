---
name: jest-coverage-80-threshold
description: Global Jest coverage threshold is 80% on branches, functions, lines, and statements
type: decision
category: decision
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: medium
---

# Fact
`builder-ui` enforces 80% Jest coverage across all four axes (branches/functions/lines/statements). `npm run test:sonar` runs with coverage and no watch for CI.

**Why:** A single global floor is simpler to reason about than per-file overrides and was chosen deliberately over lower per-directory thresholds.

**How to apply:**
- New PRs that drop coverage below 80% should add tests, not lower the threshold.
- If a silently-skipped `.spec.ts` drops coverage unexpectedly, see the `spec-excluded-from-jest` pitfall.
- Coverage reports land at `coverage/coverage.html` and `reports/junit/test-report.xml`.

## Counter / Caveats
- The threshold is global; pushing test-only code into an untested file can mask an actual drop elsewhere. Watch per-file trends in the HTML report.
