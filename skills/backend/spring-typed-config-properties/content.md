# Spring Boot Typed `@ConfigurationProperties` for Tunable Constants

## Problem

As a Spring Boot app matures, "tunable numbers" spread everywhere:
- `@Value("${rate-limit.max}") int maxRps;` in a controller.
- `static final int BATCH_SIZE = 500;` in a service.
- Magic numbers buried in math: `damage * 1.3`.

Scattered `@Value` strings are untyped, untestable in isolation, and invisible on a dashboard. When a PM asks "where do we set the crit rate / retry ceiling / daily cap?", the answer is a grep tour.

## Pattern

One nested POJO tree owns every tunable in the app, loaded via `@ConfigurationProperties` with constructor binding (Spring Boot 3 style). Each domain gets a nested record/class. YAML mirrors the structure.

Benefits:
- **Single source of truth** — `AppTuning.rateLimit.maxRps` is the name everywhere.
- **IDE autocomplete & refactor safety** — no string keys in code.
- **Bean Validation** — `@Min`, `@DecimalMax` validate at boot, not at first request.
- **Profile overrides** — `application-prod.yml` can override any leaf.

## Example (sanitized)

```yaml
# application.yml
app:
  tuning:
    rate-limit:
      max-rps: 100
      burst-capacity: 200
    retry:
      max-attempts: 3
      backoff-ms: 250
    balance:
      crit-chance: 0.05
      crit-multiplier: 1.5
      variance-min: 0.95
      variance-max: 1.05
    resource:
      max-stamina: 240
      regen-seconds: 360
      starter-grant: 1600
```

```java
@ConfigurationProperties(prefix = "app.tuning")
@Validated
public record AppTuning(
    @Valid RateLimit rateLimit,
    @Valid Retry retry,
    @Valid Balance balance,
    @Valid Resource resource
) {
    public record RateLimit(
        @Min(1) int maxRps,
        @Min(1) int burstCapacity
    ) {}

    public record Retry(
        @Min(1) int maxAttempts,
        @Min(0) long backoffMs
    ) {}

    public record Balance(
        @DecimalMin("0.0") @DecimalMax("1.0") double critChance,
        @DecimalMin("1.0") double critMultiplier,
        double varianceMin,
        double varianceMax
    ) {}

    public record Resource(
        @Min(1) int maxStamina,
        @Min(1) int regenSeconds,
        @Min(0) int starterGrant
    ) {}
}
```

```java
@SpringBootApplication
@EnableConfigurationProperties(AppTuning.class)
public class Application { /* ... */ }
```

```java
@Service
@RequiredArgsConstructor
public class DamageService {
    private final AppTuning tuning;
    private final SecureRandom rng = new SecureRandom();

    public double compute(double atk, double def, double skillMult) {
        var b = tuning.balance();
        double base = atk * skillMult / (1.0 + def / 500.0);
        double variance = b.varianceMin() + rng.nextDouble() * (b.varianceMax() - b.varianceMin());
        boolean crit = rng.nextDouble() < b.critChance();
        return base * variance * (crit ? b.critMultiplier() : 1.0);
    }
}
```

Testing:
```java
@Test
void highCritVariant() {
    AppTuning tuning = new AppTuning(
        null, null,
        new AppTuning.Balance(1.0, 2.0, 1.0, 1.0),  // always crit, no variance
        null
    );
    var svc = new DamageService(tuning);
    assertEquals(400.0, svc.compute(100, 0, 2.0), 0.001); // 100*2 * 1 * 2 = 400
}
```

## When to use

- 5+ scattered `@Value` strings related to the same domain.
- Numbers a non-dev (PM, game designer, SRE) needs to tweak per environment.
- Formulas where the magic numbers deserve a name.

## When NOT to use

- Truly invariant constants (mathematical, protocol-defined) — `static final` is fine.
- Secrets — use Spring Cloud Config / Vault / env vars directly, not `application.yml`.
- Single-use values that will never need profile overrides.

## Pitfalls

- **Forgetting `@EnableConfigurationProperties`** (or `@ConfigurationPropertiesScan`): properties bind to nothing, fields stay default/null, and you get NPEs — not a clean error.
- **Kebab-case vs camelCase**: YAML uses `max-rps`, Java field is `maxRps`. Spring handles the conversion; don't "fix" the YAML to match Java.
- **Records + validation**: `@Validated` must be on the record class *and* you need `spring-boot-starter-validation` on the classpath.
- **Profile overrides partially**: a nested profile YAML overrides only the leaves you specify; everything unspecified inherits from the base YAML. Good — but easy to misread.
- **Hot reload**: `@ConfigurationProperties` is **not** hot-reloaded. Use `@RefreshScope` + Spring Cloud Bus if you need runtime tuning.
- **Null sub-groups in tests**: when constructing `AppTuning` directly, pass `null` for sub-groups you don't exercise — but then code that reads them NPEs. Prefer a `defaults()` factory for tests.
