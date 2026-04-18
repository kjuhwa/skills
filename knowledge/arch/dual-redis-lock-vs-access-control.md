---
name: dual-redis-lock-vs-access-control
version: 0.1.0-draft
tags: [arch, dual, redis, lock, access, control]
title: Two Redis instances — one for distributed locks, one for access control
category: arch
summary: The service connects to two separate Redis instances: Lock Control (default port 6399) and Access Control (default port 6389). They are not interchangeable.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  files:
    - build.gradle
    - CLAUDE.md
confidence: high
---

## Fact

`bootRun` sets `REDIS_LOCK_CONTROL_HOST/PORT` (6399) and `REDIS_ACCESS_CONTROL_HOST/PORT` (6389) as distinct env vars. Both must be reachable for the service to start fully.

## Why

Splitting locking traffic from auth/session traffic isolates failure domains: a lock-holder stampede can't evict auth keys, and an auth incident can't block Quartz/scheduler locks. The port convention (6399 vs 6389) is also used by sibling services in the platform.

## How to apply

- When running locally, stand up both Redis ports; a single shared instance won't match the expected config and some features will fail silently (missed locks, 401s).
- When adding a new Redis-backed feature, route it to the instance whose failure mode matches — locking/coordination → Lock Control; session/auth/ACL → Access Control.
- When debugging a flaky scheduler, check the Lock Control instance first; when debugging auth oddities, check Access Control.

## Counter / caveats

- Docs/CLAUDE.md mention a third generic `REDIS_HOST:6379` in `bootRun`; confirm current usage before assuming only two instances.
