# Gacha Pity System — Soft Pity, Hard Pity, 50/50 Carryover

## Problem

A naive gacha (flat 1.5% top-rarity rate) is mathematically honest but psychologically brutal: a player can pull 200 times without hitting the top rarity. Real systems add:

- **Soft pity** — rate ramps upward after a threshold (e.g. pull 75), making a pull "eventually" guaranteed.
- **Hard pity** — absolute ceiling (e.g. pull 90 is guaranteed top rarity).
- **50/50 guarantee** — on a limited banner, half the top-rarity pulls are "off-banner" (standard pool). A 50/50 loss guarantees the next top-rarity pull is the banner character.
- **10-pull SR floor** — at least one mid-rarity in every 10-pull to avoid all-common pulls.

Client-side implementations are trivially cheatable. Pity counters must live server-side, using a CSPRNG, never a seeded `Math.random()`.

## Pattern

Two-stage pipeline per pull:

1. **`RateCalculator`** — given the user's pity counters and banner config, return the rarity of this pull (SSR / SR / R).
2. **`ResultResolver`** — given the rarity, return a concrete item. For SSR + limited banner, consult the 50/50 guarantee state.

User state per banner: `{ totalPulls, pullsSinceSSR, pullsSinceSR, fiftyFiftyGuaranteed }`.

```
pullsSinceSSR += 1 (unless this pull was SSR, then reset)
```

Rate rules (typical values):
- Base SSR = 1.5%, SR = 13%, R = 85.5%.
- Soft pity starts at pull 75: SSR += 5% per pull past 75.
- Hard pity at pull 90: SSR = 100%.
- 10-pull SR floor: if `pullsSinceSR >= 9` and rolled R, upgrade to SR.
- 50/50: when SSR is drawn on a limited banner, if `fiftyFiftyGuaranteed` is true → banner character; else 50% coin flip, set the flag on loss.

Split these two concerns because probability logic is the part QA and designers will want to poke at.

## Example (sanitized, Java)

```java
public record PityState(
    int pullsSinceSSR,
    int pullsSinceSR,
    boolean fiftyFiftyGuaranteed
) {}

public record GachaRates(
    double baseSSR,    // 0.015
    double baseSR,     // 0.13
    int softPityStart, // 75
    double softPityStep, // 0.05
    int hardPity,      // 90
    int srFloor        // 10
) {}

public enum Rarity { SSR, SR, R }

public final class RateCalculator {
    private final GachaRates rates;
    private final SecureRandom rng;

    public RateCalculator(GachaRates rates, SecureRandom rng) {
        this.rates = rates;
        this.rng = rng;
    }

    public Rarity roll(PityState pity) {
        int sinceSSR = pity.pullsSinceSSR();

        // Hard pity: guaranteed SSR.
        if (sinceSSR + 1 >= rates.hardPity()) return Rarity.SSR;

        // Effective SSR rate (soft pity ramp).
        double ssrRate = rates.baseSSR();
        if (sinceSSR + 1 >= rates.softPityStart()) {
            int stepsIn = sinceSSR + 1 - rates.softPityStart();
            ssrRate = Math.min(1.0, rates.baseSSR() + rates.softPityStep() * stepsIn);
        }

        double roll = rng.nextDouble();
        if (roll < ssrRate) return Rarity.SSR;

        double srRate = rates.baseSR();
        // 10-pull SR floor.
        if (pity.pullsSinceSR() + 1 >= rates.srFloor()) return Rarity.SR;
        if (roll < ssrRate + srRate) return Rarity.SR;

        return Rarity.R;
    }
}

public record ResolveResult(String itemCode, boolean wasFiftyFiftyLoss) {}

public final class ResultResolver {
    private final SecureRandom rng;
    private final BannerPool pool;

    public ResolveResult resolve(Rarity rarity, PityState pity) {
        return switch (rarity) {
            case SSR -> resolveSSR(pity);
            case SR  -> new ResolveResult(pool.pickRandom(Rarity.SR, rng), false);
            case R   -> new ResolveResult(pool.pickRandom(Rarity.R, rng), false);
        };
    }

    private ResolveResult resolveSSR(PityState pity) {
        if (!pool.hasRateUp()) {
            return new ResolveResult(pool.pickRandom(Rarity.SSR, rng), false);
        }
        if (pity.fiftyFiftyGuaranteed()) {
            return new ResolveResult(pool.rateUp(), false);
        }
        boolean win = rng.nextBoolean();
        return win
            ? new ResolveResult(pool.rateUp(), false)
            : new ResolveResult(pool.pickRandom(Rarity.SSR, rng, pool.rateUp()), true);
    }
}
```

Pity-state update after each pull (owner: `GachaService`, inside a transaction):

```java
public PityState updateAfterPull(PityState s, Rarity r, boolean wasFiftyFiftyLoss) {
    int sinceSSR = r == Rarity.SSR ? 0 : s.pullsSinceSSR() + 1;
    int sinceSR  = (r == Rarity.SSR || r == Rarity.SR) ? 0 : s.pullsSinceSR() + 1;
    boolean next5050;
    if (r == Rarity.SSR) {
        next5050 = wasFiftyFiftyLoss; // lost → next SSR is guaranteed
    } else {
        next5050 = s.fiftyFiftyGuaranteed();
    }
    return new PityState(sinceSSR, sinceSR, next5050);
}
```

Tests get nice — you can feed seeds or stub `SecureRandom` and assert the exact rate curve.

## When to use

- Any loot-box / gacha / crate system with pity mechanics.
- Games where fairness is a regulatory or PR concern (China, Korea require rate disclosure).
- Internal randomized drops with "bad luck protection".

## When NOT to use

- Pure cosmetic loot with no monetary value — simpler flat-rate RNG is fine.
- Regions where loot boxes are regulated as gambling and you don't have compliance sign-off.

## Pitfalls

- **`Math.random()` or `new Random()`**: not cryptographically strong; attacker can reverse the seed after a few pulls. Always `SecureRandom`.
- **Client-side pity counter**: trivially cheatable. Pity counters must live in the database, updated transactionally with the pull.
- **Floating-point rate drift**: summing rates past 1.0 due to FP error can break `roll < ssrRate + srRate`. Clamp each step.
- **Forgetting to disclose rates**: CN/KR/TW have legal disclosure requirements (base + soft pity + hard pity).
- **Concurrent pull race**: two pulls fired simultaneously must serialize their pity updates, or you double-charge or double-guarantee. Use row-level locks or optimistic versioning.
- **50/50 state on banner switch**: when a new banner goes live, does the guarantee carry over? Decide explicitly; most live games say yes (per-character-type pool). Document it.
- **Testing**: the rate curve must be verified by simulating 100k pulls and comparing empirical frequency to the theoretical curve within a tolerance. Add this as a nightly test.
- **Seeded RNG in unit tests**: `SecureRandom.getInstance("SHA1PRNG")` + explicit seed is reproducible; default `new SecureRandom()` is not. Inject the RNG.
