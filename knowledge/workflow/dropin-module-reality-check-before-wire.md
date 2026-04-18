---
version: 0.1.0-draft
name: dropin-module-reality-check-before-wire
description: Before wiring a drop-in module into a target project, map every path/marker/regex in the module to what the target actually stores on disk — the module's README describes its author's assumed layout, not yours.
category: workflow
type: pitfall
tags:
  - integration
  - drop-in-modules
  - assumptions
---

# Reality-check drop-in modules against the target project before wiring

## The pitfall

Drop-in modules come with an INTEGRATION.md or README that describes paths, markers, and regexes the module author assumed for their own codebase. Those assumptions leak into the module's defaults — and they almost never match the target project's actual layout exactly.

If you skip the reality-check and wire in the module as-is, the failures are silent: empty scan results, missed files, or zero-hit regexes. The module appears to load fine. You only notice when downstream behavior is anemic.

## Concrete examples

A v3 drop-in bundle advertised paths like:

```
<hubRoot>/example/<category>/<slug>/SKILL.md
<hubRoot>/knowledge/<category>/<slug>/README.md
```

The actual target hub stored:

```
<hubRoot>/skills/<category>/<slug>/SKILL.md       ← "skills" not "example"
<hubRoot>/knowledge/<category>/<slug>.md          ← flat .md, no nested dir
```

Wiring the module without adapting would have scanned an empty `example/` directory and missed every knowledge file. The tests would still pass (the module's own self-test works with mocks), and the prompt would silently degrade to an empty compressed index.

Similar traps to watch for in any drop-in:
- **Marker filenames** (`SKILL.md` vs `README.md` vs `index.md`)
- **Directory depth** (nested `<slug>/README.md` vs flat `<slug>.md`)
- **Kind/root names** (`example/` vs `skills/` vs `recipes/`)
- **Frontmatter field names** (`description:` vs `summary:` vs `purpose:`)
- **Spawn / CLI assumptions** (`claude` direct vs `.cmd` wrapper on Windows)
- **Default thresholds in comments** that drifted from the code's real defaults

## The check

Before wiring, for every path/marker/regex in the module:
1. Open the target project's actual directory tree and confirm the path exists.
2. Read an actual file the module would match; confirm the marker name and frontmatter field names line up.
3. If the module spawns subprocesses, check how the target project already spawns the same binary — adopt its pattern (e.g. `shell: true` on Windows).
4. If there's a doc/default mismatch in the module itself (e.g. comment header says `threshold = 0.6` but signature is `= 0.3`), trust the code — but note the drift and fix the doc before publishing.

## How to apply

- Adapt the module to match the target first; wire second. Don't leave "TODO: fix paths later" adapters.
- If the module is a one-person drop-in you don't own, fork it into a project-local `hub-loop-v3/` (or similar) and keep the original `files/` as an untouched archive for diffing.
- Run the module's own self-test AND a target-integration smoke test (e.g. `node -e "const m=require('./x');m.load({hubRoot: REAL_HUB}).then(r=>console.log(r.count))"`) before writing any server-side wiring.
