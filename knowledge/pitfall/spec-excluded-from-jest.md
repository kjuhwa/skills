---
version: 0.1.0-draft
tags: [pitfall, spec, excluded, from, jest]
name: spec-excluded-from-jest
description: .spec.ts files are excluded from the Jest runner in this project — only .test.ts is discovered
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: high
---

# Fact
`builder-ui`'s Jest config treats `.test.ts` / `.test.tsx` as the only valid test file suffixes. `.spec.ts` files are explicitly excluded and will silently not run.

**Why:** The project standardized on `.test.ts` naming to keep co-location predictable and avoid two parallel conventions. A test that runs locally under a different naming but is skipped in CI is worse than no test.

**How to apply:**
- When a "test file isn't running" or coverage drops unexpectedly, check the suffix first.
- Do not patch `testMatch` to add `.spec.ts` — rename the file instead.
- New tests: always `.test.ts` in the same folder as the subject.

## Counter / Caveats
- Coverage threshold is 80% across branches/functions/lines/statements. A silently-skipped `.spec.ts` can trip this threshold without an obvious error.
