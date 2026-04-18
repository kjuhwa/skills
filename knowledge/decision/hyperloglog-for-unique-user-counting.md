---
version: 0.1.0-draft
name: hyperloglog-for-unique-user-counting
summary: Scouter uses HyperLogLog (Clearspring stream-lib) to estimate recent and daily unique user counts with ~100 bytes of memory and ~2% error, avoiding O(n) hash sets
category: decision
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/kjuhwa/scouter
source_ref: master
source_commit: 126bb19f07d1fe4fe915eb408c381e2c140cc94c
source_project: scouter
tags: [hyperloglog, cardinality, decision, scouter]
---

## Fact

Tracking unique users across a 5-minute window or a 24-hour period with a naive `Set<UserId>` would balloon memory to gigabytes for high-traffic sites. Scouter uses HyperLogLog sketches (from Clearspring stream-lib) that compress the cardinality estimate to ~100 bytes per time bucket at ~2% standard error. Two canonical metrics expose this: "recent users" (rolling 5-minute window, refreshed per tick) and "daily unique visitors" (24h bucket). HLL sketches are mergeable, so multi-node aggregation is trivial.

## Evidence

- `scouter.document/main/SCOUTER-includes.md`
- `scouter.document/tech/Counting-Visit-Users.md`
- `scouter.document/tech/Why-Recent-User.md`

## How to apply

Whenever a metric is "unique X" (users, IPs, sessions, devices) at scale, default to HyperLogLog (or more modern variants like HLL++, Theta Sketch). Do not try to keep exact counts — memory grows with cardinality, and nobody needs 6-decimal-place accuracy for a "recent unique users" card on a dashboard. 2% error vs. gigabytes of RAM is the right trade.
