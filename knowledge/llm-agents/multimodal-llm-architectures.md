---
version: 0.1.0-draft
name: multimodal-llm-architectures
summary: Multimodal LLMs (MLLMs) integrate vision, audio, and text modalities.
category: llm-agents
tags: [mllm, multimodal, vision-language, architecture]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter8/README.md
imported_at: 2026-04-18T00:00:00Z
---

# Multimodal LLM Architectures

## Overview

Multimodal LLMs (MLLMs) integrate vision, audio, and text modalities. Two dominant architectural paradigms: LLM-as-Scheduler and Encoder-LLM-Decoder.

## Key Facts

- LLM-as-Scheduler: the LLM is the central controller that calls external modality-specific tools and integrates their outputs.
- Encoder-LLM-Decoder: unified model that jointly encodes all modalities via separate encoders and decodes via the LLM backbone. End-to-end trainable.
- Visual grounding (locating objects with bounding boxes) is a key MLLM capability distinct from pure VQA.
- GUI agents are an emerging MLLM application: model takes screenshot and outputs action (click, type, scroll).
- Qwen2-VL, InternVL, LLaVA, and CogVLM are common open-source MLLMs for research.
- MLLMs are evaluated on benchmarks like MMBench, MME, SEED-Bench, and ScienceQA.

## Taxonomy

By architecture:
- LLM-as-Scheduler: modular, each modality is a tool called by the LLM
- Encoder-LLM-Decoder: unified forward pass, joint training

By modality scope:
- Vision-Language: image/video + text (most common)
- Audio-Language: speech/audio + text
- Any-to-Any: all modalities

## References
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter8
