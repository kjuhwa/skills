---
name: plan-based-multi-step-task-decomposition
description: Plan mode for multi-step agent tasks — exploration via subagent, gated planning with user confirmation, strict execution loop, and adversarial verification.
category: llm-agents
version: 1.0.0
tags: [llm-agents, planning, subagents, verification, orchestration]
source_type: extracted-from-git
source_url: https://github.com/lsdefine/GenericAgent.git
source_ref: main
source_commit: ec34b7e1c0f11fbb9709680ccfe313187a1b942b
source_project: GenericAgent
source_path: memory/plan_sop.md, memory/subagent.md
imported_at: 2026-04-18T00:00:00Z
confidence: high
version_origin: extracted
---

# Plan-based multi-step task decomposition

A five-phase orchestration pattern for agents handling non-trivial tasks: exploration (delegated), planning (gated by a user-confirm step), execution (strict tick-off loop), verification (adversarial subagent), and fix loop (bounded). Designed to keep the main agent's context window clean and force evidence-based completion.

## When to use

Trigger when the task is 3+ dependent steps, crosses multiple files, has conditional branches, or can benefit from parallelism. **Skip** for 1–2 step trivial work — the overhead dominates.

## Artifact layout

```
plan_<TASK>/
├── plan.md                        ← the living plan (source of truth)
├── exploration_findings.md        ← produced by exploration subagent
├── verify_context.json            ← input to verification subagent
├── result.md                      ← verification subagent's verdict + evidence
└── ... (any task-specific scratch files)
```

## Phase 1 — Exploration (mandatory, delegated)

**Hard rule: the main agent MUST NOT do environment probing itself.** The main agent creates the directory, indexes available SOPs, and launches an exploration subagent. The main agent's context window is the scarcest resource; long probe outputs would crowd out planning and execution.

The exploration subagent is invoked read-only with a `--verbose` surveillance flag so the main agent can inspect raw tool output (not just summaries). It writes to `exploration_findings.md` with sections: `## Current environment` / `## Key findings` / `## Risks & unknowns`. It is bounded to ≤10 tool calls.

While it runs, the main agent actively **watches output**, does NOT blindly sleep-poll. Intervention files let the main agent steer without restarting:

| File | Effect |
|---|---|
| `_intervene` | Append extra instructions to correct direction |
| `_keyinfo` | Inject working-memory context the subagent lacks |
| `_stop` | Terminate at next round boundary (save turns) |

## Phase 2 — Planning (gated by user confirmation)

Main agent reads the domain SOPs matched in Phase 1 and writes `plan.md`. The plan header includes:

- `# Task title` (one-line purpose)
- `## Exploration findings` (copied/summarized from the subagent)
- `## Execution plan` with numbered steps, each carrying a status marker:

| Marker | Meaning |
|---|---|
| `[ ]` | Pending |
| `[✓]` | Done (append a short outcome) |
| `[✗]` | Failed, skipped |
| `[D]` | Must be delegated to a subagent (>3 files / >100 lines read / web scrape / 3+ repeats / build-analysis) |
| `[P]` | Parallel (multiple subagents, map-mode) |
| `[?]` | Conditional branch — must list branches + conditions |
| `[VERIFY]` | Verification checkpoint (cannot be skipped) |

`[VERIFY]` is a **required** step at the bottom of every plan: `run verification subagent → read VERDICT → act accordingly`.

The plan.md MUST embed its own execution protocol as a comment at the top — the main agent re-reads this every turn so it cannot drift into memory-based execution:

```markdown
<!-- EXECUTION PROTOCOL (re-read EVERY turn)
1. read plan.md, find first [ ]
2. if it has an SOP tag → read the SOP's quick-lookup section
3. execute the step + a mini validation of the output
4. patch [ ] → [✓ short result], go back to step 1
5. after last step → terminal check: re-read plan.md, confirm 0 remaining [ ]
FORBIDDEN: executing from memory | skipping verification | declaring done without terminal check | pausing to output prose summaries
-->
```

Before leaving the planning phase the main agent walks a self-check list (every exploration finding reflected? every step has a reasonable SOP? dependencies explicit? `[D]` markers applied where the step is heavy? `[VERIFY]` present?). Then it asks the user to confirm — **no execution without confirmation.**

## Phase 3 — Execution (strict tick loop)

Each turn: read `plan.md`, find first `[ ]`, read its SOP, execute (respecting `[D]`/`[P]` delegation), mini-validate, patch to `[✓ …]`, loop immediately. No prose progress reports between ticks. No tick-from-memory.

**Dynamic delegation:** even for steps not marked `[D]`, if execution discovers the step requires reading lots of files, long debug loops, or web scraping, spin up a subagent on the fly and ask it for a brief summary. Keeping the main agent's context clean is first-priority.

## Phase 4 — Verification (adversarial subagent, mandatory)

After the last substantive step is `[✓]`, the main agent populates `verify_context.json`:

```json
{
  "task_description": "user's original request, verbatim",
  "plan_file": "/abs/path/plan_XXX/plan.md",
  "task_type": "code|data|browser|file|system",
  "deliverables": [{"type": "...", "path": "...", "expected": "..."}],
  "required_checks": [{"check": "...", "tool": "..."}]
}
```

It then launches a **separate** verification subagent with an adversarial brief: "Your job is to *disprove* that the deliverables work." The subagent must actually run tools — narration without tool output is treated as SKIP, not PASS. The last line of `result.md` MUST be `VERDICT: PASS` / `FAIL` / `PARTIAL`.

Critically: the verification context does NOT include the execution history or debug notes. The verifier gets only the original task statement, the plan, the deliverables list, and the required-check list. This prevents context contamination and confirmation bias from the implementation phase.

## Phase 5 — Fix loop (bounded)

| Verdict | Action |
|---|---|
| `PASS` | Mark `[VERIFY]` as `[✓]`, update the long-term checkpoint, announce completion |
| `FAIL` | Append failed items to plan as `[FIX]` steps; re-execute only those; re-run verification — max 2 rounds before escalating to user |
| `PARTIAL` | Main agent judges if the partials are acceptable; otherwise treat as FAIL |
| (missing) | Extract verdict signal from raw output; if ambiguous, main agent decides |

## Why this works

- **Exploration delegation** protects the main agent's context window; the main agent spends its tokens on decisions, not data.
- **User-confirmation gate** forces a plan review before any work — the plan is cheap to throw away, the execution is not.
- **Plan-as-source-of-truth** + re-read-every-turn prevents LLM drift and "I think I already did that."
- **Adversarial verification** in a fresh subagent eliminates the confirmation bias the executing agent has.
- **Bounded fix loop** prevents infinite retry cycles.

## Anti-patterns

- Main agent skips exploration and "just looks at the code briefly." This is where the context starts to fill with noise.
- Verification done by the same agent that executed the work. Confirmation bias wins.
- Plan without a `[VERIFY]` step. The agent will self-certify completion.
- Batch-ticking multiple `[ ]` → `[✓]` between turns. Breaks the tick loop's invariants.
- User-confirmation skipped "because it's obvious." Obvious plans can still be wrong.

---

Adapted from GenericAgent's `plan_sop.md` and `subagent.md`. Original files are Chinese-language; concepts translated and generalized for reuse.
