# Stateless Turn-Based Combat Engine

## Problem

Turn-based RPG combat is easy to prototype and painful to scale. Typical failure modes:

- **Mutable fields everywhere** → every skill edits HP/ATK/buffs in place. Undo, replay, and cheat detection are impossible.
- **Client-authoritative damage** → trivially exploitable. Players send `damage: 99999` and the server shrugs.
- **Turn-order bugs** → speed ties behave differently than players expect, and the logic is spread across three files.
- **Untestable** → "does Ice Shard kill a 2000-HP goblin?" requires booting the whole game.

You want combat logic that is: pure, deterministic, server-resolved, and unit-testable.

## Pattern

Combat is a pure function over an immutable state:

```
CombatEngine.processAction(CombatState, CombatAction) → CombatResult(newState, events)
```

Components:

1. **`CombatState`** — immutable snapshot: `units[]`, `turnIndex`, `phase`, `rngSeed`.
2. **`CombatUnit`** — immutable: `id`, `team`, stats, `currentHp`, `ultGauge`, `effects[]`.
3. **`CombatAction`** — request: `actorId`, `type (BASIC|SKILL|ULT)`, `targetId`, `skillCode`.
4. **Turn order** — sort units by speed desc, tiebreak by stable criterion (team, id). Pre-compute once per round.
5. **Damage pipeline** — layered, side-effect free:
   ```
   base = atk * skillMultiplier / (1 + def / K)
   base *= elementAdvantage           // 1.3 / 1.0 / 0.75
   base *= variance                   // [0.95, 1.05] seeded RNG
   base *= (crit ? critMultiplier : 1.0)
   base *= statusModifiers            // e.g. petrified target takes +15%
   ```
6. **Status effects** — `EffectType` enum (BURN, STUN, ATK_UP) on each unit; tick at turn start/end.
7. **Ultimate gauge** — charges on basic (+10), on skill (+15), on taking damage (+5). At 100 the unit can use ULT, resetting the gauge.
8. **Events list** — every stat change produces a named event (see `arch/immutable-action-event-log`).

Server-authoritative: client sends `{actorId, type, targetId, skillCode}` only. Server re-derives legality (is it your turn? is the target valid? does the unit have enough gauge for ULT?) and computes the outcome.

## Example (sanitized, simplified)

```java
public class CombatEngine {
    public CombatResult processAction(CombatState state, CombatAction action) {
        requireValidTurn(state, action);
        List<CombatEvent> events = new ArrayList<>();

        CombatState s = applyPreTurnEffects(state, events);
        s = executeAction(s, action, events);
        s = applyPostTurnEffects(s, events);
        s = advanceTurn(s, events);
        s = checkEnd(s, events);

        return new CombatResult(s, events);
    }

    private CombatState executeAction(CombatState s, CombatAction a, List<CombatEvent> events) {
        CombatUnit actor = s.findUnit(a.actorId());
        return switch (a.type()) {
            case BASIC -> applyBasic(s, actor, a.targetId(), events);
            case SKILL -> applySkill(s, actor, a.targetId(), a.skillCode(), events);
            case ULT   -> applyUlt(s, actor, a.targetId(), events);
        };
    }
}
```

Damage calculation stays in its own class:

```java
public record DamageInput(int atk, int def, double skillMult, Element attEl, Element defEl,
                          double critChance, double critMult, long rngSeed) {}

public record DamageOutput(int amount, boolean crit, double advantage, double variance) {}

public final class DamageCalculator {
    public static DamageOutput compute(DamageInput in) {
        var rng = new Random(in.rngSeed());
        double adv = advantage(in.attEl(), in.defEl()); // 1.3, 1.0, or 0.75
        double base = in.atk() * in.skillMult() * adv / (1.0 + in.def() / 500.0);
        double variance = 0.95 + rng.nextDouble() * 0.10;
        boolean crit = rng.nextDouble() < in.critChance();
        double total = base * variance * (crit ? in.critMult() : 1.0);
        return new DamageOutput((int) Math.round(total), crit, adv, variance);
    }

    private static double advantage(Element a, Element d) {
        // Fire > Wind > Earth > Fire, Light ↔ Dark mutual
        if (isAdvantaged(a, d)) return 1.3;
        if (isAdvantaged(d, a)) return 0.75;
        return 1.0;
    }
}
```

Test:

```java
@Test void fireVsWindCrits() {
    DamageOutput out = DamageCalculator.compute(
        new DamageInput(1000, 500, 1.5, FIRE, WIND, 1.0, 1.5, 42L));
    assertTrue(out.crit());
    assertEquals(1.3, out.advantage(), 0.001);
}
```

## When to use

- Turn-based RPG, strategy, or card game combat.
- Any server-authoritative game needing deterministic resolution.
- Projects where QA needs to reproduce "this boss kill" exactly.

## When NOT to use

- Real-time action combat — the pure-function overhead fights you.
- Client-side-only prototypes where exploit resistance isn't needed.

## Pitfalls

- **RNG determinism**: `new Random()` without a seed breaks replay. Seed once per action; emit the seed in an event or pass it as input.
- **Unit-by-reference bugs**: `actor.setHp(...)` instead of `actor.withHp(...)` mutates the snapshot. Use records or frozen builders.
- **Speed ties**: arbitrary tie-break (`HashMap` order) produces flaky replays. Tie-break on a stable field (id, team, originalIndex).
- **Too-coarse events**: one `ActionResolved` event with a blob means the UI can't animate mid-sequence. Emit per-step events (DamageDealt, EffectAdded, UnitDefeated).
- **Ult-gauge rounding**: if gauge-per-hit isn't integer, floating point drift compounds. Store gauge as int × 10 or use a fixed-point scheme.
- **Leaky abstractions**: don't put "CSS class for damage number color" in the engine. Events carry *what happened*; presentation belongs client-side.
- **Status-effect iteration during damage**: if a status is removed *during* its own tick, concurrent modification strikes. Collect expirations in a second pass.

## Related

- `arch/immutable-action-event-log` — the underlying event pattern.
- `game-dev/status-effect-enum-system` — the effects data model this engine uses.
