---
name: confidence-lowering-by-source-factor
description: Lower external asset confidence by a configurable factor to reflect source reliability
category: integration
version: 1.0.0
version_origin: extracted
confidence: high
tags: [evolver, integration, trust, confidence]
source_type: extracted-from-git
source_url: https://github.com/EvoMap/evolver.git
source_ref: main
source_commit: 22773782475cecf43dc9c1af264bf5f9cacc28bc
source_project: evolver
source_paths:
  - src/gep/a2a.js
imported_at: 2026-04-18T00:00:00Z
---

# Source-factor confidence discount on ingest

When ingesting an external asset, multiply its claimed confidence by a source-specific factor (e.g., 0.6 for untrusted, 0.9 for trusted) before staging. Encodes the epistemic truth that external evidence is weaker than locally validated evidence, and exposes the factor as an env var for operators.

## Mechanism

```js
const factor = Number(process.env.A2A_EXTERNAL_CONFIDENCE_FACTOR ?? 0.6);
asset.confidence = clamp(asset.confidence * factor, 0, 1);
asset.confidence_origin = { source: 'external', factor };
```

Keep the original value in `confidence_raw` for auditability.

## When to reuse

Data-ingest pipelines that blend first-party and third-party signals, plugin registries, scoring systems that merge human and ML inputs.
