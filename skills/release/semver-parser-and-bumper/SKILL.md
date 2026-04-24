---
name: semver-parser-and-bumper
description: Parse semantic version strings and bump major/minor/patch components
category: release
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, release, semver]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - scripts/suggest_version.js
imported_at: 2026-04-18T00:00:00Z
---

# Minimal semver parse + bump

Avoid pulling `semver` just to bump a version. A 10-line helper covers the 99% case.

## Mechanism

```js
function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(v);
  if (!m) throw new Error(`Not semver: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bumpSemver(v, level) {
  const s = parseSemver(v);
  if (level === 'major') return `${s.major + 1}.0.0`;
  if (level === 'minor') return `${s.major}.${s.minor + 1}.0`;
  return `${s.major}.${s.minor}.${s.patch + 1}`;
}
```

## When to reuse

Release automation, changelog generators, plugin version managers — anywhere a single-purpose tool shouldn't carry a dependency graph.
