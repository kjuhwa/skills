# Init Deadline Guard

## Problem
A service with async startup dependencies (Kafka topic provisioning, service discovery registration, per-tenant warm-up) can hang forever if a dependency is down. In Kubernetes, the pod keeps running, passes TCP probes, and serves traffic in a broken state.

## Pattern
Fail fast: if `ApplicationReadyEvent` fires but the app never flips an `initialized` flag within N milliseconds, force-exit. The orchestrator will restart the container and re-attempt bootstrap.

## Steps
1. Introduce a shared state holder with an `AtomicBoolean initialized`. Bootstrap code flips it to `true` on success.
2. On `ApplicationReadyEvent`, spawn a daemon scheduler.
3. After `deadlineMs`, check the flag. If still `false`, call `SpringApplication.exit(context, () -> 1)` then `System.exit(1)`.
4. Make `deadlineMs` configurable (e.g. `app.init.deadline-ms`) — long enough for a cold cluster, short enough to detect real hangs.
5. Log loudly before exit so ops can distinguish "killed by guard" from OOM / crash.

## Why this shape
- Daemon thread avoids blocking the main Spring lifecycle.
- `SpringApplication.exit` + `System.exit` ensures shutdown hooks and container-level restart both fire.
- A single `AtomicBoolean` keeps the contract simple — any bootstrap step that matters flips it.

## Anti-patterns
- Using liveness probes alone: the app answers HTTP but has no topics / no consumers.
- Retrying the failing step forever inside the bootstrap: hides root cause.
- Shortening deadline without measuring cold-start p99 — causes flapping.

## Generalize
Applicable to any Spring Boot service with async external bootstrap (Kafka, Eureka, Consul, DB migrations). Not just WebSocket / Kafka.
