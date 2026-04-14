# Status Effect System — Enum-Tagged Effects with Deterministic Tick

## Problem

Status effects (burn, poison, stun, ATK buff, DEF debuff, petrify) show up everywhere in turn-based and even real-time games. Ad-hoc implementations rot fast:

- **Each effect as its own field on the unit** (`isStunned`, `burnDamage`, `atkBuffPct`, ...) → 15+ nullable fields, impossible to iterate generically.
- **Stacking rules spread across skills** → "does a second Burn refresh duration or add a stack?" has three different answers across six skills.
- **Tick ordering bugs** → DoT kills the unit before its turn, but the turn still happens because order isn't defined.

You want one uniform type and three well-defined phases (apply, tick, remove).

## Pattern

1. **`EffectType` enum** — closed list: `BURN, POISON, BLEED, STUN, FREEZE, PETRIFY, ATK_UP, DEF_UP, ATK_DOWN, DEF_DOWN, ...`. Each carries metadata: `category (DOT | CC | BUFF | DEBUFF)`, `stackable (boolean)`, `dispellable (boolean)`.
2. **`StatusEffect` record** — `{ type, sourceUnitId, magnitude, remainingTurns, stackCount }`.
3. **`CombatUnit.effects: List<StatusEffect>`** — every unit carries its own list.
4. **Three phases per turn**:
   - **Start-of-turn tick** (before action): DoTs apply damage, CCs prevent action, effects decrement `remainingTurns`.
   - **Action resolution**: unit skill/basic may add or remove effects.
   - **End-of-turn cleanup**: effects with `remainingTurns <= 0` are removed.
5. **Stacking rules** — defined once per effect:
   - `stackable = false`: re-application refreshes duration, takes max magnitude.
   - `stackable = true`: new entry appended, each ticks independently.

CC check at action time:

```java
if (unit.hasEffect(STUN) || unit.hasEffect(FREEZE) || unit.hasEffect(PETRIFY)) {
    events.add(new ActionSkipped(unit.id(), "cc"));
    // still tick effects, but no action
}
```

Resistance / chance to apply: each effect application rolls against target's resistance stat. This is the one place RNG enters the effect system.

## Example (sanitized)

```java
public enum EffectType {
    BURN    (Category.DOT,  true,  true),
    POISON  (Category.DOT,  true,  true),
    STUN    (Category.CC,   false, true),
    FREEZE  (Category.CC,   false, true),
    PETRIFY (Category.CC,   false, false),
    ATK_UP  (Category.BUFF, false, false),
    ATK_DOWN(Category.DEBUFF, false, true);

    public enum Category { DOT, CC, BUFF, DEBUFF }

    public final Category category;
    public final boolean stackable;
    public final boolean dispellable;

    EffectType(Category c, boolean stackable, boolean dispellable) {
        this.category = c; this.stackable = stackable; this.dispellable = dispellable;
    }
}

public record StatusEffect(
    EffectType type,
    long sourceUnitId,
    int magnitude,       // DoT damage, buff % (100 = +100%)
    int remainingTurns,
    int stackCount
) {
    public StatusEffect decrement() {
        return new StatusEffect(type, sourceUnitId, magnitude, remainingTurns - 1, stackCount);
    }
}
```

Application — handles stacking semantics:

```java
public static List<StatusEffect> apply(List<StatusEffect> current, StatusEffect incoming) {
    if (!incoming.type().stackable) {
        // Refresh duration, take max magnitude.
        List<StatusEffect> updated = new ArrayList<>(current.size() + 1);
        boolean replaced = false;
        for (StatusEffect e : current) {
            if (e.type() == incoming.type()) {
                updated.add(new StatusEffect(
                    e.type(),
                    e.sourceUnitId(),
                    Math.max(e.magnitude(), incoming.magnitude()),
                    Math.max(e.remainingTurns(), incoming.remainingTurns()),
                    1
                ));
                replaced = true;
            } else {
                updated.add(e);
            }
        }
        if (!replaced) updated.add(incoming);
        return List.copyOf(updated);
    }
    // Stackable: always append.
    List<StatusEffect> updated = new ArrayList<>(current);
    updated.add(incoming);
    return List.copyOf(updated);
}
```

Start-of-turn tick:

```java
public static CombatUnit tickStart(CombatUnit unit, List<CombatEvent> events) {
    int totalDot = 0;
    for (StatusEffect e : unit.effects()) {
        if (e.type().category == EffectType.Category.DOT) {
            int dmg = e.magnitude() * e.stackCount();
            totalDot += dmg;
            events.add(new CombatEvent.DotDamage(unit.id(), e.type().name(), dmg));
        }
    }
    CombatUnit afterDot = unit.withHp(Math.max(0, unit.currentHp() - totalDot));
    // Decrement durations. Removal happens at end of turn to avoid mid-tick removal bugs.
    List<StatusEffect> decremented = afterDot.effects().stream().map(StatusEffect::decrement).toList();
    return afterDot.withEffects(decremented);
}
```

End-of-turn cleanup:

```java
public static CombatUnit cleanup(CombatUnit unit, List<CombatEvent> events) {
    List<StatusEffect> kept = unit.effects().stream()
        .filter(e -> e.remainingTurns() > 0)
        .toList();
    unit.effects().stream()
        .filter(e -> e.remainingTurns() <= 0)
        .forEach(e -> events.add(new CombatEvent.EffectExpired(unit.id(), e.type().name())));
    return unit.withEffects(kept);
}
```

## When to use

- Turn-based combat (always).
- Real-time games where effects are discrete enough to decrement per tick (ARPG DoTs, MOBAs).
- Any "temporary modifier" system on a domain entity (user buffs, shop discounts that expire).

## When NOT to use

- Permanent stat bumps — just modify the base stat.
- Effects that materially couple to a specific skill's code path (one-off mechanics) — an enum forces them into a uniform shape they resist.

## Pitfalls

- **Removing during iteration**: mutating the list while ticking gives `ConcurrentModificationException`. Use two-phase: tick → collect expirations → apply in cleanup.
- **Order: tick-then-action or action-then-tick?** Pick one and document. Most games tick start-of-turn so a poisoned unit can "still act before dying" if the DoT doesn't finish it.
- **Stun interaction with DoT**: stun should *not* prevent DoT damage. Category-based tick handles this correctly.
- **Stacking semantics**: if two sources apply the same non-stackable effect, you want max magnitude, max duration — not replace wholesale (otherwise a teammate's weak Burn overrides a stronger enemy Burn).
- **Dispel**: `dispellable = false` on Petrify is deliberate; document which effects bypass dispel or players will misread the tooltip.
- **Buff overflow**: `ATK_UP` at 200% plus base 100% = 300% — clamp or the damage formula explodes.
- **Resistances and immunities**: store per-unit as `resistances: Map<EffectCategory, Double>`; apply-roll happens at the application site, not inside the tick.

## Related

- `game-dev/stateless-turn-combat-engine` — the host engine this slots into.
