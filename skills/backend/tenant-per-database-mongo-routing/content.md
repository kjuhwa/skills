# tenant-per-database-mongo-routing

## Shape

- `TenantContextHolder` — `ThreadLocal<String>` exposing `setTenantId / getTenantId / clear`.
- **Two** MongoTemplate beans:
  - `mongoTemplate` (qualifier `MONGODB_TEMPLATE_ISOLATION`): resolves target DB name from `TenantContextHolder` at operation time.
  - `mongoTemplateShared` (qualifier `MONGODB_TEMPLATE_SHARED`): fixed shared DB for cross-tenant collections (orgs, policies).
- Repositories are wired to one or the other explicitly; never both.

## Steps

1. Wrap every tenant-scoped operation:
   ```java
   TenantContextHolder.INSTANCE.setTenantId(orgId);
   try { repo.save(entity); } finally { TenantContextHolder.INSTANCE.clear(); }
   ```
2. Entry points that must set context: REST interceptor (read `X-Organization-Id`), Kafka listener (read `organizationId` record header — see `kafka-organization-id-record-header`), scheduled jobs (iterate orgs, set per iteration).
3. For async offload (`@Async`, `CompletableFuture`, `taskExecutor.submit`) **propagate** the tenant explicitly — `ThreadLocal` does NOT cross threads. Capture before submit; set at the start of the lambda; clear in finally.
4. Classify each new collection **up-front** as tenant-isolated or shared; mixing causes data leaks that silently pass tests.

## Counter / Caveats

- Any code path that forgets to set the context hits the "default" DB — add a guard in the MongoTemplate resolver that throws if tenant is null on isolated operations (fail loud, never fall back).
- DB-per-tenant multiplies connection count; tune `MongoClientSettings` pool per actual tenant count.
- Backup/restore tooling must iterate DBs; a single `mongodump` misses tenants.

## Test hooks

- Testcontainers Mongo: create two org DBs, run the same repo method with two different tenant contexts, assert rows land in separate DBs.
- Thread-leak test: call `clear()` failure path (exception in handler) and assert next request does NOT inherit previous tenant.
