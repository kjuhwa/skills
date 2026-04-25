---
name: checkpoint-capture-race-concurrent-turns-same-thread
summary: If turns can start before prior checkpoints finish, checkpoint refs and diffs can get confused; serialize turn start/completion
type: knowledge
category: pitfall
confidence: medium
tags: [pitfall, checkpoint, concurrency]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - apps/server/src/checkpointing
  - apps/server/src/orchestration/Layers/CheckpointReactor.ts
---

## Fact
Checkpoints are captured using git refs (e.g., `refs/hidden/checkpoint/${threadId}/${turnId}`). If two turns start concurrently on the same thread without serialization, both may overwrite the baseline checkpoint, or diffs may be computed against the wrong commit.

## Why it matters
1. **Diffs become meaningless** — if checkpoint.baseline is not stable, turn diffs don't match reality
2. **Restore breaks** — revert to a checkpoint may jump to wrong commit if baseline was changed by another turn
3. **Silent data corruption** — no error is raised; diffs silently compute wrong changes
4. **Debugging nightmare** — user sees incorrect file changes in timeline, blames the provider agent

## Evidence
- CheckpointReactor captures baseline on turn start, finalizes diff on turn complete
- If turn B starts before turn A's diff is finalized, baseline for B may be turn A's mid-state
- No explicit mutex in codebase; serialization happens implicitly via command invariants

## How to apply
- In commandInvariants, enforce: "a new turn cannot start if the previous turn is not quiesced"
- Alternatively, use KeyedCoalescingWorker to ensure only latest turn per thread is processed at a time
- In tests, always drain between turn starts: `yield* orchestration.dispatch(turn1)`, `yield* worker.drain()`, then `yield* orchestration.dispatch(turn2)`
- Document this constraint in encyclopedia
- Add a test case that tries to start two concurrent turns and verifies the second is rejected or queued
