---
version: 0.1.0-draft
name: fuzz-crash-to-fix-loop
description: "Iterative loop turning fuzz crashes into TDD'd fixes: investigate → triage → implement → return crash to seed corpus"
category: testing
tags:
  - fuzzing
  - tdd
  - triage
  - iterative-loop
  - seed-feedback
  - event-driven

composes:
  - kind: skill
    ref: testing/fuzz-corpus-seed-management
    version: "*"
    role: crash-source
  - kind: skill
    ref: debug/investigate
    version: "^1.0.0"
    role: root-cause-per-crash
  - kind: skill
    ref: debug/triage-issue
    version: "*"
    role: issue-and-plan
  - kind: skill
    ref: testing/tdd
    version: "*"
    role: fix-implementation

binding: loose

verify:
  - "every composes[].ref is installed in the hub"
  - "every composes[].version range intersects the installed version"
  - "each loop iteration has a defined start (new crash) and end (seed corpus updated)"
  - cmd: "./verify.sh"
---

# Fuzz Crash → TDD Fix Loop

> Pilot #1 was a linear pipeline, pilot #2 was a decision tree. This technique is an **event-driven iterative loop** — each crash discovered by the fuzzer triggers one cycle, and the fixed crash input returns to the seed corpus so every subsequent fuzz round regression-checks it. The loop terminates not on a wall-clock budget but on a **signal**: N consecutive clean fuzz rounds.

## When to use

- Long-running fuzz campaigns (CI fuzz bots, nightly fuzz jobs)
- Codebases where memory-safety, input-validation, or parser bugs recur
- Crashes are reproducible, but you need to judge whether near-duplicate crashes are the same root cause
- You need a long-term guarantee that the fix keeps holding — returning the crash to the corpus catches regressions that a single unit test would miss

## When NOT to use

- One-shot bug fix — the loop overhead is wasted
- No fuzz target (UI or declarative code with no input space)
- Non-deterministic crashes (timing races, memory-layout-dependent) — first make the reproducer deterministic, then enter this loop

## Loop cycle (one iteration)

```
        ┌─────────────────────────────────────────┐
        │                                         │
        │   [seed corpus]                         │
        │        │                                │
        │        ▼                                │
        │   skill: testing/fuzz-corpus-seed-      │
        │          management     (crash-source)  │
        │        │ new crash? ──no── exit         │
        │        │ yes                            │
        │        ▼                                │
        │   fingerprint dedup                     │
        │   (seen before? → skip or merge)        │
        │        │ new signature                  │
        │        ▼                                │
        │   skill: debug/investigate              │
        │          (root-cause-per-crash)         │
        │        │ 4-phase: investigate →         │
        │        │ analyze → hypothesize →        │
        │        │ implement-intent               │
        │        ▼                                │
        │   skill: debug/triage-issue             │
        │          (issue-and-plan)               │
        │        │ GitHub issue + TDD plan        │
        │        ▼                                │
        │   skill: testing/tdd                    │
        │          (fix-implementation)           │
        │        │ red → green → refactor         │
        │        ▼                                │
        │   add crash input to seed corpus ───────┘
        │
        └── (loop continues until N clean rounds)
```

## Glue summary (net value added by this technique)

The four composed skills each do their own job. What this technique uniquely adds:

| Added element | Where |
|---|---|
| Crash fingerprint dedup rule (stack-trace hash groups same crash) | Right after iteration entry |
| Promotion condition `investigate → triage-issue` ("single root cause, fix scope bounded") | End of investigate |
| Fixed crash input MUST return to seed corpus before iteration ends | Just before iteration close |
| Loop termination rule: **N consecutive clean fuzz rounds**, not wall-clock | Loop level |
| Duplicate-crash handling: same fingerprint, different discovery time → merge into existing issue | Dedup step |

The atomic skills describe **one-off procedures**. This technique **closes the cycle and carries state** (seen fingerprints, clean-rounds counter, open issue map).

## Stop conditions (explicit)

- **Normal exit**: N (default 3) consecutive fuzz rounds with no new fingerprint → end campaign, emit report
- **Time limit**: MAX_WALL_CLOCK exceeded → end + "incomplete" report
- **Manual**: CI oncall halts → finish current iteration, then end
- **Abnormal**: `triage-issue` step fails to identify root cause 3 times in a row → pause loop, flag for human review

Signal-based termination matters. Wall-clock-only termination leaves "bugs might still be there" permanently ambiguous.

## Why the crash input returns to the seed corpus

Regression-safety by construction. If a pre-fix crash input still triggers the crash after the fix is merged, the fix is wrong. Adding the input back to the seed means **every subsequent fuzz round acts as a regression test for that specific crash**. The unit test that `testing/tdd` produces is narrower — it pins the exact repro; fuzz validates the broader mutation space around it. Both are needed.

## Verification (draft)

```bash
#!/usr/bin/env bash
set -e
SKILLS_HUB="${SKILLS_HUB:-$HOME/.claude/skills-hub/remote}"
for ref in \
  "skills/testing/fuzz-corpus-seed-management/SKILL.md" \
  "skills/debug/investigate/SKILL.md" \
  "skills/debug/triage-issue/SKILL.md" \
  "skills/testing/tdd/SKILL.md"; do
  test -f "$SKILLS_HUB/$ref" || { echo "MISSING: $ref"; exit 1; }
done
echo "OK"
```

## Known limitations (v0.1 draft)

- Two composed atoms are likely `*-draft` → technique stays at `loose` binding and accepts draft atoms
- Fingerprint dedup algorithm is left to the operator — this technique recommends "stack-trace hash" but the exact choice is language- and tool-dependent
- Loop termination N (consecutive clean rounds) is recommended at 1–5, default 3; needs per-domain calibration
- Non-deterministic crashes (timing race, allocator-order dependent) are out of scope — establish a deterministic reproducer first, then enter this loop
- Seed-corpus explosion is NOT handled here — that's the responsibility of the `fuzz-corpus-seed-management` skill itself
- GitHub issue growth in high-crash environments may need autolabel/milestone automation — candidate for a separate sibling technique

## Provenance

- Authored: 2026-04-24
- Status: pilot #3 for the `technique/` schema v0.1 — **event-driven iterative loop** shape (complementary to pilot #1 linear pipeline and pilot #2 decision tree)
- Schema doc: `docs/rfc/technique-schema-draft.md`
- Sibling pilots:
  - `technique/workflow/safe-bulk-pr-publishing/TECHNIQUE.md` (linear)
  - `technique/debug/root-cause-to-tdd-plan/TECHNIQUE.md` (decision tree)
