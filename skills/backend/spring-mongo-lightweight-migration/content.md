# Reference implementation

See source: `docs/GUIDE_MONGO_MIGRATION.md` in lucida-widget project. Key pieces:

## Annotation
```java
@Target(ElementType.METHOD) @Retention(RetentionPolicy.RUNTIME)
public @interface MongoMigration {
    String id();
    int order();
    String description() default "";
}
```

## Marker
```java
public interface MigrationScript {}
```

## Runner core
- Collect `@MongoMigration` methods via reflection over `List<MigrationScript>` beans.
- Sort by `order`.
- Read executed IDs from `{prefix}_migrations`.
- Execute non-executed; persist `SUCCESS`/`FAILED` record per run.

## Rules
| Item | Rule |
|------|------|
| id | unique, immutable |
| order | numeric ascending |
| idempotency | history-based skip |
| failure | logged as FAILED, retried on next startup |
| rollback | none — write reverse migration |
| deletion | never delete a committed migration file |

## Multi-tenant variant
Loop tenant IDs, set `TenantContextHolder`, filter executed IDs per tenant, finally `clear()`.
