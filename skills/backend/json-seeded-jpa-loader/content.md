# JSON-Seeded JPA Loader (CommandLineRunner + Flyway)

## Problem

You have static catalog data (product tiers, character rosters, stage definitions, permission lists) that:
- Is too big or too frequently edited to live in a Flyway `INSERT` migration.
- Needs to be version-controlled and diffable.
- Must be present before the app serves traffic (cold start on an empty DB).

Putting 200 rows of JSON in SQL migrations is painful to review. Putting them in a `CommandLineRunner` that naively `saveAll`s on every boot creates duplicates.

## Pattern

Split responsibilities:

1. **Flyway** owns the DDL only (`CREATE TABLE`).
2. **`src/main/resources/data/<entity>.json`** holds the seed content as a JSON array of flat records.
3. **`DataInitializer implements CommandLineRunner`** at app startup:
   - For each entity, check `repository.count() == 0` — idempotency guard.
   - Read the JSON via `ClassPathResource` + `ObjectMapper`.
   - Map each record to an entity, `saveAll` in one batch.
4. **Order of loading** matters for FK'd entities — seed parents before children. Encode this as an explicit ordered list in the runner.

Re-seeding: truncate the table (or run a dev-only Flyway migration) and restart — the guard passes and reload happens.

## Example (sanitized)

```json
// src/main/resources/data/characters.json
[
  { "code": "knight_01", "name": "Knight of Dawn", "element": "LIGHT", "rarity": "SSR", "baseAtk": 120, "baseDef": 80 },
  { "code": "mage_02",   "name": "Frost Mage",     "element": "WATER", "rarity": "SR",  "baseAtk": 150, "baseDef": 40 }
]
```

```java
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {
    private final CharacterRepository characterRepo;
    private final StageRepository stageRepo;
    private final ObjectMapper objectMapper;

    @Override
    public void run(String... args) throws Exception {
        // Parents first, then children with FKs.
        loadIfEmpty("data/characters.json", characterRepo, CharacterSeed.class, this::toCharacter);
        loadIfEmpty("data/stages.json",     stageRepo,     StageSeed.class,     this::toStage);
    }

    private <S, E> void loadIfEmpty(
            String resource,
            JpaRepository<E, ?> repo,
            Class<S> seedClass,
            Function<S, E> mapper
    ) throws IOException {
        if (repo.count() > 0) {
            log.info("Skipping {} — table already populated", resource);
            return;
        }
        ClassPathResource cp = new ClassPathResource(resource);
        List<S> seeds = objectMapper.readValue(
            cp.getInputStream(),
            objectMapper.getTypeFactory().constructCollectionType(List.class, seedClass)
        );
        List<E> entities = seeds.stream().map(mapper).toList();
        repo.saveAll(entities);
        log.info("Seeded {} rows from {}", entities.size(), resource);
    }

    private GameCharacter toCharacter(CharacterSeed s) {
        return GameCharacter.builder()
            .code(s.getCode())
            .name(s.getName())
            .element(Element.valueOf(s.getElement()))
            .rarity(Rarity.valueOf(s.getRarity()))
            .baseAtk(s.getBaseAtk())
            .baseDef(s.getBaseDef())
            .build();
    }

    // Private seed DTO — no JPA annotations, just a Jackson POJO.
    @Data private static class CharacterSeed {
        private String code;
        private String name;
        private String element;
        private String rarity;
        private int baseAtk;
        private int baseDef;
    }

    // ... StageSeed etc.
}
```

## When to use

- Static-ish reference data (game content, tier tables, permission catalogs, country lists).
- Projects where the content team edits JSON via PR.
- Content that must be consistent across environments but changes too often for SQL migrations.

## When NOT to use

- User-generated data (obviously).
- Content that differs per environment — use profile-specific runners or env-gated config.
- Tiny enums (< 5 items) — put them in code as enum constants.

## Pitfalls

- **Idempotency guard on count**: works for "first-boot" seeding only. If you add a 13th character after launching with 12, `count() > 0` skips the load and the new one never appears. Solutions: (a) upsert by `code`, (b) bump a version and clear+reload, or (c) own additions via SQL migration from that point on.
- **Order of loading**: FK-ed children load after parents, or you get constraint violations. Encode the order explicitly, don't rely on classpath scan order.
- **Separate seed DTO vs JPA entity**: don't annotate the entity with Jackson mix-ins just to deserialize JSON — you'll accidentally expose entity internals in your API. Keep a dedicated `*Seed` POJO.
- **Performance**: for 10k+ rows, prefer `saveAll` in batches of 500 with `hibernate.jdbc.batch_size=50` — one big `saveAll` pins GC.
- **Profile-gating**: sometimes you want seeds only in dev. Add `@Profile("dev")` on the runner or split into `DevDataInitializer` and `BaseDataInitializer`.
- **Transactional boundary**: default `CommandLineRunner.run` is not in a transaction. Annotate with `@Transactional` if you want all-or-nothing semantics per entity group.
