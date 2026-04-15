# Tenant-Aware ThreadPoolConfig

```java
@Configuration
@EnableAsync
@EnableScheduling
public class ThreadPoolConfig extends TenantAsyncConfigurerSupport {

    @Value("${thread.scheduler.pool-size:20}")   private int schedulerPoolSize;
    @Value("${thread.executor.core-pool-size:100}") private int corePool;
    @Value("${thread.executor.max-pool-size:200}")  private int maxPool;
    @Value("${thread.executor.queue-capacity:100}") private int queue;

    @Bean
    public TaskScheduler taskScheduler() {
        var s = new ThreadPoolTaskScheduler();
        s.setPoolSize(schedulerPoolSize);
        s.setThreadNamePrefix("sched-");
        return s;
    }

    @Override
    public Executor getAsyncExecutor() {
        var e = new ThreadPoolTaskExecutor();
        e.setCorePoolSize(corePool);
        e.setMaxPoolSize(maxPool);
        e.setQueueCapacity(queue);
        e.setThreadNamePrefix("async-");
        e.setTaskDecorator(tenantContextDecorator()); // from parent class
        e.initialize();
        return e;
    }
}
```

## Why property-driven

Every tenant/deployment tunes pools differently — hardcoding forces a rebuild. Expose via `application.yml` with sensible defaults in `@Value("${...:default}")`.

## Why tenant-aware

`@Async` hands work to a new thread; `ThreadLocal`-based tenant context is lost unless a `TaskDecorator` snapshots it before execution and restores inside the worker thread. Extending `TenantAsyncConfigurerSupport` (or writing an equivalent decorator) preserves the tenant.

## Pitfall

- `ThreadPoolTaskExecutor` uses an unbounded queue by default — OOM risk. Always set `queueCapacity`.
- With core=100/max=200/queue=100, the executor won't grow past 100 until queue fills (100 tasks), then grows to 200. Tune for your burst shape.
