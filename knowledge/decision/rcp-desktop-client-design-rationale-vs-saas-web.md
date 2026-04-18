---
version: 0.1.0-draft
name: rcp-desktop-client-design-rationale-vs-saas-web
summary: Scouter chose an Eclipse RCP desktop client over a browser UI to enable high-throughput binary streams, local caching, and real-time drill-down without HTTP/JSON overhead
category: decision
confidence: high
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [rcp, desktop, decision, apm, scouter]
---

## Fact

Unlike SaaS APMs (New Relic, Datadog), scouter is on-premise and its primary UI is a desktop Eclipse RCP app. The client opens a long-lived TCP connection to the collector and speaks the same binary pack protocol that agents use — no servlet, no JSON parsing. This enables real-time XLog scatter plots with thousands of points per second and low-latency drill-down into individual transactions. The trade-off is desktop install friction (separate Windows/macOS/Linux builds) and a worse onboarding story vs. a URL. Community has responded with browser-first alternatives (scouter-paper, scouter-pulse); both exist alongside RCP.

## Evidence

- `scouter.document/main/What-special-in-SCOUTER.md`
- `scouter.document/tech/Developer-Guide.md`

## How to apply

When building an observability UI: be honest about data volume. Sub-1000-points-per-second → browser is fine. 10000+ points per second live drill-down → a browser fighting HTTP, JSON, and React reconciliation will feel sluggish. A desktop (or a carefully engineered WebSocket binary protocol with WebGL rendering) may be the right call.
