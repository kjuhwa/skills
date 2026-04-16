---
name: saga-pattern-implementation-pitfall
description: Common saga failures around non-compensatable pivot steps, lost compensations, and non-idempotent retries
category: pitfall
tags:
  - saga
  - auto-loop
---

# saga-pattern-implementation-pitfall

The most damaging saga pitfall is treating every step as compensatable. Real systems contain pivot steps — sending a physical shipment, charging a non-refundable fee, publishing to an external partner — that cannot be undone by a compensating transaction. Teams build sagas assuming uniform rollback, then discover in production that a failure in step 7 cannot unwind step 5 because step 5 already emailed the customer or dispatched the crate. The fix is to explicitly classify each step and design the saga so all non-compensatable steps execute only after every compensatable prerequisite has succeeded; once past the pivot, the saga must switch from rollback semantics to forward-recovery (retry or escalate), never silently marking itself as "compensated."

The second pitfall is non-idempotent compensation handlers. Compensation messages get redelivered due to broker at-least-once guarantees and orchestrator restarts. A refund handler without an idempotency key will refund twice; an inventory-release handler without one will over-release stock. Every forward AND compensating action must accept a deterministic key (typically `{sagaId}:{stepId}:{direction}`) and short-circuit duplicates. The compensation-ledger variant masks this bug because the ledger looks correct — entries exist — but the underlying participant state has drifted.

The third pitfall is choreography sagas without a timeout guardian. In pure event-driven choreography, if a participant crashes after consuming the triggering event but before emitting its outcome, the saga stalls forever with no coordinator to notice. Always pair choreography with a sidecar saga-log watcher that flags sagas whose last event exceeds a deadline and either triggers compensation or pages an operator. Orchestrator-flow variants get this for free because the coordinator owns the timeout; choreography teams often forget until a production stall trains them otherwise.
