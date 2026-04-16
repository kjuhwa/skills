---
name: strangler-fig-implementation-pitfall
description: Common failure modes when implementing strangler-fig migrations that visualizations must surface
category: pitfall
tags:
  - strangler
  - auto-loop
---

# strangler-fig-implementation-pitfall

The most dangerous pitfall is treating "100% traffic on new service" as "migration complete" and deleting legacy code immediately. There is almost always a hidden consumer — a batch job, an internal admin tool, a cron, or a downstream service with cached endpoint URLs — that bypasses the facade. Retiring legacy too early causes silent data loss or 3am incidents. Enforce a mandatory soak period (typically 2–4 weeks at 100%) with legacy kept warm and logging any incoming calls, and surface "legacy still receiving N requests/day" as a blocking metric in any strangler-fig dashboard.

A second pitfall is the facade becoming permanent. Teams add the proxy, migrate 60-80% of capabilities, and then the remaining tail sits forever because the hard ones were deferred. The facade itself accrues logic (auth translation, request shaping, header munging) and becomes a third system to maintain. Visualizations should track "age of oldest unmigrated capability" and "lines of code in facade" as leading indicators of stalled migrations — if facade complexity grows faster than legacy shrinks, the pattern has degenerated into permanent API gateway.

A third pitfall is data-layer coupling: teams strangle the application tier but both services share the legacy database, making true independence impossible. A strangler-fig migration is not complete until the data store is also migrated, which is typically 3–10× harder than the code migration. Surface per-capability "data migration status" separately from "traffic migration status" — they are independent axes and collapsing them hides the real work remaining.
