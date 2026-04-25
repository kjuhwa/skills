---
version: 0.1.0-draft
name: masking-vs-guardrails-two-layer-defense
summary: OpenSRE protects LLM payloads with two independent layers — masking (reversible placeholders for infrastructure identifiers) and guardrails (regex/keyword rules with redact/block/audit actions). They serve different purposes and compose.
category: safety
tags: [masking, guardrails, llm-safety, layered-defense]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/masking/context.py
imported_at: 2026-04-18T00:00:00Z
confidence: high
---

# Masking vs Guardrails — Two Layers

## Masking
- Goal: hide infrastructure identifiers (pod names, namespaces, IPs, account IDs, emails) from the LLM but **restore them in output**.
- Reversible: every replacement gets a stable placeholder per investigation (`<NS_0> -> "kube-prod"`) and the map is stashed in `state["masking_map"]`.
- Per-investigation policy from env vars (`OPENSRE_MASK_ENABLED`, `OPENSRE_MASK_KINDS`, `OPENSRE_MASK_EXTRA_REGEX`).
- Built-in detectors are anchored (`namespace=foo`, `kube_cluster:bar`) so generic words don't get masked.
- Default: disabled. Users opt in.

## Guardrails
- Goal: prevent secrets and forbidden content from reaching the LLM at all, audit when they do.
- Three actions per rule: REDACT (replace in place), BLOCK (raise `GuardrailBlockedError`), AUDIT (log only).
- YAML config at `~/.opensre/guardrails.yml` — user owns the rule set.
- Audit log appends to `~/.opensre/guardrail_audit.jsonl` for compliance.
- Default: empty rule set (no rules loaded → engine inactive).

## Why both
| | Masking | Guardrails |
|---|---|---|
| Reversibility | Yes — output restored | No — redaction is permanent |
| Hardcoded detectors | Yes (8 kinds) | No — user defines all rules |
| Failure mode | Leaks the identifier | Blocks the call or leaks |
| Audit trail | Just the placeholder map | JSONL per match |
| Use case | Privacy / multi-tenant | Compliance / kill switches |

## Composition
Both run on every LLM call. Order in the LLM client:
1. Apply guardrails to system + messages (may raise BLOCK).
2. Send to provider.
3. Receive response.
4. Caller (node) unmasks identifiers in the response before storing to state.

Guardrails run on the **already-masked** content, so a regex `r"prod-cluster"` won't match if masking has already replaced it with `<CLUSTER_0>`. Order your rules accordingly.
