---
name: api-versioning-data-simulation
description: Seed data shape for simulating multi-version API traffic, schema drift, and lifecycle states without a real backend
category: workflow
triggers:
  - api versioning data simulation
tags:
  - auto-loop
version: 1.0.0
---

# api-versioning-data-simulation

To simulate api-versioning convincingly in a static app, model three seed structures. First, a **version catalog** as an array of `{v, date, status, changes[]}` where each change carries a `type` of `add | deprecate | breaking` — these three types are sufficient and map cleanly to release-note bullets. Second, a **schema registry** keyed by endpoint (e.g. `"GET /users/:id"`) with sub-keys per version holding example payloads that intentionally differ in rename patterns (`user_id`→`userId`), envelope reshape (`{orders,count}`→`{data,cursor}`), and type migration (dollars `42.0`→cents `4200`). Third, a **weighted traffic mix** `[{v,status,color,weight}]` where weights sum to ~100 and reflect realistic adoption (sunset=5, deprecated=25, stable=55, beta=15).

For live traffic, use weighted random selection via `pickVersion()` (running `r -= weight` accumulator) rather than uniform sampling — uniform distribution looks wrong because real traffic is dominated by the current stable. Tick every 800–1000ms, generate 8–28 requests per tick, maintain a **rolling 60-sample history array** per version (`push`+`shift`) for the chart, and keep running `totals[]` + `grandTotal` for the percentage cards. Log only ~30% of requests to the visible feed so the DOM doesn't thrash, and cap the log at 40 rows with `while(log.children.length>40) log.lastChild.remove()`.

Tie the status enum to side effects: sunset versions should emit HTTP 410 at ~40% rate, all others fall through to the normal 92/8 split between 200 and 500. This makes lifecycle state *observable in behavior*, not just color, which is the whole point of building a versioning simulator.
