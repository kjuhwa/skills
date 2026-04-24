# RFC: `technique/` — Middle Layer Between Skills and Examples

- **Status**: draft v0.1
- **Target repo**: `kjuhwa/skills-hub`
- **Author**: kjuhwa@nkia.co.kr
- **Date**: 2026-04-24
- **Local evidence**: 2 pilots, 4 slash commands, schema doc — all validated offline before this RFC

> **Reviewer note**: this RFC exists because the skills-hub currently has atomic units (`skills/`, `knowledge/`) and complete artifacts (`example/`) but no **reusable composition layer**. Users repeatedly compose the same 2-5 atoms into recipes by hand. This proposes formalizing that recipe as a first-class hub concept.

## 1. Problem

Today:

```
knowledge ──┐
skill     ──┤──► [user assembles by hand, every time] ──► example
research  ──┘
```

Every time you want "build many projects in parallel, publish to a shared repo safely" you mentally reassemble the same set:

- `skills/parallel-build-sequential-publish`
- `skills/workflow/rollback-anchor-tag-before-destructive-op`
- `knowledge/workflow/batch-pr-conflict-recovery`
- `knowledge/pitfall/gh-pr-create-race-with-auto-merge`

`hub-merge` solves half of this — but it **absorbs and destroys** the atoms. A composition that preserves atom independence (so other compositions can also use them) has no home today.

## 2. Proposal

Add `technique/` as a first-class hub directory:

```
knowledge ──┐
skill     ──┤──► technique (by reference) ──► example (instance)
research  ──┘
```

Key property: technique **references** atoms, never copies them.

### Directory

```
technique/
  <category>/
    <slug>/
      TECHNIQUE.md          # required
      verify.sh             # optional
      resources/            # optional
```

Categories reuse the existing `CATEGORIES.md` (no new enum values).

### Frontmatter

```yaml
---
version: 0.1.0
name: <slug>
description: <≤120 chars>
category: <CATEGORIES.md>
tags: [...]

composes:
  - kind: skill            # skill | knowledge (technique is banned in v0 to prevent nesting)
    ref: <kind-root-relative path>    # see §4 finding below
    version: "^1.0.0"
    role: <free-text label for the atom's job>
  - ...

binding: loose              # loose (default, semver range) | pinned (exact)

verify:
  - <human-readable check> | { cmd: ./verify.sh }
---
```

### Registry (schema bump v2 → v3)

`registry.json` gains a `techniques` section parallel to `skills`/`knowledge`, with a `composes_snapshot` capturing resolved versions at install time — supporting `loose` binding without a separate lockfile.

### Index (`index.json`)

Add a `technique` kind to the master/lite/category indexes. `/hub-find` treats all three kinds (skill, knowledge, technique) uniformly with a `kind` badge on results.

## 3. Pilot Evidence (n=2)

Two pilots authored locally, both pass the proposed `/hub-technique-verify` rules. Shapes intentionally chosen to diverge:

| | Pilot 1: `safe-bulk-pr-publishing` | Pilot 2: `root-cause-to-tdd-plan` |
|---|---|---|
| Category | workflow | debug |
| Shape | Linear pipeline (phase 0→1→2→3) | Decision tree with branches |
| Composes | 2 skills + 2 knowledge | 3 skills + 1 knowledge |
| Novel glue | Race-aware PR creation loop, N≥3 conflict-storm trigger | build-error vs runtime-bug branching, hypothesis-guard mandate |

**Finding**: the same frontmatter schema absorbs both shapes without modification. The `role` free-text field carries the structural difference ("orchestrator" vs "phase-orchestrator" / "branch-build-error" / "hypothesis-guard"). No DSL needed in v0.

## 4. Unexpected Finding (affects schema, already folded in)

During pilot 1 authoring, discovered that `skills/parallel-build-sequential-publish/` is at the **root of `skills/`**, not nested under its declared `category: workflow`. This caused the first verify pass to fail.

**Conclusion**: `ref` must be defined as **kind-root-relative physical path**, not `{category}/{slug}` semantic form. Frontmatter category and filesystem path can legally diverge in the hub (legacy or publishing oversight). The schema specifies the physical form; verify walks the actual tree.

This is a **finding that a paper-only design would have missed**. It also suggests a separate cleanup PR to realign path with category for the offending skill(s), but that's out of this RFC's scope.

## 5. Migration Plan

Zero-disruption rollout:

1. Merge this RFC with the directory + schema only. No enforcement yet.
2. Land `bootstrap/commands/hub-technique-*.md` in a follow-up PR (4 commands: list, verify, show, compose).
3. Accept pilot #1 and #2 as the first two real techniques (separate PRs, normal review).
4. After 2-3 more techniques land, extend `/hub-find`, `/hub-status`, `/hub-precheck` to recognize `technique` kind.
5. `registry.json` stays schema v2 until step 4; existing installs unaffected.

Rollback: removing the `technique/` directory at any step leaves skills/knowledge/example untouched. `registry.json` v2 readers ignore an unknown `techniques` key.

## 6. Slash Commands (follow-up PR)

Already authored and locally validated:

| Command | Role |
|---|---|
| `/hub-technique-compose <slug>` | Interactive authoring (AskUserQuestion-driven) |
| `/hub-technique-verify <slug>\|--all` | Schema §9 rules enforcement |
| `/hub-technique-list` | Local state readout |
| `/hub-technique-show <slug>` | Print + composition expansion |

Out of v0 scope: `/hub-technique-install`, `/hub-technique-publish`, `/hub-find` kind extension.

## 7. Open Questions for Reviewers

1. **Nesting**: should v0 allow technique-to-technique composition? (Proposed: NO. Risk of cycles, over-coupling. Revisit v0.2.)
2. **`role` field**: free-text now. Should a controlled vocabulary ("orchestrator", "guard", "recovery", "branch", "artifact") be proposed? (My view: NO, free-text has done the work across 2 divergent pilots. Adding taxonomy prematurely is overfit.)
3. **example ↔ technique link**: add `produced_by_technique: <ref>` to `example/` frontmatter? (My view: yes, as a separate small PR.)
4. **verify.sh portability**: require POSIX bash only, or allow pwsh too? (My view: POSIX only for v0. Windows users already use bash via git.)
5. **Cleanup PR for path/category divergence** (§4): should this RFC mandate it? (My view: no. Surface it in the RFC, let maintainer decide scope.)

## 8. Local Artifacts Available for Review

Placed alongside this RFC in the RFC author's working directory:

- `technique-schema-draft.md` — full schema spec
- `.technique-draft/workflow/safe-bulk-pr-publishing/TECHNIQUE.md` — pilot 1
- `.technique-draft/debug/root-cause-to-tdd-plan/TECHNIQUE.md` — pilot 2
- `.claude/commands/hub-technique-{compose,verify,list,show}.md` — commands

Willing to move any of these into this PR or split into follow-ups per reviewer preference.

## 9. What This RFC Does NOT Do

- Not publishing pilots into the real `technique/` directory.
- Not modifying `/hub-find`, `/hub-status`, `/hub-precheck`.
- Not bumping `registry.json` schema (step 4).
- Not enforcing anything. Directory + schema + verify rules only.

---

**Request**: approve the directory, schema, and v0 rules. Subsequent work lands in smaller PRs per §5.
