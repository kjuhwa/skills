# Layered Risk Gates for Autonomous Action Loops

## Problem

Autonomous loops that take real-world irreversible actions — placing trades, sending messages, invoking paid APIs, making moderation decisions — need guardrails that can't be bypassed by a bug in the decision layer. A single "buy signal fires 500 times in one second" or "LLM decides to retry on a transient rate-limit indefinitely" will destroy the account / blow the budget / spam the user long before a human notices.

A single threshold ("max X per minute") is not enough: it doesn't care about outcome, only volume.

## Pattern

Three layers, each gating a different moment:

1. **Admission gate — before the action.**
   Per-entity size cap, set-size cap, per-day count cap, per-day loss/cost cap, cooldown since last action on this entity. *No action starts if any admission check fails.* This is cheap and rejects most runaway behavior.

2. **In-flight monitor — during the action's lifetime.**
   Once an action has an open state (a position, a running request, a pending approval), watch its outcome against stop and target thresholds. Auto-close on breach. This bounds the downside of actions that passed admission but went wrong.

3. **Consecutive-failure circuit breaker — across the loop.**
   Count consecutive bad outcomes. After N in a row, halt the entire loop, alert, require manual reset. This catches the case where admission + stops individually look reasonable but the system is in a regime where they keep triggering.

Crucially: the three layers are *independent* — each has its own counter and its own reset rule. A bug in layer 2 must not silently disable layer 3.

## Example (sanitized)

```java
class RiskGates {
    int maxPositions;
    double maxPositionSizeRatio;   // e.g. 0.20 = 20% of account
    int maxDailyTrades;
    double maxDailyLoss;           // absolute currency
    int maxConsecutiveLosses;

    // Layer 1: admission
    Decision canOpen(String id, double requestedSize) {
        if (openCount() >= maxPositions)              return Decision.deny("max positions");
        if (requestedSize / accountEquity > maxPositionSizeRatio)
                                                      return Decision.resize(accountEquity * maxPositionSizeRatio);
        if (tradesToday() >= maxDailyTrades)          return Decision.deny("daily trade cap");
        if (lossToday() >= maxDailyLoss)              return Decision.halt("daily loss cap");
        if (consecutiveLosses >= maxConsecutiveLosses) return Decision.halt("circuit breaker open");
        return Decision.allow();
    }

    // Layer 2: in-flight
    Decision shouldClose(Position p, double live) {
        double pnlPct = (live - p.entry) / p.entry * 100.0;
        if (pnlPct <= p.stopLossPct)   return Decision.close("stop-loss");
        if (pnlPct >= p.takeProfitPct) return Decision.close("take-profit");
        return Decision.hold();
    }

    // Layer 3: circuit breaker
    void onOutcome(boolean win) {
        if (win) consecutiveLosses = 0;
        else if (++consecutiveLosses >= maxConsecutiveLosses) haltLoopAndAlert();
    }
}
```

## When to Use

- Auto-trading, auto-bidding, auto-negotiation systems.
- Any LLM agent with a tool that costs money or touches shared state (paid APIs, email send, code merge).
- Moderation / enforcement bots taking irreversible per-user actions.
- Autoscalers / scheduler loops where a wrong decision triggers billed infra.

## Pitfalls

- **Treating admission and in-flight as the same check.** They answer different questions. Collapsing them means a position that *became* too risky isn't caught.
- **Resetting the circuit breaker on every successful iteration of the loop.** Reset only on a successful *outcome*. Otherwise a loop that prints "ok" between failures never trips.
- **No daily-loss *halt*, only per-trade stops.** Per-trade stops cap single losses; only a daily-loss halt bounds the sum.
- **Manual-only reset mechanism is missing.** A tripped breaker must log clearly, notify a human, and refuse to auto-rearm. Auto-rearm defeats the point.
- **Config values in code.** Make all five caps externally tunable (config/env), with safe defaults. Humans adjust these under stress.
- **No audit trail.** Every denial, resize, forced close, and breaker trip must emit a structured event. Post-mortems need it.
