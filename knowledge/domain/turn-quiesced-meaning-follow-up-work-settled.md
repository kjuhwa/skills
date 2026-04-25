---
version: 0.1.0-draft
name: turn-quiesced-meaning-follow-up-work-settled
summary: A turn is quiesced when initial request completes AND all async work (checkpointing, diffing, reactions) is done
type: knowledge
category: domain
confidence: high
tags: [domain, terminology, async, completeness]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - .docs/encyclopedia.md
---

## Fact
"Quiesced" in T3 Code means a turn has gone quiet and fully completed. Initial RPC returns, then follow-up work in CheckpointReactor, ProviderCommandReactor, and ProviderRuntimeIngestion runs asynchronously. Quiesce is the signal that all that work is done: checkpoint captured, diff finalized, provider command processed, next command ready.

## Why it matters
1. **Tests need this signal** — instead of `Effect.sleep(5000)` and hoping work finishes, tests `yield* receiptBus.wait('turn.processing.quiesced')` and know for certain work is done
2. **UI responsiveness** — UI can show "Turn complete" only after quiesce receipt, not after initial response
3. **Prevents state races** — if a new turn starts before the previous one quiesces, projections can be inconsistent; quiesce gates allow or deny new turns
4. **Ordering guarantees** — follow-up work runs in a queue (DrainableWorker); quiesce means that queue is empty

## Evidence
- Encyclopedia: "Quiesced means a turn has gone quiet and stable... follow-up work has settled, including work in CheckpointReactor.ts"
- RuntimeReceiptBus emits `turn.processing.quiesced` after all follow-up effects complete
- CheckpointReactor publishes checkpoint completion, then turn quiesce

## How to apply
- After a user initiates a turn, the server immediately returns a response (turn recorded, initial command accepted)
- UI should show "waiting..." until quiesce receipt arrives
- In tests, always wait for quiesce: `yield* worker.drain()` or `yield* receiptBus.wait('turn.processing.quiesced')`
- New turn commands should not start until previous turn quiesces (gate at orchestration layer)
- Document per-turn async flows and where quiesce happens (usually last step in CheckpointReactor)
