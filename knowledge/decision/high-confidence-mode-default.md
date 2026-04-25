---
version: 0.1.0-draft
name: high-confidence-mode-default
type: knowledge
category: decision
summary: PredictionMode.HIGH_CONFIDENCE is the default — favoring precision over recall.
confidence: high
tags: [magika, decision]
linked_skills: [per-content-type-confidence-threshold-dispatch]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# High Confidence Mode Default

## Fact

The default mode applies per-type thresholds conservatively, returning generic labels (txt, unknown) on borderline confidence. This reflects a security-first philosophy: better to say 'I'm not sure' than to misclassify. Callers can pick MEDIUM_CONFIDENCE or BEST_GUESS to trade precision for recall.

## Evidence

- `python/src/magika/magika.py:60`
- `website-ng/src/content/docs/cli-and-bindings/python.md:56-66`
