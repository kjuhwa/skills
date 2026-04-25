---
version: 0.1.0-draft
name: llm-text-watermarking-kgw
summary: LLM text watermarking embeds an imperceptible signal into LLM-generated text detectable via z-score statistical testing.
category: security
tags: [watermark, kgw, x-sir, z-score, greenlist, redlist]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter5/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLM Text Watermarking with KGW Algorithm

## Overview

LLM text watermarking embeds an imperceptible signal into LLM-generated text detectable via z-score statistical testing. KGW splits the vocabulary into greenlist/redlist at each step using a hash of the previous token.

## Key Facts

- KGW partitions vocabulary at each step: ~50% greenlist, ~50% redlist (hash of previous token).
- During generation: greenlist token logits are boosted by delta parameter.
- Detection: count greenlist token fraction, compute z-score. Watermarked text has significantly higher greenlist fraction.
- Typical z-scores: watermarked ~12, human text ~1-2. AUC near 1.000 at sufficient text length.
- X-SIR extends KGW for cross-lingual scenarios (semantic-invariant re-weighting).
- Robustness experiments require OpenAI API access.

## Taxonomy

Watermark detection pipeline:
1. Generate watermarked text (gen.py --watermark_method kgw)
2. Compute z-scores on watermarked text (detect.py)
3. Compute z-scores on human text as baseline
4. Evaluate AUC / ROC (eval_detection.py)

Attack types:
- Paraphrase attack (via GPT-3.5)
- Translation attack
- Copy-paste (mix watermarked and non-watermarked spans)

## References
- https://github.com/zwhe99/X-SIR
- Kirchenbauer et al., "A Watermark for Large Language Models", ICML 2023
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter5
