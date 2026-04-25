---
version: 0.1.0-draft
name: gui-agent-os-kairos
summary: OS-Kairos is a GUI agent framework that extends standard action prediction with a confidence scoring mechanism (1-5).
category: llm-agents
tags: [gui-agent, os-kairos, qwen2-vl, human-in-the-loop, confidence-scoring]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter9/README.md
imported_at: 2026-04-18T00:00:00Z
---

# GUI Agent with OS-Kairos and Adaptive Human-AI Interaction

## Overview

OS-Kairos is a GUI agent framework that extends standard action prediction with a confidence scoring mechanism (1-5). When agent confidence is low it signals the task is beyond its capability and human intervention is needed.

## Key Facts

- OS-Kairos dataset: multi-step GUI interaction records with task, screenshot, previous actions, current step, and confidence score (1-5).
- osatlas_action: action predicted by OS-Atlas (teacher model).
- teacher_action: human-verified correct action.
- score (1-5): 5 = certain; 1 = definitely cannot achieve goal; low score triggers human-in-the-loop.
- Qwen2-VL-7B-Instruct is used as the base model for SFT.
- Training via LLaMA-Factory with ShareGPT format data.
- Model output format: action: CLICK <point>[[x,y]]</point> followed by score: N.
- Supported actions: CLICK, TYPE, SCROLL, PRESS_BACK, PRESS_HOME, ENTER, IMPOSSIBLE.
- Minimum hardware: 3x A100-80GB for training.

## Taxonomy

Action types:
- Basic: CLICK [[x,y]], TYPE [text], SCROLL [direction]
- Custom: PRESS_BACK, PRESS_HOME, ENTER, IMPOSSIBLE

Confidence score interpretation:
- 5: agent will definitely achieve goal
- 4: very likely
- 3: uncertain
- 2: very unlikely
- 1: definitely cannot achieve goal -> trigger human intervention

## References
- https://github.com/Wuzheng02/OS-Kairos
- https://arxiv.org/abs/2503.16465
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter9
