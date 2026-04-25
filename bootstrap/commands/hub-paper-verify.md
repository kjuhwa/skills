---
description: Validate a paper against schema v0.2 — structure only (premise, examines, perspectives, description, name, status, type, experiments, requires). No substance checks.
argument-hint: <slug> | --all [--strict]
---

# /hub-paper-verify $ARGUMENTS

Run schema v0.2 §6 rules against one paper (or all). **Structure-only by design** — this command does NOT evaluate the correctness of the premise, the accuracy of the perspectives, or the truth of the external_refs.

## Input resolution

- `<slug>`: locate first match in `./.paper-draft/**/<slug>/PAPER.md`, then `~/.claude/papers/**/<slug>/PAPER.md`
- `--all`: verify every paper in both locations

## Checks

### v0.1 rules (rules 1-8)

1. **Frontmatter well-formed**: YAML parses; required keys: `version`, `name`, `description`, `category`, `premise`, `examines`, `perspectives`, `status`.
2. **Premise non-empty**: both `premise.if` and `premise.then` present, ≥1 char after strip.
3. **Examines non-empty + resolve**: `examines[]` length ≥1; every `ref` resolves:
   - `kind: skill` → `skills/<ref>/SKILL.md`
   - `kind: knowledge` → `knowledge/<ref>.md`
   - `kind: technique` → `technique/<ref>/TECHNIQUE.md`
   - `kind: paper` → `paper/<ref>/PAPER.md` (v0.2.1: paper-to-paper citations are first-class; the original v0 ban was lifted because citations are flat references, not compositional nesting)
4. **Perspectives ≥ 2**: WARN at 1 (upgraded to FAIL under `--strict`)
5. **Description length**: ≤120 chars (WARN if exceeded unless `--strict`)
6. **Name matches folder**: `name` == containing directory name
7. **Status enum**: `status` ∈ {`draft`, `reviewed`, `implemented`, `retracted`}
8. (No check on `external_refs` URL reachability — too flaky)

### v0.2 additions (rules 9-15)

9. **Type enum**: `type` ∈ {`hypothesis`, `survey`, `position`}. Missing `type` defaults to `hypothesis` (backward-compat).
10. **Implemented-status proof**: for `type=hypothesis`, `status=implemented` requires at least one `experiments[]` entry with `status=completed`, non-null `result`, and `supports_premise` set to yes/no/partial. `type=survey` and `type=position` are exempt.
11. **Retraction requires reason**: `status=retracted` requires non-null `retraction_reason`.
12. **Requires refs resolve**: every `proposed_builds[i].requires[j].ref` resolves on disk (kind restricted to skill/knowledge/technique — no paper nesting).
13. **Non-triviality WARN**: emitted when any `proposed_builds[i].requires[]` is empty or contains a single ref that also appears in `examines[]` unchanged. Includes the build slug.
14. **Built-as resolves**: `experiments[i].built_as` if present must resolve to `example/<ref>/`. Missing build with `status=completed` is a WARN.
15. **Completed experiment completeness**: `experiments[i].status=completed` requires `result`, `supports_premise`, and `observed_at` all non-null.

### v0.2.1 (opportunistic)

- `outcomes[].kind` accepts `produced_example` alongside the core enum (formalized via schema update; older consumers just ignore unknown kinds).
- Duplicate top-level frontmatter keys FAIL (global rule inherited from `_lint_frontmatter.py`).

### What is NOT verified (intentionally)

- `premise` content correctness
- `perspectives[].summary` accuracy
- `external_refs[]` URL reachability, quality, or relevance
- Whether an experiment's `result` supports its claim (reviewer job)
- Whether `outcomes[]` were genuinely caused by the paper (authors can overclaim)

## Output format

Per paper:
```
PAPER: <category>/<slug>  (v<version>, type=<type>, status=<status>)
  [PASS]  frontmatter well-formed
  [PASS]  premise.if/then non-empty
  [PASS]  examines[0] workflow/safe-bulk-pr-publishing → technique/workflow/...
  [PASS]  perspectives: 4 (≥2 required)
  [PASS]  type=hypothesis
  [WARN]  proposed_builds[2].requires is empty — non-triviality guard
  [PASS]  experiments[0].status=completed, result non-null, supports_premise=partial, observed_at=2026-04-24
  [PASS]  status=implemented (hypothesis type + 1 completed experiment)
RESULT: PASS (1 warning)
```

With `--all`, end with aggregate: `<K> papers verified: <pass> pass, <warn> warn, <fail> fail`.

## Exit behavior

- Any `FAIL` → overall failure
- `WARN` only → pass with advisory
- `--strict` upgrades all `WARN` to `FAIL`

## Rules

- Read-only. No mutation.
- Does NOT fetch remote. Assumes `~/.claude/skills-hub/remote/` is current.
- Never auto-fix. Gatekeeper only.

## Why exists

The paper schema deliberately avoids substance verification so exploratory content survives. But structure still matters — a paper with no premise, one perspective, or unresolved citations doesn't meet the definition. This command enforces that floor without rising above it.
