---
version: 0.1.0-draft
name: worker-pool-two-sided-enable
summary: In a hub-dispatch worker pool, work is only sent to a node when *both* the local daemon advertises worker capability via heartbeat *and* a hub-side toggle allows dispatch. Either side off = no work. This two-key model prevents accidental enrollment and accidental mass-drop.
category: reference
confidence: medium
tags: [worker-pool, heartbeat, distributed, capability-advertisement, hub-dispatch]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 4c51382092f9cb125d3ec55475861ead8d1463a6
source_project: evolver
imported_at: 2026-04-18T02:45:00Z
---

# Worker Pool — Two-Sided Enable

## The pattern

A node participates in a distributed worker pool only when **two independent switches** are both on:

| Switch | Scope | Mechanism | Controlled by |
|---|---|---|---|
| Local enable | Node-local | Env var (`WORKER_ENABLED=1`) → daemon includes worker metadata in heartbeat | Host operator |
| Hub-side enable | Hub-side | Per-node toggle in the hub admin UI → hub willing to dispatch to this node_id | Pool operator |

If either side is off, the node never receives work. This is on purpose.

## Why two switches instead of one

- **Host operator consent.** A hub admin cannot silently enroll a host into doing work for the network. Local env var is the operator's veto.
- **Pool operator safety valve.** A misbehaving node (flaky, malicious, saturated) can be dropped from dispatch immediately by the hub without coordinating with the host.
- **Fast mass drop.** In an incident, the pool operator can stop dispatch to everyone by toggling at the hub — no need to race `ssh` to hundreds of hosts.

## Heartbeat payload shape

When local is on, the heartbeat includes a `worker` block:

```json
{
  "worker": {
    "enabled": true,
    "domains": ["repair", "harden"],   // which task kinds this node accepts
    "max_load": 3                       // advertised concurrency cap (hint, not enforced)
  }
}
```

`max_load` is advisory — it tells the hub scheduler how much to queue for this node, but the node does not enforce it as a local concurrency limit.

## Task claim atomicity

A claim is only finalized after the node's own validation step succeeds (evolver claims tasks during `solidify`, after the change has already passed validation). Claiming before success means a flaky node could hold many tasks in a half-claimed state forever.

## Environment knobs

| Var | Default | Purpose |
|---|---|---|
| `WORKER_ENABLED` | unset | Master local switch |
| `WORKER_DOMAINS` | empty | Comma-separated task kinds this node accepts |
| `WORKER_MAX_LOAD` | `5` | Advertised concurrency hint to the hub |

## Gotchas

- **Heartbeat interval matters.** If heartbeat is 6 min (evolver default), toggling local OFF still lets the hub dispatch for up to that window. Either shorten heartbeat during maintenance or flip the hub-side toggle first.
- **Domains default to "nothing."** An empty `WORKER_DOMAINS` means this node accepts nothing, not everything. Make this explicit in docs.
- **Hub toggle is not a kill switch for in-flight tasks.** It stops *new* dispatch. In-flight tasks continue until the node finishes or crashes.

## Source

- Evolver README, "Worker Pool" section. `WORKER_ENABLED` is read at heartbeat-assembly time; the hub-side toggle is a [evomap.ai](https://evomap.ai) dashboard feature.
