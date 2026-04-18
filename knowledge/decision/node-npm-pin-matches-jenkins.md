---
version: 0.1.0-draft
tags: [decision, node, npm, pin, matches, jenkins]
name: node-npm-pin-matches-jenkins
description: UI build is pinned to Node 24.6.0 + npm 11.5.1 to match the Jenkins build environment
type: decision
category: decision
source:
  kind: project
  ref: lucida-builder-r3@97ceb3a1
confidence: high
---

# Fact
`builder-ui` pins `engines` to Node `24.6.0` and npm `11.5.1`. The Jenkins pipeline uses the same versions.

**Why:** Local/CI toolchain drift was the root cause of reproducibility incidents in earlier cycles (#363 "UI 개발환경 통일"). Pinning both local and CI to the exact same node/npm removed a class of "works on my machine" bugs.

**How to apply:**
- Use `nvm use 24.6.0` (or equivalent) before `npm install`.
- Do not bump node/npm without also bumping Jenkins.
- TypeScript is pinned to `5.3.3` and webpack to `5.102.1`; treat those similarly when bumping.

## Evidence
- `README.md` "UI 개발 환경" section.
- Issue #363 refactor commits (`39f91f8a`, `143136fe`).
