---

name: command-query-data-simulation
description: Generate realistic command/query/event streams with controllable lag and conflict patterns for CQRS demos
category: workflow
triggers:
  - command query data simulation
tags: [workflow, command, query, data, simulation, cqrs]
version: 1.0.0
---

# command-query-data-simulation

Seed the simulation with a small domain (e.g., orders, inventory, user profiles) and define a command catalog (CreateOrder, CancelOrder, AdjustStock) alongside a query catalog (GetOrderById, ListOpenOrders, GetInventoryLevel). Generate command streams via a weighted random picker — 70% reads, 30% writes mirrors real traffic — and ensure every command deterministically produces one or more domain events with a stable event ID, aggregate ID, and version number. Maintain two in-memory stores: an append-only event log for the write side and a mutable view map for the read side, populated by synchronous or delayed projectors.

Expose tunable knobs the user can drive live: projection-lag-ms (delay between event append and read-model update), command-failure-rate (simulates validation rejects), and conflict-rate (forces concurrent commands on the same aggregate to trigger version conflicts). Replay determinism matters — persist the seeded RNG state and the full command log so a session can be exported, shared, and re-run to produce identical event sequences. This lets the three simulators cross-validate that their flow models agree.

For query simulation, cache read-model snapshots keyed by (queryName, args, asOfEventVersion) so the UI can show "this query was served from version N, current version is N+k → staleness = k events". Emitting this staleness metric on every query response is what turns the simulator from a toy into a teaching tool about eventual consistency windows.
