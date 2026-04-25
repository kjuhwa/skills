---
version: 0.1.0-draft
name: autonomous-operation-principles-for-unattended-agents
summary: Principles for unattended agent self-operation — task selection by reusability×future-value, bounded experimentation, three-piece completion ritual, and permission boundaries.
category: llm-agents
tags: [llm-agents, autonomous, unattended, governance, self-improvement]
source_type: extracted-from-git
source_url: https://github.com/lsdefine/GenericAgent.git
source_ref: main
source_commit: ec34b7e1c0f11fbb9709680ccfe313187a1b942b
source_project: GenericAgent
source_path: memory/autonomous_operation_sop.md
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# Principles for unattended autonomous-agent operation

When an agent is given permission to operate without a human in the loop — during off-hours, scheduled reflection windows, or self-improvement passes — it needs governance to avoid drifting into low-value or unsafe work. This reference distills the rules GenericAgent uses.

## Core: a task-value formula

An autonomous agent is given a budget (turns, time, cost) and must spend it on work that pays back. The value filter:

> **value = "things AI training data doesn't already cover" × "persistent benefit to future collaboration"**

Both factors are necessary:

- Something the model can regurgitate from training is worthless to *learn* — if a user asked, the model would already know.
- Something useful once but not reusable is not worth distilling into memory/skills — it's a one-off task.

The sweet spot is **hard-won specific techniques** (an exact API quirk discovered by trial, a compound workflow that combines tools in a non-obvious way, a calibration table for a device) that *future sessions can look up and skip the trial phase*.

## Startup ritual

Every autonomous session starts with two reads:

```python
from autonomous_operation_sop.helper import *
print(get_history(40))   # last 40 completed tasks — avoid repeating
print(get_todo())        # outstanding TODO items
```

- Seeing what was done recently prevents loops where the agent re-solves the same problem with slightly different framing.
- The TODO list is the preferred source of next work. One TODO per session.

## Task selection rules

1. If the TODO list has unfinished items → pick **exactly one**. Others wait for next session.
2. If TODO is empty → read the planning SOP and *plan* next work, but do not execute in the same session. Planning is a full session's worth of output.
3. **Never pick the same sub-task two sessions in a row.** Forces coverage breadth.

## Execution budget: ≤ 30 turns

Short sessions, small experiments. Don't try to boil the ocean. If the task can't fit in 30 turns, it needs a plan — which is itself the next session's job.

Small experiments drive the day: probe, hypothesize, test with a tiny script, verify by tool call (not by narration), record. Read-only conclusions are banned — the final step must exercise the theory.

## Failure has value too

Failed experiments are recorded with the same formality as successes:

> *"Tried X to solve Y; it failed because Z; the root cause was W; future work should consider V."*

Memory grows faster via failures than successes because failures encode the *boundary* of a technique. A memory system that only retains successes is incomplete.

## The three-piece completion ritual

Every autonomous session ends with exactly three actions, in order:

1. **Re-read the autonomous-operation SOP.** Forces the agent to double-check it followed the rules (not rely on memory of what it thinks the rules are).
2. **Write a report file in the working directory** with a plausible name and, if applicable, append any `memory update recommendations` at the end.
3. **Call `complete_task(title, history_line, report_path)`** — this auto-assigns a sequential report ID, moves the report to `autonomous_reports/`, prepends the history line, and (crucially) records the fact so step 2 above sees it on next session.

Then mark the TODO item as `[x]`.

The `history_line` format is strict: `type | topic | conclusion` — one line, used as the scannable summary.

## Permission boundary (three tiers)

| Tier | Requires explicit approval? | Examples |
|---|---|---|
| Autonomous | No | Read-only probes, scripts/experiments in CWD, temp file writes |
| Write-to-report | No, but action paused pending human review | Modify global memory (`global_mem.txt`), edit SOP files, install software, external API calls, delete non-temp files |
| Forbidden | Hard-no without user session | Read secrets/keys, modify core codebase, any irreversible / destructive operation |

Write-to-report tier is the key middle ground: the agent is allowed to *propose* these changes by describing them in its report, but cannot execute. The user reviews on return and approves / modifies / rejects.

## Why "don't get stuck" dominates "don't get it wrong"

The user is offline — they can't unblock the agent. Therefore:

- Decision-required issues → write them into the report for later review. Do NOT block the session.
- Hypothesis you can't verify in 30 turns → record the hypothesis and move on.
- Unexpected state → record it and continue with an adjacent task.

Hanging on a single decision wastes the whole session. Better to finish a smaller task and report the blocked item than to finish nothing.

## Anti-patterns

- Consuming the 30-turn budget on low-value work (reformatting existing memory, moving files around) just to feel productive.
- Re-doing the same task repeatedly across sessions because the history wasn't checked.
- Letting failed experiments die silently. They should produce a report, just like successes.
- Auto-modifying global memory without routing through the report-review tier.
- Using a "looks reasonable" narrative to declare success without a final tool call that exercises the claim.

## Why this works

A single autonomous session producing one well-documented artifact (success or failure) is high-leverage: the user can review in 60 seconds on return, and the next session benefits from the distilled lesson. Many small successful sessions compound. Sessions that try to be heroic usually spin out at turn 28 and leave nothing.

---

Reference extracted from GenericAgent's `autonomous_operation_sop.md` and `autonomous_operation_sop/` directory. Chinese-language original; concepts translated and generalized.
