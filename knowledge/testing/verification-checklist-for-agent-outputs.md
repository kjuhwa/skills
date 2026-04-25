---
version: 0.1.0-draft
name: verification-checklist-for-agent-outputs
summary: Adversarial verification checklist for LLM-agent deliverables — must-run actions per product type, required adversarial probes, and strict VERDICT output format.
category: testing
tags: [testing, verification, llm-agents, adversarial, quality-gates]
source_type: extracted-from-git
source_url: https://github.com/lsdefine/GenericAgent.git
source_ref: main
source_commit: ec34b7e1c0f11fbb9709680ccfe313187a1b942b
source_project: GenericAgent
source_path: memory/verify_sop.md
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# Verification checklist for agent outputs

A checklist for the *verifier* role when reviewing an LLM-agent's deliverables. Designed as a separate role (run in its own subagent/context, no memory of the implementation phase) to prevent confirmation bias. Not a style guide — a failure-mode checklist.

## The two failure modes this defends against

1. **Verification avoidance.** The verifier reads the code and describes what it *would* do, then writes PASS. Reading code is not verification.
2. **"First 80% fools you."** Some tests pass, some features work, so the verifier declares PASS — without noticing that half the functionality is hollow. **The verifier's job is the last 20%.**

The implementer may well be another LLM. Its test suite was written by that same LLM. If the tests pass, you have learned one thing: the tests the implementer thought of, passed. That says nothing about the tests it *didn't* think of.

## Iron rules (violation → VERDICT is invalid)

1. **Must run.** What can run must be run. What can be seen must be screenshotted.
2. **Must have tool evidence.** A PASS with no tool output equals SKIP.
3. **Independent verification.** The test suite is *context*, not *evidence*. Adversarial probes are mandatory.

Self-check during verification: *"am I writing prose instead of calling tools?"* If yes — stop, call tools.

## Recognize your own rationalizations

| Rationalization | The correct counter |
|---|---|
| "The code looks right" | Run it. |
| "Tests already pass" | The implementer is an LLM. Independently verify. |
| "Should be fine" | "Should" ≠ "verified." Run it. |
| "I don't have a browser/tool" | Did you actually enumerate available tools? |

## Verification actions by deliverable type

Severity scales with risk. These are **minimum** — add more when the stakes are higher.

| Product type | Required checks |
|---|---|
| Web / frontend | Open + screenshot → inspect console errors → curl subresources to rule out empty-shell skeletons |
| CLI script | Execute → inspect stdout/stderr/exit code → re-run with boundary inputs |
| Data file | Schema/format check → row count → sample first / middle / last 3 rows |
| API / service | Call the endpoint → validate *response shape* (not just HTTP 200) → test error inputs |
| Config / doc | Full `file_read` of content → format/syntax check → confirm you didn't break existing conventions |
| Bug fix | Reproduce the original bug first → verify fix → regression test |
| Batch operation | Total count → sample first/middle/last → check for duplicates/omissions → verify consistency on mid-run failure |

## Adversarial probes (pick ≥ 1 — otherwise you only confirmed the happy path)

- **Boundary values:** zero, empty string, very long, unicode/emoji.
- **Idempotency:** run the same operation twice; second call should be safe.
- **Missing dependency:** what if a file / env var / service is absent?
- **Orphan IDs:** pass an ID that doesn't exist; confirm graceful handling.

## Pre-VERDICT self-audit

**Before PASS:** Does every step have command output? Did you run at least one adversarial probe? Did you verify independently of the implementer's tests?

**Before FAIL:** Is the "bug" actually intentional behavior (check comments, docs, CLAUDE.md)? Is it already covered by an existing guard/check?

## Output format

```
| # | Action | Tool | Key output summary | PASS/FAIL |
```

One row per check. Each row must include: the command run, the observed output, the result.

Final verdict is a **literal string**, no variants, no embellishment:

- `VERDICT: PASS` — all critical checks passed.
- `VERDICT: FAIL` — at least one critical issue; append failure items + reproduction steps.
- `VERDICT: PARTIAL` — PASS on most, blocked on environmental reasons from fully checking the rest (explain why).

## Why the format matters

The main agent reads `result.md`'s last line programmatically. Any variant of "Verdict: Pass" or "Mostly PASS" will fail to match and be treated as an invalid outcome. Enforcing `VERDICT: PASS|FAIL|PARTIAL` as the literal final line makes the handoff machine-parseable.

## Why this works (the design principle)

Verifiers in the same context as implementers inherit the implementer's assumptions about what "done" means. The only way to catch the blind spots is to run a separate process with a different prompt ("your job is to prove this is broken") and a different working memory ("only the task statement, the deliverables, and the checklist — no implementation history"). This checklist is what that separate process reads first.

## Related

- See `plan-based-multi-step-task-decomposition` (skill) for how the plan's `[VERIFY]` step wires this verifier in.

---

Reference extracted from GenericAgent's `verify_sop.md`. Chinese-language original; translated and reflowed for reuse.
