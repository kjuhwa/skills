---
version: 0.1.0-draft
name: llm-knowledge-editing-overview
summary: Knowledge editing modifies specific factual beliefs in a pretrained LLM without full retraining.
category: llm-fundamentals
tags: [knowledge-editing, rome, memit, easyedit, model-editing]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter3/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLM Knowledge Editing Overview

## Overview

Knowledge editing modifies specific factual beliefs in a pretrained LLM without full retraining. EasyEdit is an open-source framework supporting multiple editing algorithms (ROME, MEMIT, FT-W, etc.).

## Key Facts

- Four evaluation metrics: Reliability (edit succeeds), Generality (paraphrased prompts), Locality (unrelated facts preserved), Portability (compositional queries).
- ROME (Rank-One Model Editing): directly modifies FFN weights that store a fact. One fact per call.
- MEMIT: extends ROME to batch-edit multiple facts simultaneously.
- First ROME edit downloads Wikipedia corpus and precomputes per-layer statistics (./data/stats). Subsequent edits are fast.
- EasyEdit supports GPT-2-XL, LLaMA, GPT-J, GPT-NeoX, Baichuan, and more.
- hparams YAML files live in ./hparams/<ALG>/<model>.yaml.

## Taxonomy

Editing algorithms by mechanism:
- Locate-and-edit: ROME, MEMIT (modify specific FFN weights)
- Fine-tuning: FT-W (gradient descent on target tokens)
- Memory-augmented: SERAC, GRACE (external memory lookup)

Evaluation metrics:
- Reliability: does the edited model answer the edited fact correctly?
- Generality: do paraphrases of the edited question also get the right answer?
- Locality: are unrelated facts unchanged?
- Portability: do downstream compositional queries benefit from the edit?

## References
- https://github.com/zjunlp/EasyEdit
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter3
