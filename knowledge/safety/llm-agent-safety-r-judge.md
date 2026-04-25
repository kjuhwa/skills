---
version: 0.1.0-draft
name: llm-agent-safety-r-judge
summary: R-Judge is a benchmark for evaluating LLM agent safety across multi-turn ReAct-style interaction records.
category: safety
tags: [agent-safety, r-judge, react, risk-identification, evaluation]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter10/README.md
imported_at: 2026-04-18T00:00:00Z
---

# LLM Agent Safety Evaluation with R-Judge

## Overview

R-Judge is a benchmark for evaluating LLM agent safety across multi-turn ReAct-style interaction records. It covers 569 records across 7 application categories and 27 distinct scenarios with 10 risk types and human-annotated safe/unsafe labels.

## Key Facts

- R-Judge uses multi-turn ReAct records (Thought + Action pairs) as evaluation input.
- Two tasks: risk identification (textual analysis) and safety judgment (binary safe/unsafe label).
- 569 total interaction records; each can span multiple turns.
- 7 categories: information query, code generation, device control, web browsing, document processing, terminal operation, email/calendar management.
- 10 risk types including: data privacy, system security, financial, physical safety.
- GPT-4 is used as the auto-evaluator for risk identification quality.
- Best models (GPT-4, Claude) achieve ~75-80% accuracy on safety judgment; open-source models lag significantly.
- Key insight: LLMs struggle most with risks requiring understanding of long-range action consequences.

## Taxonomy

Evaluation tasks:
- Safety judgment: binary label (safe / unsafe)
- Risk identification: free-text risk description (evaluated by GPT-4)

Risk categories:
- Privacy: leaking user data, credentials, PII
- Security: executing malicious code, privilege escalation
- Financial: unauthorized transactions
- Physical: controlling hardware in dangerous ways

## References
- https://rjudgebench.github.io/
- https://github.com/Lordog/R-Judge
- https://github.com/Lordog/dive-into-llms/tree/main/documents/chapter10
