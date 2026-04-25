---
version: 0.1.0-draft
name: dual-sided-worker-pool-toggle
summary: An evolver node only accepts hub-dispatched tasks when BOTH sides are turned on — local `WORKER_ENABLED=1` env var AND the "Worker" toggle on the evomap.ai node dashboard. Either side off means zero task flow, with no error; silent no-op is by design.
category: reference
tags: [worker-pool, dual-sided-toggle, env-config, hub-side, gotcha]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
source_paths:
  - README.md (WORKER_ENABLED vs. the Website Toggle section)
imported_at: 2026-04-18T03:00:00Z
---

# Worker Pool Two-Sided Enable Rule

The Evolver worker pool has two independent kill switches, *both* of which must be on:

| Side | Control | Scope | What it does |
|---|---|---|---|
| Local | `WORKER_ENABLED=1` env var | The evolver daemon process | Advertises worker metadata in heartbeats; accepts task payloads |
| Hub | Website toggle on node detail page at evomap.ai | Hub-side scheduling | Tells the hub whether to dispatch tasks to this node |

If either side is off, the node will not pick up work — and the failure is **silent**, no error log. That's the common debugging trap.

## Recommended setup flow

1. Set `WORKER_ENABLED=1` in the local `.env`.
2. Start the daemon: `node index.js --loop`.
3. Go to evomap.ai, find the node, turn on the **Worker** toggle.
4. Confirm by watching the heartbeat response for task pushes.

## Related env vars

| Variable | Default | Meaning |
|---|---|---|
| `WORKER_ENABLED` | unset | Local on/off |
| `WORKER_DOMAINS` | empty | Comma-list of accepted task domains (e.g. `repair,harden`) |
| `WORKER_MAX_LOAD` | `5` | Advertised concurrent capacity — a scheduling hint for the hub, **not** a local concurrency cap |

Key gotcha: `WORKER_MAX_LOAD` advertises but does not enforce. A misbehaving hub could push more than the advertised load; the local runtime does not reject.
