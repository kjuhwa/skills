# Immutable Action → Event Log (Lite Event Sourcing for Engines)

## Problem

Any "engine" — combat, order processing, workflow runner, bank transfer — needs to:
- Apply an action deterministically.
- Record exactly what happened, in order, for audit/replay/UI animation.
- Stay testable without spinning up a DB or message bus.

Classic mistakes:
- Mutating the engine's own state while also emitting events → hard to diff, easy to desync.
- Embedding log strings (`logger.info(...)`) inside the engine → the log is unstructured, un-replayable, and invisible to callers.
- Using full event sourcing (Kafka, event store) when all you need is a replayable log per operation.

## Pattern

An engine method has a pure signature:

```
apply(state, action) → Result(newState, events)
```

Both `state` and `events` are immutable records. `newState` is a fresh value, not the old one mutated. The engine returns events; it does not emit them — the caller decides whether to persist, stream to the UI, or discard.

Events are a sealed/closed hierarchy — every possible thing the engine can do has one event type. The full list is the engine's contract.

Replay: `events.reduce(initialState, applyEvent)` reconstructs any final state. Unit tests become: "given starting state + action, expect these events in this order."

## Example (sanitized, Java 21 sealed)

```java
public record EngineState(
    List<Unit> units,
    int turn,
    Status status
) {
    public EngineState {
        units = List.copyOf(units); // defensive
    }
}

public sealed interface EngineEvent permits
    EngineEvent.DamageDealt,
    EngineEvent.HealApplied,
    EngineEvent.EffectAdded,
    EngineEvent.UnitDefeated,
    EngineEvent.TurnAdvanced,
    EngineEvent.EngineEnded {

    record DamageDealt(long actor, long target, int amount, boolean crit, String reason) implements EngineEvent {}
    record HealApplied(long actor, long target, int amount) implements EngineEvent {}
    record EffectAdded(long target, String effectCode, int duration) implements EngineEvent {}
    record UnitDefeated(long target) implements EngineEvent {}
    record TurnAdvanced(int newTurn) implements EngineEvent {}
    record EngineEnded(Outcome outcome) implements EngineEvent {}
}

public record EngineAction(long actorId, ActionType type, Long targetId, String skillCode) {}

public record ApplyResult(EngineState newState, List<EngineEvent> events) {
    public ApplyResult { events = List.copyOf(events); }
}

public class Engine {
    public ApplyResult apply(EngineState state, EngineAction action) {
        List<EngineEvent> events = new ArrayList<>();
        EngineState s = state;

        // Each step produces events and a new state.
        s = applyPreTurnEffects(s, events);
        s = executeAction(s, action, events);
        s = applyPostTurnEffects(s, events);
        s = advanceTurn(s, events);

        return new ApplyResult(s, events);
    }

    // Pure helpers — all return new state and append to `events`.
    // None mutate the input state.
}
```

Caller uses events for multiple purposes:

```java
ApplyResult result = engine.apply(state, action);

// 1. Persist for replay / audit.
actionLogRepo.saveAll(result.events().stream()
    .map(e -> ActionLogEntry.of(battleId, e)).toList());

// 2. Stream to client for animation.
wsPublisher.publish(battleId, result.events());

// 3. Use for cheat detection downstream.
fraudDetector.inspect(result.events());
```

Replay test:
```java
@Test void replayReproducesState() {
    EngineState initial = fixtureState();
    ApplyResult r = engine.apply(initial, fixtureAction());

    EngineState replayed = r.events().stream()
        .reduce(initial, Engine::applyEvent, (a, b) -> b);

    assertEquals(r.newState(), replayed);
}
```

## When to use

- Turn-based game engines (combat, board games, card games).
- Order/payment state machines where audit is required.
- Workflow/orchestration where you need to show users *what just happened*.
- Anywhere a test needs to assert on a sequence of outcomes, not just final state.

## When NOT to use

- Streaming / high-frequency updates (e.g. physics engine at 60 Hz) — allocating lists of events every tick is costly.
- Trivial CRUD — you're just adding ceremony.
- When you already have full event sourcing — this is a lite cousin, pick one.

## Pitfalls

- **Mutable collections inside events**: defeats the purpose. Use `List.copyOf`, records, or Immutables/Vavr.
- **Non-deterministic RNG inside the engine**: replay breaks. Either (a) seed a `Random` per operation and include the seed in the first event, or (b) emit a `RngRolled` event capturing the outcome so replay re-uses it.
- **External calls inside `apply`**: DB reads, HTTP calls, `System.currentTimeMillis()` — all non-deterministic. Pass clock/outputs in as inputs to `apply` or inject a `Supplier`.
- **Event granularity**: too fine-grained (one event per stat change) → log bloat; too coarse (one `ActionApplied` with a blob payload) → loses the point. Rule of thumb: one event per user-visible outcome.
- **Replay drift**: if you add a new event type and old logs don't have it, replay still works — but if you *change* an existing event's semantics, old logs replay incorrectly. Version your event schema or make changes additive only.
- **Engine-to-UI coupling**: don't let UI concerns leak into event fields (`cssClass`, `animationDuration`). The UI maps event types to presentation on its side.
