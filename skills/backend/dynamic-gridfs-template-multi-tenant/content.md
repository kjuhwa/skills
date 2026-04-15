# Dynamic GridFsTemplate for per-tenant buckets

## Why
Spring Data MongoDB wires a single `GridFsTemplate` against one database + bucket. In a multi-tenant service where each tenant has its own DB (or distinct bucket per asset class — templates, exports, thumbnails), you need a factory that resolves the right `GridFsTemplate` at request time, with a cache so you don't rebuild it per call.

## Shape

```java
@Component
@RequiredArgsConstructor
public class DynamicGridFsTemplate {
  private final MongoDatabaseFactory baseFactory;
  private final MongoConverter converter;
  private final Map<String, GridFsTemplate> cache = new ConcurrentHashMap<>();

  public GridFsTemplate get(String dbName, String bucket) {
    String key = dbName + "::" + bucket;
    return cache.computeIfAbsent(key, k -> build(dbName, bucket));
  }

  private GridFsTemplate build(String dbName, String bucket) {
    MongoDatabaseFactory f = new SimpleMongoClientDatabaseFactory(
        baseFactory.getMongoClient(), dbName);
    return new GridFsTemplate(f, converter, bucket);
  }
}
```

## Gotchas
- Cache key must include **both** db name and bucket — two tenants with the same bucket name but different DBs will collide otherwise.
- Evict on tenant deprovisioning; `ConcurrentHashMap` never shrinks on its own.
- `MongoConverter` is shared — don’t rebuild per call, it’s expensive.
- Transactions span one `MongoDatabaseFactory`; don’t mix tenants inside one `@Transactional` boundary.

## Counter / Caveats
- If you have ≤ a few tenants, declare explicit `@Bean GridFsTemplate tenantAGridFs` per tenant — avoids the factory indirection.
- GridFS is great for 1–50 MB assets; for larger or hot-read assets, S3/object storage is usually cheaper and faster.
