---
version: 0.1.0-draft
name: rca-validity-score-design
summary: OpenSRE assigns a validity_score in [0..1] to each diagnosis by weighting claims — 1.0 for validated-with-real-sources, 0.8 for validated-with-generic-sources, 0.5 for failed-validation, 0.0 for non-validated — plus a 0.1 bonus if any claim has non-generic sources. Drives loop-vs-publish decisions.
category: observability
tags: [scoring, confidence, llm-validation, rca]
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/nodes/root_cause_diagnosis/claim_validator.py
imported_at: 2026-04-18T00:00:00Z
confidence: medium
---

# RCA Validity Score — Design Notes

## What the score represents
A single number in [0.0, 1.0] that measures "how much evidence actually supports this root cause". Higher is better. Used by:
- The final report (rendered as a confidence badge).
- Optional gates (don't auto-remediate unless score ≥ 0.7).
- The loop router (low score + recommendations → one more loop).

## Weights
| Claim status | Weight |
|---|---|
| validated AND has real evidence sources | 1.0 |
| validated with only `evidence_analysis` (generic) | 0.8 |
| claim LLM marked validated but our check rejected | 0.5 |
| non-validated | 0.0 |

All summed, divided by total claims. Plus 0.1 bonus if any validated claim has non-generic sources (rewards grounded reasoning).

## Why differentiate 1.0 vs 0.8
- A model that just parrots back evidence like `"logs showed errors"` with source `["evidence_analysis"]` still gets 0.8 — it's arguable the statement is true.
- But a claim like `"OOMKilled on pod foo because memory usage hit 1.8GB"` with source `["datadog_logs", "host_metrics"]` is concretely grounded, and deserves the full 1.0.

## Why 0.5 for failed validation
The LLM asserted the claim was validated. Our deterministic rule-table check disagreed. The claim *might* be true but we can't prove it. 0.5 reflects uncertainty without rewarding unverified LLM output.

## The 0.1 bonus
Rewards reports that include at least one concrete evidence-sourced claim. Prevents the score from maxing at 0.8 when everything is generic.

## Caveats
- Score is sensitive to the claim count — one validated claim + zero non-validated = 1.0; one validated + nine non-validated = 0.1.
- LLMs that over-produce claims get penalized.
- This is a heuristic, not a probability. Treat thresholds as tunable constants.

## When to rethink the weighting
- If you add new evidence sources, update the keyword→source table in `extract_evidence_sources`.
- If the model keeps claiming `"evidence_analysis"` even when there's real data, either tighten the prompt or raise the weight gap (1.0 vs 0.7 maybe).
