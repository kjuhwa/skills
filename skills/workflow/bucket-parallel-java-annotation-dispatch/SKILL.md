---
name: bucket-parallel-java-annotation-dispatch
description: For bulk Java annotation work (200+ @Operation methods across many controllers, or 500+ @Schema fields across many DTOs), dispatch N parallel executor subagents with disjoint file buckets. Leader runs a single compile at the end; agents never run gradle themselves.
category: workflow
tags: [parallel-agents, java, annotation, spring, swagger, gradle]
triggers:
  - "bulk annotation"
  - "전수 적용"
  - "controller 전체 주석"
  - "DTO @Schema 전수"
scope: user
version: 1.0.0
---

# Bucket-parallel dispatch for bulk annotation

A single subagent hitting 200+ `@Operation` methods degrades in quality or stalls. Parallelism is essential — but parallel agents running gradle simultaneously fight over the daemon and cache.

## Dispatch pattern

1. **Count the work first.** `grep -c "@GetMapping\|@PostMapping\|..."` per file to size buckets.

2. **Split files into N buckets by op-count.** Target ~40–50 ops per bucket. For this project size (≈200 ops across 15 controllers), 5 buckets works:
   - Biggest single controller alone (e.g. CustomMonitorController 47 ops) → one bucket.
   - Group remaining controllers to roughly equalize ops per bucket.

3. **Dispatch N executor agents in parallel** in a single message (multiple Agent tool calls). Each agent gets:
   - Explicit file list (no overlap with other agents).
   - The full annotation spec (operationId/@Parameter/@ApiResponses rules).
   - **Explicit instruction: do NOT run `./gradlew`** — leader compiles once at the end.
   - Any cross-bucket concerns (e.g., collision resolution) documented.

4. **Leader compiles once** after all agents report completion:
   ```bash
   ./gradlew compileJava -x test -q
   ```

5. If an agent's summary hints at incomplete work but is marked "completed" (e.g., "Now let me build…" followed by termination), check on-disk artifact before moving on — may need to SendMessage the agent id to finalize.

## DTO bucketing

Same principle for DTO @Schema work — split by subpackage:
- `dto/` (root)
- `dto/configuration/`
- `dto/custommonitor/ + custommonitortemplate/`
- `dto/customscript/`

## Why not a single agent

- Single agent with >100 file edits hits timeouts or produces lower quality on later files.
- Context budget: each agent runs with fresh context, avoiding cumulative bloat in the leader.

## Why agents shouldn't run gradle

- Parallel gradle invocations compete for the daemon / lockfile and produce confusing errors.
- Leader-level single build is faster and gives one authoritative pass/fail.
