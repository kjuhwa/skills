---
name: merkle-tree-range-leaf-vs-point-leaf-tradeoff
description: Whether Merkle leaves should hash individual keys or key ranges determines whether divergence localization scales with dataset size or with divergence size.
category: decision
tags:
  - rolling
  - auto-loop
---

# merkle-tree-range-leaf-vs-point-leaf-tradeoff

Two common Merkle-over-KV designs: point-leaves (one leaf per key) give exact diff localization but the tree has N leaves and gossip cost grows with dataset size even when nothing changed — every round rebuilds or walks N hashes. Range-leaves (leaf = hash over all keys in a key range, e.g. hash-prefix bucket) keep the tree bounded (e.g. 2^16 leaves regardless of N) so steady-state gossip is cheap, but when a range differs you must transfer the whole range's key list to find which keys actually diverged.

Rule of thumb: range-leaves win when divergence is small relative to dataset (typical anti-entropy, where replicas are ~99% aligned) and the range enumeration cost is bounded by a range index. Point-leaves win when you expect dense divergence (catch-up after long partition) or when your storage engine can't efficiently enumerate a range. Cassandra picked range-leaves (token ranges); Dynamo-style systems often do hybrid — range at top, point at the bottom two levels.

The non-obvious trap: if you pick range-leaves, your range boundaries MUST be deterministic across replicas (hash-prefix buckets, not "first 1000 keys in local sort order"). Otherwise two replicas with identical contents produce different leaf hashes because they bucketed differently, and anti-entropy never converges.
