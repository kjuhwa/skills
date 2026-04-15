# Reference implementation notes

Source: `lucida-meta` — `message/service/DistributedLockServiceImpl.java`, used by `MessageLoaderServiceImpl` to serialize multi-tenant init.

Typical lock keys: `meta:init:<tenantId>`, `messages:reload:<tenantId>`.

Retry wrapper pattern:

```java
long deadline = System.currentTimeMillis() + timeoutMs;
while (System.currentTimeMillis() < deadline) {
    if (lock.tryLock(key, ttl)) return true;
    Thread.sleep(100);
}
return false;
```

## When to pick this over alternatives

- ✅ Already have MongoDB, no Redis.
- ✅ Coarse-grained locks (per-tenant init, per-job run).
- ❌ Thousands of contentions/sec → Redis.
- ❌ Need fair FIFO ordering → Zookeeper/etcd.
