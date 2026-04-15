# Tenant-isolated MongoDB collection routing

## Shape

1. Annotate entities with a custom `@IsolationCollection("conf_info")` (or reuse a framework one).
2. Extract the tenant/organization id from the request context (filter/interceptor → ThreadLocal or Reactor context).
3. Override the Mongo collection-name resolver so that `conf_info` → `conf_info_{tenantId}` when routing; the entity mapping stays single-source.
4. Every service method takes `organizationId` as its first business parameter and passes it down explicitly — don't rely solely on ThreadLocal, because batch/async jobs won't have it.
5. Repository custom-impl methods use `mongoTemplate.withCollection(resolve(org, "conf_info"))` rather than hard-coded names.

## Why

- Logical isolation survives a missing `$match: {org: X}` clause in one query — the whole collection is scoped.
- Indexes are smaller per tenant, planner stats are per-tenant, noisy-neighbor effects are reduced.
- Exporting/dropping a tenant is a single `drop collection`.

## Steps

1. Define the annotation + a `CollectionNameResolver` service.
2. Register a `MappingMongoConverter` / `MongoTemplate` wrapper that calls the resolver before every CRUD op.
3. Enforce `organizationId` as a required param in service interfaces (code review rule or ArchUnit test).
4. For Kafka/async consumers, restore tenant context from the message header before entering service code.
5. For TestContainers-based tests, seed per-tenant collections explicitly.

## Counter / caveats

- Cross-tenant aggregations (admin dashboards) are painful — keep a narrow "meta" collection for those or do fan-out.
- Too many tenants × too many entity types = too many collections. Mongo handles thousands but tens of thousands can stress the catalog.
- Don't forget schema-registry / migration scripts to iterate all per-tenant collections.
