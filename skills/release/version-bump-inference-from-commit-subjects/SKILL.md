---
name: version-bump-inference-from-commit-subjects
description: Infer semantic version bump (major/minor/patch) from commit subjects since last release
category: release
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, release, semver, conventional-commits]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - scripts/suggest_version.js
imported_at: 2026-04-18T00:00:00Z
---

# Infer semver bump from commit subjects

Parse commits since the last tag. Classify each:

- `BREAKING CHANGE:` footer or trailing `!:` on type → **major**.
- `feat:` → **minor**.
- `fix:` / `perf:` → **patch**.
- Default → **patch**.

Take the highest bump class among all commits. Works without a CHANGELOG or release history — only `git log` is required.

## Mechanism

```js
function bumpFor(subjects) {
  let level = 'patch';
  for (const s of subjects) {
    if (/BREAKING CHANGE/.test(s) || /!:/.test(s)) return 'major';
    if (/^feat[\(:]/i.test(s)) level = level === 'major' ? level : 'minor';
  }
  return level;
}
```

## When to reuse

Release automation on projects that adopt Conventional Commits but don't want the full `semantic-release` toolchain.
