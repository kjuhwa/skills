---
version: 0.1.0-draft
name: root-cause-to-tdd-plan
description: Bug report → systematic root-cause investigation → classified fix path → GitHub issue with TDD test plan
category: debug
tags:
  - debug
  - root-cause
  - triage
  - tdd
  - github-issue
  - decision-tree

composes:
  - kind: skill
    ref: debug/investigate
    version: "^1.0.0"
    role: phase-orchestrator
  - kind: skill
    ref: debug/build-error-triage
    version: "^1.0.0"
    role: branch-build-error
  - kind: skill
    ref: debug/triage-issue
    version: "*"
    role: artifact-producer
  - kind: knowledge
    ref: pitfall/ai-guess-mark-and-review-checklist
    version: "*"
    role: hypothesis-guard

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "every leaf of the decision tree terminates in a GitHub issue or an explicit non-fix decision"
---

# Root Cause → TDD Fix Plan

> A decision tree that takes an error/bug report through **systematic root-cause investigation → classification-driven path → GitHub issue with TDD test plan**. Designed to carry an unclear incident all the way to a safe fix plan without shortcuts.

<!-- references-section:begin -->
## Composes

**skill — `debug/investigate`**  _(version: `^1.0.0`)_
phase-orchestrator

**skill — `debug/build-error-triage`**  _(version: `^1.0.0`)_
branch-build-error

**skill — `debug/triage-issue`**  _(version: `*`)_
artifact-producer

**knowledge — `pitfall/ai-guess-mark-and-review-checklist`**  _(version: `*`)_
hypothesis-guard

<!-- references-section:end -->

## When to use

- A bug/incident report with observable symptoms but unclear cause
- Situations where "patch without understanding" must be avoided
- When the deliverable must be a **GitHub issue with an embedded TDD plan**

## When NOT to use

- Obvious one-line fixes (the overhead is too high)
- In-production hotfixes — this technique is investigation-first and therefore slow
- Irreproducible one-off incidents (use a different triage pattern)

## Decision tree (non-linear, unlike pilot #1)

```
[bug report]
    │
    ▼
┌─────────────────────────────────────────────┐
│ skill: debug/investigate  (phase-orchestrator) │
│ 4-phase loop: investigate → analyze →       │
│ hypothesize → implement                      │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴───────┐
       │ hypothesize   │  ←── knowledge: ai-guess-mark-and-review-checklist
       │ phase         │       (hypothesis-guard: mark guesses, re-review)
       └───────┬───────┘
               │ root cause classified
               │
       ┌───────┴────────────────────┐
       ▼                            ▼
 [build/compile error]         [runtime/logic bug]
       │                            │
       ▼                            ▼
 skill: debug/build-error-triage    skill: debug/triage-issue
 (branch-build-error)               (artifact-producer)
       │                            │
       └──────────────┬─────────────┘
                      ▼
         [GitHub issue + TDD test plan]
```

## Glue summary (net value added by this technique)

The composed atoms each stand alone. What this technique uniquely adds:

| Added element | Where |
|---|---|
| Routing rule between atoms (build-error vs runtime-bug) | End of the hypothesize phase |
| Promotion condition from `investigate.hypothesize` → `triage-issue` | "root cause identified AND fix scope clear" |
| Mandatory application of `ai-guess-mark-and-review-checklist` | Entry to every hypothesize phase, over every hypothesis |
| Output contract | Every leaf of the tree ends in either "GitHub issue + TDD plan" or "explicit non-fix decision" |

The composed skills describe **how** to perform each step; this technique describes **when and why** to move from one to the next.

## Hypothesis-guard integration

`ai-guess-mark-and-review-checklist` is a checklist. This technique enforces:

- Apply the checklist to **every hypothesis** produced by `investigate.hypothesize`
- A hypothesis that fails the checklist must not proceed to the implement phase
- Failure reasons are logged in the GitHub issue body under a "Rejected Hypotheses" section (audit trail)

## Output contract

`triage-issue` produces a GitHub issue with flexible formatting. This technique pins required sections:

1. Symptom (user observation)
2. Root Cause (conclusion from the investigate phase)
3. Rejected Hypotheses (checklist failures)
4. Fix Plan (TDD order: failing test → minimal impl → refactor)
5. Rollback conditions

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/debug/investigate/SKILL.md" \
  "skills/debug/build-error-triage/SKILL.md" \
  "skills/debug/triage-issue/SKILL.md" \
  "knowledge/pitfall/ai-guess-mark-and-review-checklist.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- Two of the composed atoms are `0.1.0-draft`, so this technique is pinned to draft status
- The decision-tree branching is expressed only in prose (no structured DSL). The v0 schema treats `composes[]` as an unordered bag; pilot #1 (linear) and pilot #2 (branching) both fit this form. A DSL is deferred to v0.2.
- `loose` binding — a major-version bump on `investigate`'s 4-phase structure forces re-validation of the whole flow
- Even within runtime bugs, some subclasses (memory leaks, race conditions) can exceed `triage-issue`'s TDD scope. Those cases need a separate technique (v0.2).

## Provenance

- Authored: 2026-04-24
- Status: **pilot #2** for the `technique/` schema v0.1 — decision-tree shape (vs pilot #1 linear pipeline)
- Schema doc: `docs/rfc/technique-schema-draft.md`
- Sibling pilot: `technique/workflow/safe-bulk-pr-publishing/TECHNIQUE.md`
