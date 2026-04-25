---
version: 0.1.0-draft
name: llm-jailbreak-attacks-easyjailbreak
summary: EasyJailbreak is a unified framework for evaluating LLM safety via automated jailbreak attacks.
category: security
tags: [jailbreak, easyjailbreak, pair, ica, gcg, red-team]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter6/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLM Jailbreak Attacks with EasyJailbreak

## Overview

EasyJailbreak is a unified framework for evaluating LLM safety via automated jailbreak attacks. It supports multiple algorithms (PAIR, ICA, GCG, ReNeLLM) via a common Selector-Mutator-Constraint-Evaluator abstraction.

## Key Facts

- Architecture: Selector (pick seed), Mutator (modify prompt), Constraint (filter), Evaluator (judge success).
- PAIR: attack LLM iteratively refines jailbreak prompts based on target model feedback.
- ICA: in-context attack, prepends harmful examples in context.
- GCG: gradient-based adversarial suffix search (requires white-box access).
- AdvBench: 520 harmful instructions used as jailbreak benchmark.
- ASR (Attack Success Rate): primary evaluation metric.
- Supported models: Vicuna, LLaMA-2, GPT-3.5, GPT-4, Claude, Gemini.

## Taxonomy

Attack types by access level:
- Black-box: PAIR, ICA, ReNeLLM (only need API access)
- White-box: GCG (requires model gradients)

Attack types by mechanism:
- Prompt refinement: PAIR (LLM-driven iterative refinement)
- In-context: ICA (harmful context in prompt)
- Gradient search: GCG (adversarial suffix)

## References
- https://github.com/EasyJailbreak/EasyJailbreak
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter6
