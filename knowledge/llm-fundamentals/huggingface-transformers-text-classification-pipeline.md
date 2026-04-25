---
version: 0.1.0-draft
name: huggingface-transformers-text-classification-pipeline
summary: Pre-trained BERT-style models can be fine-tuned for text classification in two ways: a fully decoupled custom pipeline for learning purposes, or the integrated run_classification.py script from HuggingFace examples.
category: llm-fundamentals
tags: [huggingface, transformers, bert, classification, fine-tuning]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter1/README.md
imported_at: 2026-04-18T00:00:00Z
---

# HuggingFace Transformers Text Classification Pipeline

## Overview

Pre-trained BERT-style models can be fine-tuned for text classification in two ways: a fully decoupled custom pipeline for learning purposes, or the integrated run_classification.py script from HuggingFace examples.

## Key Facts

- The Tsinghua pip mirror installs CPU-only PyTorch silently; always follow with conda install pytorch for GPU builds.
- run_classification.py works with CSV, JSON, or dataset hub inputs.
- The evaluate package may time out downloading the accuracy metric on first run; fix by passing a local .py path as --metric_name.
- BERT-base-uncased (~110M params) is the standard starting point for English classification.
- HuggingFace Spaces (Gradio SDK) allows zero-server deployment of fine-tuned models via a free tier.

## Taxonomy

Pipeline variants:
- Decoupled custom: tokenizer + model + trainer written from scratch (best for learning)
- Integrated: run_classification.py handles shuffle, eval, predict, logging

Deployment options:
- Local inference via pipeline() API
- HuggingFace Spaces (Gradio) for shareable web demo

## References
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter1
- https://huggingface.co/spaces/cooelf/text-classification
