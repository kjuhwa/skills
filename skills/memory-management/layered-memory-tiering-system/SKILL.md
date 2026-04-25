---
name: layered-memory-tiering-system
description: Hierarchical L1/L2/L3/L4 memory architecture for long-running LLM agents, anchored by action-verified facts and explicit garbage-collection rules.
category: memory-management
version: 1.0.0
tags: [llm-agents, memory, long-running, persistent-context, knowledge-management]
source_type: extracted-from-git
source_url: https://github.com/lsdefine/GenericAgent.git
source_ref: main
source_commit: ec34b7e1c0f11fbb9709680ccfe313187a1b942b
source_project: GenericAgent
source_path: memory/memory_management_sop.md
imported_at: 2026-04-18T00:00:00Z
confidence: high
version_origin: extracted
---

# Layered memory tiering system for LLM agents

A persistent-agent memory architecture split into four tiers, governed by four core axioms. Lets an agent keep a durable, auditable knowledge base without letting the context window (or the memory files themselves) drift into unverifiable mush.

## When to use

- You are running an agent that **outlives a single session** (scheduler, daemon, reflective loop, long-running CLI) and needs to remember environment facts and past-learned lessons.
- The agent has a finite context window and must pick what to load on demand.
- You've already tried "one big markdown file" and watched it rot into contradictions and unverifiable hearsay.

## Core axioms

1. **Action-Verified Only.** Only write facts to durable memory that came out of a *successful tool call* (shell exit 0, file read confirmed, test passed). Never commit the model's intrinsic knowledge, speculation, unexecuted plans, or unverified hypotheses. Slogan: *No execution, no memory.*
2. **Sanctity of Verified Data.** Once a fact is action-verified, it cannot be silently deleted during GC. It may be compressed, rephrased, or demoted between tiers, but not dropped. Patch small, never wholesale-overwrite.
3. **No Volatile State.** Never store data that changes rapidly over time/sessions (current timestamps, PIDs, one-off session IDs, ephemeral absolute paths). These pollute memory with lies.
4. **Minimum Sufficient Pointer.** Upper tiers only keep the shortest identifier needed to locate the detail in a lower tier. One extra word is redundancy.

## Tier architecture

```
L1: global_mem_insight.txt   (navigation index - HARD CAP ≤30 lines / <1k tokens)
      ↓ pointer
L2: global_mem.txt           (factual-facts layer - grows with environment)
      ↓ reference
L3: memory/                  (task-level artifacts: *_sop.md, *.py, ...)
      ↓
L4: memory/L4_raw_sessions/  (raw historical session transcripts, auto-collected)
```

### L1 — global index (30-line ceiling)

- Pure keyword→location map. Two zones: *high-frequency* entries (direct `key → sop/py name`) and *low-frequency* entries (keyword only; force a read on L2/L3 when needed).
- A `[RULES]` section holds compressed anti-footgun rules: red-line rules (violations crash things), stealth red-lines (violations silently produce wrong output), and high-frequency error points.
- **Forbidden on L1**: how-to details, task-specific technical details, logs, secrets (API keys, passwords).

### L2 — global facts (accepts growth)

- `## [SECTION]`-organized entries. Paths, credentials, ports, constants, environment-specific facts the model cannot zero-shot reproduce.
- When L2 gains/loses a section, update L1's matching pointer line (navigation only — never copy the fact itself).

### L3 — task-level concise records

- Only covers info that is (a) cross-session useful *and* (b) expensive to rebuild from scratch.
- Two forms: `*_sop.md` SOP files (shortest possible "key preconditions + typical pitfalls" list, no tutorials) and `*.py` helper scripts that encapsulate nontrivial reusable logic.
- Avoid routine operational steps and anything the agent can re-discover cheaply.

### L4 — raw session history

- Auto-collected transcripts from a reflection/scheduler process. Never hand-curated. Used for retrospective context retrieval.

## Sync rules (L1 ↔ L2/L3)

| Event | L1 update |
|---|---|
| New L2/L3 scenario added | Assess frequency: high → first-zone `key→value`; low → second-zone keyword only |
| L2/L3 scenario deleted | Remove matching L1 keyword / mapping line |
| L2/L3 value edited but scenario unchanged | No L1 change |
| New general anti-footgun rule discovered | Compress to one sentence in `[RULES]` |

L1 only holds keywords and names — never the details themselves.

## Decision tree: "where does this fact go?"

```
Is it an environment-specific fact? (IP, non-standard path, credential, ID, API key —
                                     zero-shot un-generatable)
  ├─ YES → L2, then index into L1 (zone chosen by access frequency)
  └─ NO
      ├─ Is it a general anti-footgun rule? → L1 [RULES] (one compressed sentence)
      └─ Is it a task-specific technique hard-won through trial and future-reusable?
          ├─ YES → L3 as SOP or helper script
          └─ NO  → "general knowledge" / redundant. DO NOT STORE.
```

## Implementation checklist

- [ ] Pick concrete file paths for L1/L2/L3 and the raw-session directory.
- [ ] Write a line-count check into your agent's startup or lint path — abort/warn if L1 exceeds 30 lines.
- [ ] Define the "action-verified" predicate for your tool protocol (e.g., tool returned a non-error outcome AND wrote at least one artifact).
- [ ] Set up a reflection job to harvest L4 transcripts without asking the main agent.
- [ ] Document the decision tree where the agent can re-read it — it's a recurring hot loop during GC.

## Anti-patterns

- L1 > 30 lines: the index is larger than some of the SOPs it points to. Refuse to grow — compress or demote instead.
- Storing "what the model thinks the path probably is." That's a guess, not a fact. Run the command, then record.
- Deleting old L3 artifacts during cleanup because "they look outdated." If an SOP is stale, patch it; do not drop it.
- Storing current session IDs / live PIDs / "last-observed" timestamps in L2. These belong in volatile working state, not durable memory.

## Why this works

The separation of *navigation* (L1) from *facts* (L2) from *task detail* (L3) mirrors how a developer uses a file tree: you keep an index in your head, you open the file when you need the fact. The axioms ensure the agent does not manufacture false memory, and the sync rules keep the index honest as the underlying content evolves.

---

Adapted from GenericAgent's `memory_management_sop.md`. Original file is Chinese-language; concepts translated and generalized for reuse.
