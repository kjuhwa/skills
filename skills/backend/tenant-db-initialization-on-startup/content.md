# Tenant DB Initialization on Startup

## Shape

```java
@EventListener(ServiceReadyLeaderEvent.class)
@WaitForServices(requireLeader = true, requiredServices = {"metadata-service"})
public void initializeTenants() {
    List<String> orgIds = metadataClient.listOrganizations();
    for (String orgId : orgIds) {
        TenantMongoDBUtils.createMongoDBDatabase(orgId);
        // createCollections, ensureIndexes, seed, etc.
    }
    markAsInitialized();  // idempotent guard
}
```

## Invariants

- **Leader-only**: prevents N nodes racing to create the same DB/indexes.
- **Iterate the org list from the authoritative source**, not from MongoDB's existing databases — a fresh deployment has zero DBs and needs to create all.
- **Filter out system DBs** when later enumerating tenants (`admin`, `config`, `local`, `migration`, plus any third-party ones like `yorkie-meta`).
- **Idempotent per run**: `createMongoDBDatabase` must be a no-op if the DB already exists; `ensureIndex` must not fail on existing indexes.

## Why a whole-list pull (not lazy-on-first-request)

- Indexes take time; first-request provisioning adds seconds of p99 latency.
- Schema migrations are safer run in a controlled init path than under user load.

## Pitfalls

- If the metadata service is slow, boot time balloons. Parallelize with a bounded executor (e.g. 10 threads) rather than sequential loop.
- Don't tie `markAsInitialized` to "all tenants succeeded" — a single bad tenant would block the whole instance. Log and continue; alert on the failure.
