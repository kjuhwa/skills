---
name: raft-consensus-implementation-pitfall
description: Common correctness and visualization bugs when building interactive Raft simulations, including the stale-term commit trap and election timer reset mistakes.
category: pitfall
tags:
  - raft
  - auto-loop
---

# raft-consensus-implementation-pitfall

The most dangerous pitfall in Raft simulation is the stale-term commit bug. Raft's leader may only commit entries from its own current term by counting replicas — it must NOT commit entries from previous terms by replica count alone, even though those entries are present in the log. The Raft paper (Figure 8) demonstrates a scenario where a leader in term 2 replicates an entry to a majority, crashes, a new leader in term 3 overwrites that entry, and the system remains correct because the term-2 entry was never committed. If your simulation skips the term check in the commit rule, you will show entries as "committed" (green in the UI) that can later be rolled back, which breaks the fundamental safety guarantee and confuses users who think committed means permanent. Always gate commit advancement on `log[N].term === currentTerm`.

Election timer management has two subtle failure modes. First, the timer must reset on three distinct events: (a) granting a vote to a candidate, (b) receiving a valid AppendEntries from the current leader, and (c) starting an election as a candidate. Missing any one of these reset triggers causes pathological behavior — forgetting reset-on-vote-grant leads to multiple nodes timing out simultaneously and perpetual split votes; forgetting reset-on-AppendEntries causes followers to constantly challenge a healthy leader. Second, the election timeout must be randomized per node AND re-randomized on each reset (not just at initialization). Using a fixed per-node timeout creates deterministic collision patterns where the same two nodes always split the vote.

On the visualization side, the biggest pitfall is conflating "replicated" with "committed" in the UI. Users need to see three distinct states for each log entry: uncommitted (present only on the leader), replicated (present on followers but not yet majority-acknowledged), and committed (majority-replicated with correct term, safe to apply). Using only two colors (red/green) collapses replicated and uncommitted into one state, which makes it impossible to understand why a leader with entries on a majority still hasn't committed them (answer: because those entries are from a prior term). Use three colors — gray for local-only, amber for replicated-but-uncommitted, green for committed — and the Raft commit rule becomes visually self-evident.
