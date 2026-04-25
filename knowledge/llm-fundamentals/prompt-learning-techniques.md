---
version: 0.1.0-draft
name: prompt-learning-techniques
summary: Prompt learning uses carefully designed input text to guide LLM behavior without updating model weights.
category: llm-fundamentals
tags: [prompting, zero-shot, few-shot, chain-of-thought, self-consistency]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter2/README.md
imported_at: 2026-04-18T00:00:00Z
---

# Prompt Learning Techniques for LLMs

## Overview

Prompt learning uses carefully designed input text to guide LLM behavior without updating model weights. Key variants: zero-shot, few-shot, chain-of-thought (CoT), Self-Consistency, and Program-of-Thought (PoT).

## Key Facts

- Zero-shot prompting: provide only the task instruction, no examples.
- Few-shot prompting: prepend 2-5 labeled examples before the target question.
- Zero-shot CoT: append "Let's think step by step." to trigger reasoning.
- Few-shot CoT: prepend fully worked reasoning examples.
- Self-Consistency: sample k>1 responses at temperature > 0, take majority vote answer.
- Program-of-Thought (PoT): instruct the model to output Python code for computation.
- Emotional prompts have been empirically observed to shift some model outputs but are not reliable.
- DashScope (Qwen) is the recommended API for China; OpenAI requires VPN.

## Taxonomy

Prompt types by information provided:
- Zero-shot: instruction only
- Few-shot: instruction + labeled examples
- CoT: instruction + reasoning steps (zero-shot trigger or few-shot exemplars)
- PoT: instruction + code generation

Prompt types by decoding strategy:
- Greedy (deterministic)
- Temperature sampling
- Self-Consistency (multi-sample majority vote)

## References
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter2
