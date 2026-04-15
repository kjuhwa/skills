# Reference implementation notes

Source: `lucida-alarm` —
- `service/PolicyCheckDebouncer.java` — timer + Redis state
- `kafka/PolicyCheckEventPublisher.java` — per-tenant event emission
- `kafka/PolicyCheckEventConsumer.java` — lock + recheck loop

Redis keys used:
- `policy-check:first-change-time`
- `policy-check:last-change-time`
- `policy-check:changed-tenants` (SET)
- `policy-check:lock:<tenantId>` (NX EX)
- `policy-check:recheck:<tenantId>`

Pairs with the `redis-lock-recheck-flag-pattern` skill, which generalizes the lock/recheck mechanism on its own.
