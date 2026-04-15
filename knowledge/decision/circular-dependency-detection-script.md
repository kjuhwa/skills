---
name: circular-dependency-detection-script
summary: A small Python script that parses #include directives across the tree and reports the shortest cycle in the module graph — cheap CI gate against architectural decay.
category: decision
tags: [cpp, build, dependencies, tooling, ci]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/bitcoin/bitcoin
source_ref: refs/remotes/origin/master
source_commit: edcf84c73abcad31346388a4b8712b38742801ce
source_project: bitcoin
source_kind: project
imported_at: 2026-04-15
---

# Detecting circular header dependencies in CI

## The decision

Run a lightweight Python script that parses `#include` statements, builds the module graph, computes the transitive closure, and prints the shortest cycle. Wire it into CI with a pinned allowlist of known cycles, and treat any new cycle as a failure.

## Why

Circular header dependencies are easy to introduce and hard to notice — the build still succeeds, but:

- any edit to a header in the cycle forces recompilation of every module in it,
- splitting a library out later requires unwinding the cycle first (always painful),
- tests can't isolate one side of the cycle.

Detecting cycles at review time is cheap; unwinding them months later after they've grown is not.

## How to apply

- Treat a `.cpp` + its paired `.h` as a single module node; count edges by `#include` statements.
- Header-only modules (pure interfaces) need an exception rule — they intentionally have no `.cpp`.
- Maintain an explicit allowlist of "known" cycles in the script, one line per pair, with a comment explaining why it's accepted. New cycles fail CI; the allowlist never grows without review.
- Run the script pre-push as well, not only in CI — a developer sees the failure before the PR.

## Evidence

- `contrib/devtools/circular-dependencies.py`
- `doc/developer-notes.md` (section "Internal interface guidelines")
