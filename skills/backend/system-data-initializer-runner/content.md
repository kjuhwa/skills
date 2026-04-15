# System/root data seeding via ApplicationRunner

## Shape

1. Put well-known ids as constants: `ROOT_GROUP_ID = "ROOT"`, `DEFAULT_GROUP_ID = "DEFAULT"`.
2. Implement `ApplicationRunner` (not `CommandLineRunner`, not `@PostConstruct`) so it runs after the context is fully ready, including Mongo/Kafka beans.
3. For each system record: `existsById` → skip if present; else insert with `systemGroup = true` (or similar immutable flag).
4. In the service layer, every `delete`/`move` operation checks the flag and throws `SYSTEM_X_CANNOT_BE_DELETED` / `..._MOVED`.
5. `update` is still permitted for mutable fields (name, description) so operators can localize them.

## Why ApplicationRunner specifically

- `@PostConstruct` runs before external beans (Mongo template connections, Kafka listeners) are fully usable.
- Liquibase/Flyway-style migrations don't cover document DBs cleanly; a runner keeps seeding beside app code.
- If seeding depends on another service (e.g. `account`), declare `@WaitForServices` / a startup dependency so the runner doesn't race.

## Steps

1. Define constants + `systemGroup` boolean on the entity.
2. Implement `XxxInitializer implements ApplicationRunner`.
3. Idempotent insert: existsById-guarded.
4. Add protection in `delete` and `move` service methods; return dedicated error codes.
5. Integration-test: boot twice, confirm no duplicate, confirm protection.

## Counter / caveats

- If seeding has cross-service dependencies, explicit service-readiness wait is required or the first boot fails.
- Never use the flag as an implicit auth signal — it's an object protection flag, not a user role.
