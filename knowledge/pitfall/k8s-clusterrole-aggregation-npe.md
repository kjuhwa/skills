---
name: k8s-clusterrole-aggregation-npe
version: 0.1.0-draft
tags: [pitfall, k8s, clusterrole, aggregation, npe]
category: pitfall
summary: ClusterRole `aggregationRule` and its `clusterRoleSelectors` are both nullable — iterate only after null-check
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: medium
---

# Kubernetes ClusterRole Aggregation NPE

## Fact
The Kubernetes `ClusterRole` object's `aggregationRule` field is null for most roles. When non-null, its `clusterRoleSelectors` may still be null or empty. Iterating without null-checking both levels throws NPE and silently skips the resource during collection.

## Why
Aggregated ClusterRoles are an opt-in RBAC feature; most cluster operators don't use them, so the field is null-by-default.

## How to apply
- `if (cr.getAggregationRule() != null && cr.getAggregationRule().getClusterRoleSelectors() != null)` before looping.
- Treat the silent-skip failure mode as a collector severity-2 bug: you lose visibility on an entire resource class with no error surfaced to ops.
