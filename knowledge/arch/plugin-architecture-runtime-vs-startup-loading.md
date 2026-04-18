---
version: 0.1.0-draft
name: plugin-architecture-runtime-vs-startup-loading
summary: Scouter server loads hot-reloadable script plugins (.plug files) for alerts/filters and compiled JAR plugins for stateful data handlers (sinks, connection-pool-heavy integrations)
category: arch
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [plugin, extensibility, scouter]
---

## Fact

Scouter exposes two plugin surfaces: (1) script plugins in `.plug` files (alert.plug, counter.plug, xlog.plug, xlogprofile.plug, summary.plug, object.plug) reloaded without restart — each intercepts data at a specific pipeline stage and receives a narrow context; (2) compiled plugins implementing `ServerPlugin`, loaded from a plugin JAR dir at startup — these hold state (connection pools for InfluxDB sinks, webhook pools for Slack/Telegram notifiers). Dual design trades tooling quality for iteration speed on rules (scripts) while retaining correctness/perf for integrations (JARs).

## Evidence

- `scouter.document/main/Plugin-Guide.md`
- `scouter.server/src/main/java/scouter/server/plugin/`

## How to apply

When designing a monitoring server: resist the urge to pick one plugin model. Ops will want to hot-reload alert rules without a deployment window. Partners will want to ship compiled sinks with native connection management. Building both surfaces costs ~1.5x the effort of either alone but covers both needs.
