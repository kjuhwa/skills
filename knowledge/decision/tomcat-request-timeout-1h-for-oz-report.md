---
version: 0.1.0-draft
tags: [decision, tomcat, request, timeout, for, report]
name: tomcat-request-timeout-1h-for-oz-report
description: Report-generation services should raise Tomcat connection/read timeout to ~1 hour because export of large OZ/Jasper reports is genuinely long-running
type: decision
category: decision
source:
  kind: project
  ref: lucida-report@35a2a06
---

## Fact
Report-generation services that drive OZ Report (or similar vendor export engines) need a Tomcat request/read timeout around **3600 s** (1 hour). Default 30–60 s causes premature connection kills on large PDF/XLS exports.

## Why
Generating a multi-tab XLS or multi-hundred-page PDF across millions of measurement rows is CPU/IO-bound and can legitimately take 10–30 min. When the reverse proxy or Tomcat kills the connection at 60 s, the client retries — producing duplicate exports, duplicate Kafka audit events, and wasted engine cycles. The 1-hour limit was chosen to be comfortably above the observed p99 generation time.

## How to apply
- Set `server.tomcat.connection-timeout=3600000` (or the equivalent sidecar Tomcat `connector.connectionTimeout` / `keepAliveTimeout`) on the **report service and every proxy in front of it** (Traefik, nginx, LB). The longest chain wins, not the shortest.
- Pair with an async job pattern: if generation exceeds ~5 min, switch to a "202 Accepted + poll for result" API instead of holding a sync HTTP connection for an hour.
- Monitor actual p95/p99 duration per report type — if they climb toward the cap, add pagination or background execution rather than raising the cap further.

## Evidence
- Commit `5e8da60` — `issue #89691 보고서 tomcat의 요청 타임아웃을 1 시간으로 설정.`

## Counter
- Long timeouts mask real problems (N+1 queries, missing indexes, unbounded result sets). Raise the timeout only after confirming the work genuinely requires it.
