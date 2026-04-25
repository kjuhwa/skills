---
version: 0.1.0-draft
name: multi-agent-orchestration-patterns
summary: Taxonomy of orchestration patterns in the OpenAI Agents SDK — LLM-driven vs. code-driven, with tradeoffs.
category: llm-agents
confidence: high
tags: [openai-agents, orchestration, patterns, multi-agent, design]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/multi_agent.md, examples/agent_patterns/
imported_at: 2026-04-18T00:00:00Z
---

# Multi-Agent Orchestration Patterns

## Two Fundamental Approaches

### 1. LLM-Driven Orchestration
The model decides what happens next: which tools to call, which agents to hand off to, when to stop.
- More flexible for open-ended tasks
- Less predictable cost/latency
- Requires good prompts describing available tools and handoff targets

### 2. Code-Driven Orchestration
Your code determines flow: call agent A, inspect output, conditionally call agent B.
- More deterministic and auditable
- Easier cost/latency control
- Requires you to design the pipeline explicitly

You can mix both: code-driven pipeline with LLM-driven specialists.

## Pattern Catalog

### Routing (Triage → Specialist)
Triage agent receives first message, hands off to the correct specialist.
- File: `examples/agent_patterns/routing.py`
- Use: Language routing, department routing, intent classification → specialist

### Agents as Tools (Orchestrator + Specialists)
Orchestrator calls specialists as tools, retains control, composes final reply.
- File: `examples/agent_patterns/agents_as_tools.py`
- Use: Translation fan-out, multi-source research, parallel subtask aggregation

### Parallelization
Run multiple agent instances simultaneously, pick the best result.
- File: `examples/agent_patterns/parallelization.py`
- Use: Best-of-N sampling, independent subtasks, latency reduction

### Deterministic Pipeline (Code-Driven Chain)
Generate → Check → Conditionally proceed → Refine.
- File: `examples/agent_patterns/deterministic.py`
- Use: Multi-step generation with validation gates, ETL pipelines

### LLM as Judge (Feedback Loop)
Generator → Evaluator → Feedback → Generator (repeat until pass).
- File: `examples/agent_patterns/llm_as_a_judge.py`
- Use: Creative writing, code generation, quality-gated output

### Human in the Loop
Agent pauses for human approval before executing sensitive tools.
- File: `examples/agent_patterns/human_in_the_loop.py`
- Use: Email sending, file deletion, external API calls with side effects

### Streaming Guardrails
Run guardrails concurrently with streaming output, cancel if guardrail trips.
- File: `examples/agent_patterns/streaming_guardrails.py`
- Use: Real-time content moderation on streaming output

## Design Principles (from SDK docs)

1. Invest in good prompts; describe tools/handoffs clearly
2. Have specialized agents rather than one general-purpose agent
3. Monitor and iterate based on traces
4. Allow agents to self-critique in loops
5. Build evals to measure improvement over time

## Source paths
- `docs/multi_agent.md` — orchestration concepts
- `examples/agent_patterns/` — all runnable pattern examples
