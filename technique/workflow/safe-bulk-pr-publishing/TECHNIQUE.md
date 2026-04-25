---
version: 0.1.0-draft
name: safe-bulk-pr-publishing
description: Build N projects in parallel then publish them as many PRs safely — rollback anchor, race-aware PR creation, batch conflict recovery
category: workflow
tags:
  - parallel
  - bulk
  - pull-request
  - automation
  - safety
  - pr-flow

composes:
  - kind: skill
    ref: workflow/parallel-build-sequential-publish
    version: "^1.0.0"
    role: orchestrator
  - kind: skill
    ref: workflow/rollback-anchor-tag-before-destructive-op
    version: "*"
    role: pre-flight-safety
  - kind: knowledge
    ref: workflow/batch-pr-conflict-recovery
    version: "*"
    role: failure-recovery
  - kind: knowledge
    ref: pitfall/gh-pr-create-race-with-auto-merge
    version: "*"
    role: known-pitfall

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - cmd: "./verify.sh"
---

# Safe Bulk PR Publishing

> A pipeline for producing many independent artifacts in parallel and shipping them as individual PRs. The individual skills and knowledge entries already exist; this technique fixes **the order and the wiring points** that keep the flow safe.

<!-- references-section:begin -->
## Composes

**skill — `workflow/parallel-build-sequential-publish`**  _(version: `^1.0.0`)_
orchestrator

**skill — `workflow/rollback-anchor-tag-before-destructive-op`**  _(version: `*`)_
pre-flight-safety

**knowledge — `workflow/batch-pr-conflict-recovery`**  _(version: `*`)_
failure-recovery

**knowledge — `pitfall/gh-pr-create-race-with-auto-merge`**  _(version: `*`)_
known-pitfall

<!-- references-section:end -->

## When to use

- Producing 10+ independent projects/examples/migrations in one batch, each needing its own PR
- Pushing many PRs in sequence against a repo with auto-merge enabled
- Any similar flow where a catalog/index file conflict has stalled dozens of PRs in the past

## When NOT to use

- A single PR (the overhead is not worth it — use the atoms directly)
- PRs that depend on each other (ordering/merge strategy differs — use a different technique)

## Phase sequence

```
[0] Anchor      → rollback-anchor-tag-before-destructive-op
[1] Build       → parallel-build-sequential-publish (Build Phase)
[2] Publish     → parallel-build-sequential-publish (Publish Phase)
                  + gh-pr-create-race-with-auto-merge (detection in retry loop)
[3] Recover?    → batch-pr-conflict-recovery (triggered by catalog-file conflict storm)
```

### [0] Pre-flight anchor (mandatory)

Run `rollback-anchor-tag-before-destructive-op` as-is to push a `backup/pre-bulk-pr-YYYYMMDD` tag to origin. Record the rollback command in the PR template body.

**What this technique adds**: a fixed tag-slug convention `pre-bulk-pr-<date>` so this technique's anchors do not collide with other techniques'.

### [1] Build phase (parallel)

Follow the Build procedure in `parallel-build-sequential-publish`. Each executor **must not touch git** — only file creation.

**What this technique adds**: two explicit prohibitions appended to the executor prompt:
- Do **not** edit shared catalog files such as `example/README.md` (see knowledge: batch-pr-conflict-recovery §Prevention)
- Catalog regeneration is performed **once**, at the end of the Publish phase

### [2] Publish phase (sequential, race-aware)

Follow the Publish procedure in `parallel-build-sequential-publish`, but wrap the `gh pr create` step:

```bash
if ! gh pr create ...; then
  # Detect race (knowledge: gh-pr-create-race-with-auto-merge)
  if git merge-base --is-ancestor "$BRANCH" origin/main; then
    echo "auto-merge already picked it up — treat as success"
  else
    echo "genuine failure"; exit 1
  fi
fi
```

**What this technique adds**: the retry/skip branch that distinguishes a real failure from an already-merged branch. The atomic units do not carry this branching logic.

### [3] Recovery (optional, on incident)

If catalog-file conflicts start cascading, stop publishing and switch to `batch-pr-conflict-recovery`. Trigger conditions:

- Three or more consecutive PRs come back `CONFLICTING` → switch to recovery mode
- The conflict file is the same shared file (e.g. `example/README.md`) across all cases → condition met

**What this technique adds**: a decision rule for **when** to switch into recovery mode. The atomic knowledge describes how to recover but not when to trigger it.

## Glue summary (net value added by this technique)

Nothing the atoms already cover is repeated; only what this recipe contributes:

| Added element | Where |
|---|---|
| Anchor tag-slug convention `pre-bulk-pr-<date>` | Phase 0 |
| Executor prohibitions (no shared-catalog edits) | Phase 1 |
| Race-vs-failure branching for `gh pr create` | Phase 2 |
| Recovery-mode trigger rule (N ≥ 3 CONFLICTING) | Phase 3 |

## Verification (draft)

`verify.sh` in v0.1 is a short sanity check:

```bash
#!/usr/bin/env bash
# Assert the referenced atoms are present in the local hub.
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/workflow/parallel-build-sequential-publish/SKILL.md" \
  "skills/workflow/rollback-anchor-tag-before-destructive-op/SKILL.md" \
  "knowledge/workflow/batch-pr-conflict-recovery.md" \
  "knowledge/pitfall/gh-pr-create-race-with-auto-merge.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- Two of the composed atoms are `0.1.0-draft`, so this technique is pinned to draft status
- v0 forbids technique-to-technique nesting, so no other technique can reference this one
- `loose` binding — major version bumps on any composed skill require re-verification
- Previously the `parallel-build-sequential-publish` skill lived at the root of `skills/` despite its `category: workflow` frontmatter. Relocated under `skills/workflow/` as part of RFC §4 cleanup; the `ref` in this file has been updated accordingly. The general rule still stands — `ref` is the **kind-root-relative physical path**, not a semantic `{category}/{slug}`.

## Provenance

- Authored: 2026-04-24
- Status: pilot #1 for the `technique/` schema draft v0.1
- Schema doc: `docs/rfc/technique-schema-draft.md`
