# example/

End-to-end, runnable **example projects** built from (and demonstrating) skills and knowledge in this hub. Unlike `skills/` (snippets) and `knowledge/` (facts), entries here are whole standalone artifacts — tools, dashboards, mini-apps — that someone can clone and run.

## How to use

- Browse the catalog below, pick one, `git clone` or copy its folder.
- Each folder has a self-contained `README.md` with runnable instructions.
- Regenerate this catalog by running `/example_list --refresh` (it re-walks each subfolder's manifest).

## Catalog

| slug | title | stack | created |
|---|---|---|---|
| [skills-explorer](skills-explorer/) | Skills Explorer — offline search dashboard for a local skills-hub checkout | node, html, js | 2026-04-16 |
| [skill-doctor](skill-doctor/)       | Skill Doctor — zero-dep linter for SKILL.md and knowledge/*.md, CI-ready exit codes | node, cli | 2026-04-16 |
| [skill-graph](skill-graph/)         | Skill Graph — browser-based force-directed graph of skills ↔ knowledge relationships | node, html, svg, js | 2026-04-16 |
| [skill-stats](skill-stats/)         | Skill Stats — aggregate KPIs, category donut, ranked tag/project bars | node, html, svg, js | 2026-04-16 |
| [skill-timeline](skill-timeline/)   | Skill Timeline — git-history commit heatmap + top-churned slugs for a hub working copy | node, html, svg, js | 2026-04-16 |
| [skill-tryout](skill-tryout/)       | Skill Tryout — offline TF-IDF trigger matcher REPL for debugging skill discoverability | node, html, js | 2026-04-16 |
| [skill-diff](skill-diff/)           | Skill Diff — per-slug added/modified/removed viewer with description/tag/trigger deltas between two hub refs | node, html, js | 2026-04-16 |
| [json-diff-tree](json-diff-tree/)   | JSON Diff Tree — structural JSON diff with collapsible tree, ignore-filter, and RFC 6902 JSON Patch export | html, js, css | 2026-04-16 |
| [cron-explainer](cron-explainer/)   | Cron Explainer — parse 5/6/7-field cron to English, next 10 firings, 1-year firing-density heatmap | html, js, css | 2026-04-16 |
| [tiny-regex-lab](tiny-regex-lab/)   | Tiny Regex Lab — offline regex playground with per-group highlighting, preset library, and share-link | html, js, css | 2026-04-16 |
| [skill-multiplier](skill-multiplier/) | Skill Multiplier — self-running generational loop that breeds skills × knowledge into new children that themselves become parents, infinite propagation | node, html, js, css | 2026-04-16 |
| [skill-breeder](skill-breeder/) | Skill Breeder — manual breeding station with autocomplete parent pickers, preview, accept/discard, and parent-chain lineage viewer | node, html, js, css | 2026-04-16 |
| [skill-reactor](skill-reactor/) | Skill Reactor — rule-based reaction engine over the hub pool (`category=X + tag=Y → new skill`), cooldowns, per-rule stats, localStorage-persisted rules | node, html, js, css | 2026-04-16 |
| [agent-orchestration-dashboard](agent-orchestration-dashboard/) | AI Agent Orchestration Dashboard — D3.js force graph visualizing multi-agent workflows with particle animations, live stats, 3 cycling scenarios | html, js, css, d3 | 2026-04-16 |
| [mcp-protocol-playground](mcp-protocol-playground/) | MCP Protocol Playground — VS Code-inspired IDE for designing, validating, and simulating MCP tool schemas with 10 templates | html, js, css | 2026-04-16 |
| [vibe-coding-canvas](vibe-coding-canvas/) | Vibe Coding Canvas — natural language to UI component generator, Korean/English input, live preview with generated HTML/CSS | html, js, css | 2026-04-16 |
| [apm-dashboard](apm-dashboard/) | APM Suite Dashboard — trace waterfall, metrics dashboard (4 golden signals), service topology map with 7+ monitoring skills | html, css, vanilla-js | 2026-04-16 |
| [binary-protocol-inspector](binary-protocol-inspector/) | Binary Protocol Inspector — hex editor, schema designer, VarInt visualizer, decode/encode with field highlighting | html, css, vanilla-js | 2026-04-16 |
| [distributed-lock-visualizer](distributed-lock-visualizer/) | Distributed Lock Visualizer — MongoDB/Redis lock simulation with deadlock, thundering herd, split brain scenarios | html, css, vanilla-js, canvas | 2026-04-16 |
| [gacha-simulator](gacha-simulator/) | Gacha Simulator Arena — pull system with soft/hard pity, character collection, turn-based combat, status effects | html, css, vanilla-js | 2026-04-16 |

| [object-storage-galaxy](object-storage-galaxy/) | Object Storage Galaxy — auto-generated object-storage tool | html, css, vanilla-js | 2026-04-16 |

| [auto-hub-loop](auto-hub-loop/) | Hub Auto-Loop Dashboard — automated pipeline with web dashboard for generating, publishing, and learning | node, html, css, vanilla-js | 2026-04-16 |
| [dlq-flow-visualizer](dlq-flow-visualizer/) | Dlq Flow Visualizer — auto-generated dead-letter-queue tool | html, css, vanilla-js | 2026-04-16 |

| [actor-lifecycle-sim](actor-lifecycle-sim/) | Actor Lifecycle Sim — auto-generated actor-model tool | html, css, vanilla-js | 2026-04-16 |

| [mv-dependency-graph](mv-dependency-graph/) | Mv Dependency Graph — auto-generated materialized-view tool | html, css, vanilla-js | 2026-04-16 |

| [tsdb-live-dashboard](tsdb-live-dashboard/) | Tsdb Live Dashboard — auto-generated time-series-db tool | html, css, vanilla-js | 2026-04-16 |

| [ws-packet-visualizer](ws-packet-visualizer/) | Ws Packet Visualizer — auto-generated websocket tool | html, css, vanilla-js | 2026-04-16 |

| [token-bucket-visualizer](token-bucket-visualizer/) | Token Bucket Visualizer — auto-generated rate-limiter tool | html, css, vanilla-js | 2026-04-16 |

| [shard-flow-visualizer](shard-flow-visualizer/) | Shard Flow Visualizer — auto-generated database-sharding tool | html, css, vanilla-js | 2026-04-16 |

| [circuit-breaker-dashboard](circuit-breaker-dashboard/) | Circuit Breaker Dashboard — auto-generated circuit-breaker tool | html, css, vanilla-js | 2026-04-16 |

| [cdc-stream-monitor](cdc-stream-monitor/) | Cdc Stream Monitor — auto-generated cdc tool | html, css, vanilla-js | 2026-04-16 |

| [consistent-hashing-ring](consistent-hashing-ring/) | Consistent Hashing Ring — auto-generated consistent-hashing tool | html, css, vanilla-js | 2026-04-16 |

| [strangler-fig-growth](strangler-fig-growth/) | Strangler Fig Growth — auto-generated strangler-fig tool | html, css, vanilla-js | 2026-04-16 |

| [chaos-blast-radius](chaos-blast-radius/) | Chaos Blast Radius — auto-generated chaos-engineering tool | html, css, vanilla-js | 2026-04-16 |

| [etl-pipeline-viz](etl-pipeline-viz/) | Etl Pipeline Viz — auto-generated etl tool | html, css, vanilla-js | 2026-04-16 |

| [bulkhead-simulator](bulkhead-simulator/) | Bulkhead Simulator — auto-generated bulkhead tool | html, css, vanilla-js | 2026-04-16 |

| [event-sourcing-timeline](event-sourcing-timeline/) | Event Sourcing Timeline — auto-generated event-sourcing tool | html, css, vanilla-js | 2026-04-16 |

| [log-stream-monitor](log-stream-monitor/) | Log Stream Monitor — auto-generated log-aggregation tool | html, css, vanilla-js | 2026-04-16 |

| [backpressure-pipeline](backpressure-pipeline/) | Backpressure Pipeline — auto-generated backpressure tool | html, css, vanilla-js | 2026-04-16 |

| [domain-driven-bounded-context-map](domain-driven-bounded-context-map/) | Domain Driven Bounded Context Map — auto-generated domain-driven tool | html, css, vanilla-js | 2026-04-16 |

| [saga-orchestrator-sim](saga-orchestrator-sim/) | Saga Orchestrator Sim — auto-generated saga-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [retry-strategy-visualizer](retry-strategy-visualizer/) | Retry Strategy Visualizer — auto-generated retry-strategy tool | html, css, vanilla-js | 2026-04-16 |

| [schema-registry-explorer](schema-registry-explorer/) | Schema Registry Explorer — auto-generated schema-registry tool | html, css, vanilla-js | 2026-04-16 |

| [blue-green-deploy-simulator](blue-green-deploy-simulator/) | Blue Green Deploy Simulator — auto-generated blue-green-deploy tool | html, css, vanilla-js | 2026-04-16 |

| [idempotency-key-vault](idempotency-key-vault/) | Idempotency Key Vault — auto-generated idempotency tool | html, css, vanilla-js | 2026-04-16 |

| [pipeline-flow-monitor](pipeline-flow-monitor/) | Pipeline Flow Monitor — auto-generated data-pipeline tool | html, css, vanilla-js | 2026-04-16 |

| [load-balancer-simulator](load-balancer-simulator/) | Load Balancer Simulator — auto-generated load-balancer tool | html, css, vanilla-js | 2026-04-16 |

| [connection-pool-monitor](connection-pool-monitor/) | Connection Pool Monitor — auto-generated connection-pool tool | html, css, vanilla-js | 2026-04-16 |

| [canary-release-traffic-shifter](canary-release-traffic-shifter/) | Canary Release Traffic Shifter — auto-generated canary-release tool | html, css, vanilla-js | 2026-04-16 |

| [hex-arch-flow-simulator](hex-arch-flow-simulator/) | Hex Arch Flow Simulator — auto-generated hexagonal-architecture tool | html, css, vanilla-js | 2026-04-16 |

| [api-version-timeline](api-version-timeline/) | Api Version Timeline — auto-generated api-versioning tool | html, css, vanilla-js | 2026-04-16 |

| [trace-waterfall](trace-waterfall/) | Trace Waterfall — auto-generated distributed-tracing tool | html, css, vanilla-js | 2026-04-16 |

| [bff-pattern-flow](bff-pattern-flow/) | Bff Pattern Flow — auto-generated bff-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [fsm-visual-simulator](fsm-visual-simulator/) | Fsm Visual Simulator — auto-generated finite-state-machine tool | html, css, vanilla-js | 2026-04-16 |

| [outbox-flow-simulator](outbox-flow-simulator/) | Outbox Flow Simulator — auto-generated outbox-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [command-query-pipeline](command-query-pipeline/) | Command Query Pipeline — auto-generated command-query tool | html, css, vanilla-js | 2026-04-16 |

| [pub-sub-flow-canvas](pub-sub-flow-canvas/) | Pub Sub Flow Canvas — auto-generated pub-sub tool | html, css, vanilla-js | 2026-04-16 |

| [sidecar-proxy-topology](sidecar-proxy-topology/) | Sidecar Proxy Topology — auto-generated sidecar-proxy tool | html, css, vanilla-js | 2026-04-16 |

| [heartbeat-monitor](heartbeat-monitor/) | Heartbeat Monitor — auto-generated health-check tool | html, css, vanilla-js | 2026-04-16 |

| [oauth-flow-visualizer](oauth-flow-visualizer/) | Oauth Flow Visualizer — auto-generated oauth tool | html, css, vanilla-js | 2026-04-16 |

| [oauth-token-inspector](oauth-token-inspector/) | Oauth Token Inspector — auto-generated oauth tool | html, css, vanilla-js | 2026-04-16 |

| [shard-ring-router](shard-ring-router/) | Shard Ring Router — auto-generated database-sharding tool | html, css, vanilla-js | 2026-04-16 |

| [retry-strategy-simulator](retry-strategy-simulator/) | Retry Strategy Simulator — auto-generated retry-strategy tool | html, css, vanilla-js | 2026-04-16 |

| [etl-pipeline-flow](etl-pipeline-flow/) | Etl Pipeline Flow — auto-generated etl tool | html, css, vanilla-js | 2026-04-16 |

| [object-storage-bucket-viz](object-storage-bucket-viz/) | Object Storage Bucket Viz — auto-generated object-storage tool | html, css, vanilla-js | 2026-04-16 |

| [websocket-pulse](websocket-pulse/) | Websocket Pulse — auto-generated websocket tool | html, css, vanilla-js | 2026-04-16 |

| [strangler-fig-simulator](strangler-fig-simulator/) | Strangler Fig Simulator — auto-generated strangler-fig tool | html, css, vanilla-js | 2026-04-16 |

| [chaos-monkey-dashboard](chaos-monkey-dashboard/) | Chaos Monkey Dashboard — auto-generated chaos-engineering tool | html, css, vanilla-js | 2026-04-16 |

| [materialized-view-dag](materialized-view-dag/) | Materialized View Dag — auto-generated materialized-view tool | html, css, vanilla-js | 2026-04-16 |

| [blue-green-traffic-flow](blue-green-traffic-flow/) | Blue Green Traffic Flow — auto-generated blue-green-deploy tool | html, css, vanilla-js | 2026-04-16 |

| [actor-message-flow](actor-message-flow/) | Actor Message Flow — auto-generated actor-model tool | html, css, vanilla-js | 2026-04-16 |

| [saga-pattern-orchestrator](saga-pattern-orchestrator/) | Saga Pattern Orchestrator — auto-generated saga-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [outbox-pattern-flow](outbox-pattern-flow/) | Outbox Pattern Flow — auto-generated outbox-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [raft-election-arena](raft-election-arena/) | Raft Election Arena — auto-generated raft-consensus tool | html, css, vanilla-js | 2026-04-16 |

| [domain-driven-context-map](domain-driven-context-map/) | Domain Driven Context Map — auto-generated domain-driven tool | html, css, vanilla-js | 2026-04-16 |

| [bloom-filter-visualizer](bloom-filter-visualizer/) | Bloom Filter Visualizer — auto-generated bloom-filter tool | html, css, vanilla-js | 2026-04-16 |

| [raft-leader-election](raft-leader-election/) | Raft Leader Election — auto-generated raft-consensus tool | html, css, vanilla-js | 2026-04-16 |

| [circuit-breaker-simulator](circuit-breaker-simulator/) | Circuit Breaker Simulator — auto-generated circuit-breaker tool | html, css, vanilla-js | 2026-04-16 |

| [service-topology](service-topology/) | Service Topology — auto-generated distributed-tracing tool | html, css, vanilla-js | 2026-04-16 |

| [idempotency-proof-canvas](idempotency-proof-canvas/) | Idempotency Proof Canvas — auto-generated idempotency tool | html, css, vanilla-js | 2026-04-16 |

| [fsm-regex-tester](fsm-regex-tester/) | Fsm Regex Tester — auto-generated finite-state-machine tool | html, css, vanilla-js | 2026-04-16 |

| [strangler-fig-ecosystem](strangler-fig-ecosystem/) | Strangler Fig Ecosystem — auto-generated strangler-fig tool | html, css, vanilla-js | 2026-04-16 |

| [service-mesh-topology](service-mesh-topology/) | Service Mesh Topology — auto-generated service-mesh tool | html, css, vanilla-js | 2026-04-16 |

| [canary-release-timeline](canary-release-timeline/) | Canary Release Timeline — auto-generated canary-release tool | html, css, vanilla-js | 2026-04-16 |

| [cdc-table-diff](cdc-table-diff/) | Cdc Table Diff — auto-generated cdc tool | html, css, vanilla-js | 2026-04-16 |

| [tsdb-query-playground](tsdb-query-playground/) | Tsdb Query Playground — auto-generated time-series-db tool | html, css, vanilla-js | 2026-04-16 |

| [pipeline-dag-builder](pipeline-dag-builder/) | Pipeline Dag Builder — auto-generated data-pipeline tool | html, css, vanilla-js | 2026-04-16 |

| [event-sourcing-bank](event-sourcing-bank/) | Event Sourcing Bank — auto-generated event-sourcing tool | html, css, vanilla-js | 2026-04-16 |

| [api-versioning-timeline](api-versioning-timeline/) | Api Versioning Timeline — auto-generated api-versioning tool | html, css, vanilla-js | 2026-04-16 |

| [chaos-fault-injector](chaos-fault-injector/) | Chaos Fault Injector — auto-generated chaos-engineering tool | html, css, vanilla-js | 2026-04-16 |

| [rate-limiter-playground](rate-limiter-playground/) | Rate Limiter Playground — auto-generated rate-limiter tool | html, css, vanilla-js | 2026-04-16 |

| [websocket-frames](websocket-frames/) | Websocket Frames — auto-generated websocket tool | html, css, vanilla-js | 2026-04-16 |

| [circuit-breaker-flow](circuit-breaker-flow/) | Circuit Breaker Flow — auto-generated circuit-breaker tool | html, css, vanilla-js | 2026-04-16 |

| [saga-pattern-timeline](saga-pattern-timeline/) | Saga Pattern Timeline — auto-generated saga-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [dlq-autopsy-table](dlq-autopsy-table/) | Dlq Autopsy Table — auto-generated dead-letter-queue tool | html, css, vanilla-js | 2026-04-16 |

| [message-queue-flow](message-queue-flow/) | Message Queue Flow — auto-generated message-queue tool | html, css, vanilla-js | 2026-04-16 |

| [tsdb-live-monitor](tsdb-live-monitor/) | Tsdb Live Monitor — auto-generated time-series-db tool | html, css, vanilla-js | 2026-04-16 |

| [connection-pool-bubbles](connection-pool-bubbles/) | Connection Pool Bubbles — auto-generated connection-pool tool | html, css, vanilla-js | 2026-04-16 |

| [event-sourcing-ledger](event-sourcing-ledger/) | Event Sourcing Ledger — auto-generated event-sourcing tool | html, css, vanilla-js | 2026-04-16 |

| [canary-release-dashboard](canary-release-dashboard/) | Canary Release Dashboard — auto-generated canary-release tool | html, css, vanilla-js | 2026-04-16 |

| [schema-version-timeline](schema-version-timeline/) | Schema Version Timeline — auto-generated schema-registry tool | html, css, vanilla-js | 2026-04-16 |

| [idempotency-sandbox](idempotency-sandbox/) | Idempotency Sandbox — auto-generated idempotency tool | html, css, vanilla-js | 2026-04-16 |

| [bulkhead-ship](bulkhead-ship/) | Bulkhead Ship — auto-generated bulkhead tool | html, css, vanilla-js | 2026-04-16 |

| [circuit-breaker-visualizer](circuit-breaker-visualizer/) | Circuit Breaker Visualizer — auto-generated circuit-breaker tool | html, css, vanilla-js | 2026-04-16 |

| [sidecar-proxy-traffic-flow](sidecar-proxy-traffic-flow/) | Sidecar Proxy Traffic Flow — auto-generated sidecar-proxy tool | html, css, vanilla-js | 2026-04-16 |

| [cqrs-event-flow](cqrs-event-flow/) | Cqrs Event Flow — auto-generated cqrs tool | html, css, vanilla-js | 2026-04-16 |

| [event-sourcing-stream](event-sourcing-stream/) | Event Sourcing Stream — auto-generated event-sourcing tool | html, css, vanilla-js | 2026-04-16 |

| [retry-strategy-timeline](retry-strategy-timeline/) | Retry Strategy Timeline — auto-generated retry-strategy tool | html, css, vanilla-js | 2026-04-16 |

| [command-query-separator](command-query-separator/) | Command Query Separator — auto-generated command-query tool | html, css, vanilla-js | 2026-04-16 |

| [object-storage-treemap](object-storage-treemap/) | Object Storage Treemap — auto-generated object-storage tool | html, css, vanilla-js | 2026-04-16 |

| [pub-sub-galaxy](pub-sub-galaxy/) | Pub Sub Galaxy — auto-generated pub-sub tool | html, css, vanilla-js | 2026-04-16 |

| [graphql-schema-galaxy](graphql-schema-galaxy/) | Graphql Schema Galaxy — auto-generated graphql tool | html, css, vanilla-js | 2026-04-16 |

| [lb-traffic-flow](lb-traffic-flow/) | Lb Traffic Flow — auto-generated load-balancer tool | html, css, vanilla-js | 2026-04-16 |

| [queue-monitor-dashboard](queue-monitor-dashboard/) | Queue Monitor Dashboard — auto-generated message-queue tool | html, css, vanilla-js | 2026-04-16 |

| [chaos-monkey-simulator](chaos-monkey-simulator/) | Chaos Monkey Simulator — auto-generated chaos-engineering tool | html, css, vanilla-js | 2026-04-16 |

| [tsdb-retention-planner](tsdb-retention-planner/) | Tsdb Retention Planner — auto-generated time-series-db tool | html, css, vanilla-js | 2026-04-16 |

| [cdc-stream-visualizer](cdc-stream-visualizer/) | Cdc Stream Visualizer — auto-generated cdc tool | html, css, vanilla-js | 2026-04-16 |

| [health-check-pulse](health-check-pulse/) | Health Check Pulse — auto-generated health-check tool | html, css, vanilla-js | 2026-04-16 |

| [idempotency-replay-lab](idempotency-replay-lab/) | Idempotency Replay Lab — auto-generated idempotency tool | html, css, vanilla-js | 2026-04-16 |

| [api-versioning-drift-monitor](api-versioning-drift-monitor/) | Api Versioning Drift Monitor — auto-generated api-versioning tool | html, css, vanilla-js | 2026-04-16 |

| [bloom-filter-false-positive](bloom-filter-false-positive/) | Bloom Filter False Positive — auto-generated bloom-filter tool | html, css, vanilla-js | 2026-04-16 |

| [consistent-hashing-load](consistent-hashing-load/) | Consistent Hashing Load — auto-generated consistent-hashing tool | html, css, vanilla-js | 2026-04-16 |

| [pipeline-throughput-dashboard](pipeline-throughput-dashboard/) | Pipeline Throughput Dashboard — auto-generated data-pipeline tool | html, css, vanilla-js | 2026-04-16 |

| [connection-pool-tuner](connection-pool-tuner/) | Connection Pool Tuner — auto-generated connection-pool tool | html, css, vanilla-js | 2026-04-16 |

| [bff-pattern-dashboard](bff-pattern-dashboard/) | Bff Pattern Dashboard — auto-generated bff-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [fsm-traffic-controller](fsm-traffic-controller/) | Fsm Traffic Controller — auto-generated finite-state-machine tool | html, css, vanilla-js | 2026-04-16 |

| [domain-driven-aggregate-builder](domain-driven-aggregate-builder/) | Domain Driven Aggregate Builder — auto-generated domain-driven tool | html, css, vanilla-js | 2026-04-16 |

| [log-stream-waterfall](log-stream-waterfall/) | Log Stream Waterfall — auto-generated log-aggregation tool | html, css, vanilla-js | 2026-04-16 |

| [schema-compatibility-checker](schema-compatibility-checker/) | Schema Compatibility Checker — auto-generated schema-registry tool | html, css, vanilla-js | 2026-04-16 |

| [hex-arch-port-adapter-sim](hex-arch-port-adapter-sim/) | Hex Arch Port Adapter Sim — auto-generated hexagonal-architecture tool | html, css, vanilla-js | 2026-04-16 |

| [trace-waterfall-viewer](trace-waterfall-viewer/) | Trace Waterfall Viewer — auto-generated distributed-tracing tool | html, css, vanilla-js | 2026-04-16 |

| [bff-pattern-builder](bff-pattern-builder/) | Bff Pattern Builder — auto-generated bff-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [object-storage-flow](object-storage-flow/) | Object Storage Flow — auto-generated object-storage tool | html, css, vanilla-js | 2026-04-16 |

| [dlq-pulse-monitor](dlq-pulse-monitor/) | Dlq Pulse Monitor — auto-generated dead-letter-queue tool | html, css, vanilla-js | 2026-04-16 |

| [canary-release-simulator](canary-release-simulator/) | Canary Release Simulator — auto-generated canary-release tool | html, css, vanilla-js | 2026-04-16 |

| [log-heatmap-grid](log-heatmap-grid/) | Log Heatmap Grid — auto-generated log-aggregation tool | html, css, vanilla-js | 2026-04-16 |

| [oauth-scope-playground](oauth-scope-playground/) | Oauth Scope Playground — auto-generated oauth tool | html, css, vanilla-js | 2026-04-16 |

| [read-replica-topology](read-replica-topology/) | Read Replica Topology — auto-generated read-replica tool | html, css, vanilla-js | 2026-04-16 |

| [fsm-playground](fsm-playground/) | Fsm Playground — auto-generated finite-state-machine tool | html, css, vanilla-js | 2026-04-16 |

| [hex-arch-visualizer](hex-arch-visualizer/) | Hex Arch Visualizer — auto-generated hexagonal-architecture tool | html, css, vanilla-js | 2026-04-16 |

| [command-query-timeline](command-query-timeline/) | Command Query Timeline — auto-generated command-query tool | html, css, vanilla-js | 2026-04-16 |

| [rate-limiter-bucket](rate-limiter-bucket/) | Rate Limiter Bucket — auto-generated rate-limiter tool | html, css, vanilla-js | 2026-04-16 |

| [schema-evolution-timeline](schema-evolution-timeline/) | Schema Evolution Timeline — auto-generated schema-registry tool | html, css, vanilla-js | 2026-04-16 |

| [etl-pipeline-visualizer](etl-pipeline-visualizer/) | Etl Pipeline Visualizer — auto-generated etl tool | html, css, vanilla-js | 2026-04-16 |

| [load-balancer-arena](load-balancer-arena/) | Load Balancer Arena — auto-generated load-balancer tool | html, css, vanilla-js | 2026-04-16 |

| [backpressure-river](backpressure-river/) | Backpressure River — auto-generated backpressure tool | html, css, vanilla-js | 2026-04-16 |

| [actor-mailbox-simulator](actor-mailbox-simulator/) | Actor Mailbox Simulator — auto-generated actor-model tool | html, css, vanilla-js | 2026-04-16 |

| [shard-router-visualizer](shard-router-visualizer/) | Shard Router Visualizer — auto-generated database-sharding tool | html, css, vanilla-js | 2026-04-16 |

| [service-mesh-traffic-visualizer](service-mesh-traffic-visualizer/) | Service Mesh Traffic Visualizer — auto-generated service-mesh tool | html, css, vanilla-js | 2026-04-16 |

| [sidecar-proxy-flow](sidecar-proxy-flow/) | Sidecar Proxy Flow — auto-generated sidecar-proxy tool | html, css, vanilla-js | 2026-04-16 |

| [raft-consensus-quiz](raft-consensus-quiz/) | Raft Consensus Quiz — auto-generated raft-consensus tool | html, css, vanilla-js | 2026-04-16 |

| [bloom-filter-explorer](bloom-filter-explorer/) | Bloom Filter Explorer — auto-generated bloom-filter tool | html, css, vanilla-js | 2026-04-16 |

| [message-queue-conveyor](message-queue-conveyor/) | Message Queue Conveyor — auto-generated message-queue tool | html, css, vanilla-js | 2026-04-16 |

| [blue-green-traffic-shifter](blue-green-traffic-shifter/) | Blue Green Traffic Shifter — auto-generated blue-green-deploy tool | html, css, vanilla-js | 2026-04-16 |

| [circuit-breaker-puzzle](circuit-breaker-puzzle/) | Circuit Breaker Puzzle — auto-generated circuit-breaker tool | html, css, vanilla-js | 2026-04-16 |

| [cqrs-flow-visualizer](cqrs-flow-visualizer/) | Cqrs Flow Visualizer — auto-generated cqrs tool | html, css, vanilla-js | 2026-04-16 |

| [materialized-view-builder](materialized-view-builder/) | Materialized View Builder — auto-generated materialized-view tool | html, css, vanilla-js | 2026-04-16 |

| [chaos-blast-radius-simulator](chaos-blast-radius-simulator/) | Chaos Blast Radius Simulator — auto-generated chaos-engineering tool | html, css, vanilla-js | 2026-04-16 |

| [topic-river](topic-river/) | Topic River — auto-generated pub-sub tool | html, css, vanilla-js | 2026-04-16 |

| [cdc-replay-timeline](cdc-replay-timeline/) | Cdc Replay Timeline — auto-generated cdc tool | html, css, vanilla-js | 2026-04-16 |

| [idempotent-function-playground](idempotent-function-playground/) | Idempotent Function Playground — auto-generated idempotency tool | html, css, vanilla-js | 2026-04-16 |

| [websocket-pulse-monitor](websocket-pulse-monitor/) | Websocket Pulse Monitor — auto-generated websocket tool | html, css, vanilla-js | 2026-04-16 |

| [retry-strategy-explorer](retry-strategy-explorer/) | Retry Strategy Explorer — auto-generated retry-strategy tool | html, css, vanilla-js | 2026-04-16 |

| [feature-flags-rollout-simulator](feature-flags-rollout-simulator/) | Feature Flags Rollout Simulator — auto-generated feature-flags tool | html, css, vanilla-js | 2026-04-16 |

| [api-gateway-traffic-router](api-gateway-traffic-router/) | Api Gateway Traffic Router — auto-generated api-gateway-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [event-replay-timeline](event-replay-timeline/) | Event Replay Timeline — auto-generated event-sourcing tool | html, css, vanilla-js | 2026-04-16 |

| [bulkhead-pool-simulator](bulkhead-pool-simulator/) | Bulkhead Pool Simulator — auto-generated bulkhead tool | html, css, vanilla-js | 2026-04-16 |

| [saga-orchestrator-flow](saga-orchestrator-flow/) | Saga Orchestrator Flow — auto-generated saga-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [api-versioning-diff-simulator](api-versioning-diff-simulator/) | Api Versioning Diff Simulator — auto-generated api-versioning tool | html, css, vanilla-js | 2026-04-16 |

| [domain-driven-explorer](domain-driven-explorer/) | Domain Driven Explorer — auto-generated domain-driven tool | html, css, vanilla-js | 2026-04-16 |

| [data-pipeline-flow](data-pipeline-flow/) | Data Pipeline Flow — auto-generated data-pipeline tool | html, css, vanilla-js | 2026-04-16 |

| [graphql-query-playground](graphql-query-playground/) | Graphql Query Playground — auto-generated graphql tool | html, css, vanilla-js | 2026-04-16 |

| [health-check-radar](health-check-radar/) | Health Check Radar — auto-generated health-check tool | html, css, vanilla-js | 2026-04-16 |

| [connection-pool-visualizer](connection-pool-visualizer/) | Connection Pool Visualizer — auto-generated connection-pool tool | html, css, vanilla-js | 2026-04-16 |

| [outbox-pattern-simulator](outbox-pattern-simulator/) | Outbox Pattern Simulator — auto-generated outbox-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [crdt-counter-cluster](crdt-counter-cluster/) | Crdt Counter Cluster — auto-generated crdt tool | html, css, vanilla-js | 2026-04-16 |

| [hash-ring-visualizer](hash-ring-visualizer/) | Hash Ring Visualizer — auto-generated consistent-hashing tool | html, css, vanilla-js | 2026-04-16 |

| [time-series-db-explorer](time-series-db-explorer/) | Time Series Db Explorer — auto-generated time-series-db tool | html, css, vanilla-js | 2026-04-16 |

| [strangler-fig-migrator](strangler-fig-migrator/) | Strangler Fig Migrator — auto-generated strangler-fig tool | html, css, vanilla-js | 2026-04-16 |

| [event-ledger-replay](event-ledger-replay/) | Event Ledger Replay — auto-generated event-sourcing tool | html, css, vanilla-js | 2026-04-16 |

| [jwt-token-inspector](jwt-token-inspector/) | Jwt Token Inspector — auto-generated oauth tool | html, css, vanilla-js | 2026-04-16 |

| [api-gateway-policy-lab](api-gateway-policy-lab/) | Api Gateway Policy Lab — auto-generated api-gateway-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [pipeline-flow-visualizer](pipeline-flow-visualizer/) | Pipeline Flow Visualizer — auto-generated data-pipeline tool | html, css, vanilla-js | 2026-04-16 |

| [bulkhead-ship-damage](bulkhead-ship-damage/) | Bulkhead Ship Damage — auto-generated bulkhead tool | html, css, vanilla-js | 2026-04-16 |

| [saga-choreography-swarm](saga-choreography-swarm/) | Saga Choreography Swarm — auto-generated saga-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [traffic-light-fsm](traffic-light-fsm/) | Traffic Light Fsm — auto-generated finite-state-machine tool | html, css, vanilla-js | 2026-04-16 |

| [object-storage-explorer](object-storage-explorer/) | Object Storage Explorer — auto-generated object-storage tool | html, css, vanilla-js | 2026-04-16 |

| [pub-sub-newsroom](pub-sub-newsroom/) | Pub Sub Newsroom — auto-generated pub-sub tool | html, css, vanilla-js | 2026-04-16 |

| [feature-flag-rollout-simulator](feature-flag-rollout-simulator/) | Feature Flag Rollout Simulator — auto-generated feature-flags tool | html, css, vanilla-js | 2026-04-16 |

| [event-sourced-counter](event-sourced-counter/) | Event Sourced Counter — auto-generated cqrs tool | html, css, vanilla-js | 2026-04-16 |

| [rebalance-simulator](rebalance-simulator/) | Rebalance Simulator — auto-generated consistent-hashing tool | html, css, vanilla-js | 2026-04-16 |

| [log-stream-river](log-stream-river/) | Log Stream River — auto-generated log-aggregation tool | html, css, vanilla-js | 2026-04-16 |

| [websocket-handshake-visualizer](websocket-handshake-visualizer/) | Websocket Handshake Visualizer — auto-generated websocket tool | html, css, vanilla-js | 2026-04-16 |

| [crdt-counter-sync](crdt-counter-sync/) | Crdt Counter Sync — auto-generated crdt tool | html, css, vanilla-js | 2026-04-16 |

| [materialized-view-refresh-simulator](materialized-view-refresh-simulator/) | Materialized View Refresh Simulator — auto-generated materialized-view tool | html, css, vanilla-js | 2026-04-16 |

| [outbox-pattern-pipeline](outbox-pattern-pipeline/) | Outbox Pattern Pipeline — auto-generated outbox-pattern tool | html, css, vanilla-js | 2026-04-16 |

| [strangler-fig-garden](strangler-fig-garden/) | Strangler Fig Garden — auto-generated strangler-fig tool | html, css, vanilla-js | 2026-04-16 |

| [queue-conductor](queue-conductor/) | Queue Conductor — auto-generated message-queue tool | html, css, vanilla-js | 2026-04-16 |

| [connection-pool-tycoon](connection-pool-tycoon/) | Connection Pool Tycoon — auto-generated connection-pool tool | html, css, vanilla-js | 2026-04-16 |

| [bounded-context-mapper](bounded-context-mapper/) | Bounded Context Mapper — auto-generated domain-driven tool | html, css, vanilla-js | 2026-04-16 |

| [http-method-idempotency-quiz](http-method-idempotency-quiz/) | Http Method Idempotency Quiz — auto-generated idempotency tool | html, css, vanilla-js | 2026-04-16 |

| [flow-valve-simulator](flow-valve-simulator/) | Flow Valve Simulator — auto-generated backpressure tool | html, css, vanilla-js | 2026-04-16 |

| [algorithm-race-lab](algorithm-race-lab/) | Algorithm Race Lab — auto-generated load-balancer tool | html, css, vanilla-js | 2026-04-16 |

| [etl-transform-playground](etl-transform-playground/) | Etl Transform Playground — auto-generated etl tool | html, css, vanilla-js | 2026-04-16 |

| [blue-green-deploy-cockpit](blue-green-deploy-cockpit/) | Blue Green Deploy Cockpit — auto-generated blue-green-deploy tool | html, css, vanilla-js | 2026-04-16 |

| [cqrs-flow-simulator](cqrs-flow-simulator/) | Cqrs Flow Simulator — auto-generated command-query tool | html, css, vanilla-js | 2026-04-16 |

| [hexagonal-ports-adapters-playground](hexagonal-ports-adapters-playground/) | Hexagonal Ports Adapters Playground — auto-generated hexagonal-architecture tool | html, css, vanilla-js | 2026-04-16 |

| [mesh-traffic-visualizer](mesh-traffic-visualizer/) | Mesh Traffic Visualizer — auto-generated service-mesh tool | html, css, vanilla-js | 2026-04-16 |

| [sidecar-proxy-explorer](sidecar-proxy-explorer/) | Sidecar Proxy Explorer — auto-generated sidecar-proxy tool | html, css, vanilla-js | 2026-04-16 |

| [gameday-scenario-runner](gameday-scenario-runner/) | Gameday Scenario Runner — auto-generated chaos-engineering tool | html, css, vanilla-js | 2026-04-16 |

| [dlq-triage-console](dlq-triage-console/) | Dlq Triage Console — auto-generated dead-letter-queue tool | html, css, vanilla-js | 2026-04-16 |

| [actor-mailbox-theater](actor-mailbox-theater/) | Actor Mailbox Theater — auto-generated actor-model tool | html, css, vanilla-js | 2026-04-16 |

| [read-replica-lag-monitor](read-replica-lag-monitor/) | Read Replica Lag Monitor — auto-generated read-replica tool | html, css, vanilla-js | 2026-04-16 |

| [raft-term-timeline](raft-term-timeline/) | Raft Term Timeline — auto-generated raft-consensus tool | html, css, vanilla-js | 2026-04-16 |

| [tsdb-ingest-simulator](tsdb-ingest-simulator/) | Tsdb Ingest Simulator — auto-generated time-series-db tool | html, css, vanilla-js | 2026-04-16 |

| [circuit-breaker-grid](circuit-breaker-grid/) | Circuit Breaker Grid — auto-generated circuit-breaker tool | html, css, vanilla-js | 2026-04-16 |

## Adding an example

Use the `/example_add <slug>` slash command from a working copy that contains the artifact. It will:

1. Copy the selected files into `example/<slug>/`
2. Generate `README.md` and `manifest.json`
3. Branch, commit, push, and open a PR
4. Update this catalog

Duplication check: `/make_something` invokes `/example_list` first to avoid rebuilding something already here.
