---
version: 0.1.0-draft
name: orchestration-command-event-and-receipt-contract
summary: Client sends commands -> server emits events and receipts -> client observes state updates and completion signals
type: knowledge
category: api
confidence: high
tags: [api, contract, orchestration]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - .docs/encyclopedia.md
  - apps/server/src/orchestration/Layers
  - packages/contracts/src/orchestration.ts
---

## Fact
T3 Code's orchestration model has three distinct contracts:
1. **Commands** — client intent (e.g., `thread.create`, `thread.turn.start`, `thread.checkpoint.revert`); defined in contracts
2. **Events** — server-persisted facts (e.g., `thread.created`, `thread.message-sent`, `thread.turn-diff-completed`); audit trail
3. **Receipts** — lightweight async signals (e.g., `checkpoint.baseline.captured`, `turn.processing.quiesced`); when milestones complete

## Why it matters
1. **Clear intent vs outcome** — client command doesn't guarantee success; server publishes events as ground truth
2. **Audit trail** — events are persisted and used to rebuild state on restart
3. **Async completion tracking** — receipts let tests and UI know when background work (checkpointing, diffing) finishes without polling
4. **Decoupled follow-up** — events trigger reactors (CheckpointReactor, ProviderCommandReactor) asynchronously; client doesn't wait
5. **Testability** — tests wait on receipts instead of timing out

## Evidence
- Encyclopedia defines Command, Event, Receipt, and Reactor as distinct concepts
- OrchestrationEngine dispatches commands, persists events, and updates read model
- CheckpointReactor and ProviderCommandReactor listen to events and emit receipts
- RuntimeReceiptBus publishes receipts; tests call `yield* receiptBus.wait(receiptType)` to block until work finishes

## How to apply
- When adding a new feature, define the command schema first (user intent), then the event schema (what actually changed), then receipt signals (when it's done)
- Never let commands directly mutate state; always go through the decider -> events -> projector pipeline
- For long-running work (checkpoint, diff), emit receipts so tests can wait deterministically
- Document commands, events, and receipts in the encyclopedia so newcomers understand the flow
