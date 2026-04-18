---
version: 0.1.0-draft
name: shared-repo-sequential-branching
description: Git operations on a shared repo clone must be sequential — parallel branch creation causes working tree conflicts
category: pitfall
tags:
  - git
  - parallel
  - branching
  - skills-hub
---

# Shared Repo Sequential Branching Constraint

## Problem

When publishing multiple examples to `kjuhwa/skills-hub`, each example needs its own feature branch (`example/<slug>`). Attempting to create multiple branches in parallel on the same local clone fails because `git checkout` switches the entire working tree.

## Why It Matters

The natural instinct when publishing 3+ examples is to parallelize — spawn 3 agents, each creates a branch and pushes. But they all operate on `~/.claude/skills-hub/remote/`, a single working copy.

## Constraint

Each publish cycle must complete before the next begins:

```
main → branch A → add files → commit → push → back to main
main → branch B → add files → commit → push → back to main
main → branch C → add files → commit → push → back to main
```

## Workaround Options

1. **Sequential publish** (current approach): simple, reliable, ~30s per example
2. **Multiple clones**: `git worktree add` for each branch — parallel-safe but adds disk/complexity
3. **Single combined PR**: batch all examples into one branch — loses independent review

## Recommendation

For ≤5 examples, sequential publish is fast enough. For larger batches (10+), consider `git worktree` for true parallelism.

## Related

The `example/README.md` catalog table supports concurrent row additions because each PR independently appends — merge order doesn't matter as long as each branch rebases from the latest main.
