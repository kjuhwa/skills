---
name: hub-scan-must-exclude-external-imports
type: knowledge
category: pitfall
tags: [skills-hub, heuristic, external-import, upstream-fidelity, pitfall]
summary: "Any cross-corpus heuristic scan (/hub-refactor, /hub-condense, /hub-cleanup) that modifies entries must exclude externally-imported content by default, or it will propose changes that diverge from upstream and break /hub-sync."
source:
  kind: session
  ref: hub-refactor + hub-condense design 2026-04-17
confidence: high
linked_skills: [heuristic-scan-iterative-tuning]
---

# Pitfall: cross-corpus scans must guard against external imports

## Fact

When a heuristic scan over `~/.claude/skills-hub/remote/` proposes modifications (archive, dedup, compression, rewrite, deprecate), it must **skip externally-imported entries** unless the caller explicitly opts in via `--include-external-imports`.

Markers that identify an external import:

- **Skills**: frontmatter `source_type: external-git` (gstack, mattpocock-skills, etc.).
- **Knowledge**: frontmatter `extracted_by` containing `skills_import_git`, OR nested `source.repo: external` (e.g. the 37-entry `knowledge/arch/oh-my-claudecode-*` catalog).

## Why

Upstream fidelity > local tightening. Modifying a mirror-imported entry means the next `/hub-sync` either conflicts or silently reverts the local change. Either way the scan produces churn without durable value.

In one `/hub-condense` run this pitfall manifested as **135 dedup occurrences across 32 gstack skills** being surfaced as "duplicates" — they were correctly identical by gstack's own boilerplate convention (Preamble, Voice, Telemetry, AskUserQuestion Format sections). Accepting them would have rewritten every gstack skill in the hub, breaking the next import.

A second run then surfaced **37 oh-my-claudecode-* knowledge entries** as sharing 3-line paragraphs — these are a bulk-extracted reference catalog where each entry describes one OMC skill with identical structural boilerplate.

## How to apply

- `/hub-refactor`: archive conditions A (perma-stub) and B (metadata-empty) skip skills with `source_type: external-git`.
- `/hub-condense`: both dedup and compression passes skip external skills AND external knowledge by default (`--include-external-imports` overrides).
- Any future corpus-level scan command must implement the same guard. It is **not** enough to skip archived entries — external imports are separate and additive.
- When adding the guard to a Python scanner, both markers need coverage: the `source_type` string for skills AND a raw-text check for nested `source.repo: external` because simple frontmatter parsers don't always handle nested YAML objects.

## Evidence

- `/hub-refactor` session: conditions A/B initially fired on gstack skills `grill-me`, `edit-article`, `careful`, `guard`, `freeze`, `unfreeze`. All were legitimate imports short by design.
- `/hub-condense` session: D1~D5 dedup groups (135 occurrences) and C1~C5 compression candidates (ship, office-hours, plan-*, design-review — 1700-2500 line gstack workflows) were all false positives fixed by the guard.
- Bootstrap versions: the guard was shipped as `bootstrap/v2.3.0` (refactor) and `bootstrap/v2.4.1` (condense patch).

## Counter / Caveats

- The guard is **default-on, not mandatory**. When you own the upstream (forking gstack, or deprecating an import channel), pass `--include-external-imports` to let the scan consider them.
- A skill may claim `source_type: external-git` while the upstream has been retired — in that case the frontmatter is stale and the guard hides candidates that are actually safe to modify. Audit stale markers periodically.
- The guard does not cover MANUAL copies (someone pasted gstack content into a local skill without `source_type`). Those still show up as dedup candidates; that's a feature, not a bug — local copies *should* be consolidated.
