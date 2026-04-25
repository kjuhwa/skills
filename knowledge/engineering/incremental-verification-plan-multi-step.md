---
version: 0.1.0-draft
name: incremental-verification-plan-multi-step
summary: Break a multi-step feature (e.g., rate limiting) into ordered steps where each has an independent, machine-checkable verification and is deployable on its own. Avoids 300-line "all at once" commits.
category: engineering
tags: [planning, incremental-delivery, verification, deployability]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#goal-driven-example-2
imported_at: 2026-04-18T08:26:22Z
---

# Pattern — Incremental verification plan

## Template
```
1. [Step]         → verify: [machine-checkable check]
2. [Step]         → verify: [check]
3. [Step]         → verify: [check]
```

Each step:
- Independently verifiable (has its own test or bench).
- Independently deployable (can ship without later steps).
- Small enough that a failure is easy to isolate.

## Example — "Add rate limiting to the API"
1. In-memory rate limit on one endpoint → *verify:* test 11 requests; #11 returns 429.
2. Extract to middleware applied to all endpoints → *verify:* rate limits apply to `/users` and `/posts`; existing endpoint tests still pass.
3. Swap to Redis backend → *verify:* counter persists across restart; two app instances share the same counter.
4. Make rates configurable per endpoint → *verify:* `/search` allows 10/min, `/users` allows 100/min; config file parsed correctly.

## Anti-pattern this replaces
One 300-line commit implementing the full system with Redis + multi-strategy + config + monitoring in a single drop. If anything breaks, you bisect four intertwined concerns.

## Value
Lets the developer (human or LLM) run the loop to green for each step, commit, and move on. No guessing which of four subsystems regressed.
