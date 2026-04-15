# Spring Data Mongo repository: Custom/Impl split

## Files

- `FooRepository extends MongoRepository<Foo,String>, FooRepositoryCustom` — CRUD + derived queries.
- `FooRepositoryCustom` — interface listing handwritten query methods.
- `FooRepositoryImpl implements FooRepositoryCustom` — injects `MongoTemplate`; writes Criteria/Aggregation by hand.

## Why

- Keeps derived-query inference intact on the base interface (adding methods to `FooRepository` directly only works if Spring Data can parse the name).
- Handwritten queries (aggregation pipelines, dynamic Criteria, bulk ops) need `MongoTemplate`.
- The `*Impl` suffix is the convention Spring Data autowires to the base repository. Changing the suffix requires extra config — don't.

## Steps

1. Create the three files with exactly `Foo`, `FooCustom`, `FooImpl` naming.
2. In `*Impl`, constructor-inject `MongoTemplate` (not `MongoOperations`) if you need index management.
3. For tenant-isolated setups, resolve collection name at the top of each method.
4. For dynamic filters, build `Criteria` in a helper and combine via `.andOperator(...)`/`.orOperator(...)`.
5. For large result scans, prefer `mongoTemplate.stream(...)` over `find(...)` to avoid loading the full list.

## Counter / caveats

- If the `*Impl` file is in a different package than the repository interface, Spring Data may not discover it — keep them colocated.
- Don't put business logic here; the repository should return documents/DTOs, not orchestrate events.
