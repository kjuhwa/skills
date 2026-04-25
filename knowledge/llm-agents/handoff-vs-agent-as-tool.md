---
version: 0.1.0-draft
name: handoff-vs-agent-as-tool
summary: Decision guide for choosing between handoffs (agent takes over) and agents-as-tools (orchestrator retains control).
category: llm-agents
confidence: high
tags: [openai-agents, handoffs, agents-as-tools, orchestration, design-decision]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: docs/multi_agent.md, docs/tools.md, docs/handoffs.md
imported_at: 2026-04-18T00:00:00Z
---

# Handoffs vs. Agents as Tools

The SDK provides two ways for one agent to invoke another. Choosing between them is a common design decision.

## Handoffs

**Mechanism**: A triage agent lists specialist agents in `handoffs=[...]`. When triggered, the model calls `transfer_to_<agent_name>`. The specialist becomes the **active agent** and owns the rest of the run — the triage agent's role ends.

**Best when**:
- The specialist should respond directly to the user (no narration from the triage agent)
- You want focused prompts: each specialist only sees relevant context
- The handoff itself represents a state transition (language switch, department change)
- You want the specialist's instructions/persona to fully own the response

**API**: `Agent.handoffs=[specialist]` or `handoff(specialist, input_filter=..., on_handoff=..., input_type=...)`

## Agents as Tools

**Mechanism**: The orchestrator calls `specialist.as_tool(tool_name, tool_description)`. The specialist runs in a nested loop, its output is returned as a tool result string. The orchestrator then composes the final reply.

**Best when**:
- The orchestrator should aggregate or synthesize outputs from multiple specialists
- You want one agent to own the final user-facing response
- Specialist subtasks are bounded (translate this text, summarize this section)
- Shared guardrails should apply at the orchestrator level

**API**: `Agent.tools=[specialist.as_tool("translate_to_spanish", "Translate to Spanish")]`

## Comparison

| Aspect | Handoff | Agent as Tool |
|---|---|---|
| Final response author | Specialist | Orchestrator |
| Control after delegation | Transferred | Retained by orchestrator |
| History passed | Configurable via `input_filter` | Tool input string |
| Multiple specialists per turn | One handoff per turn | Multiple tool calls per turn |
| Guardrail scope | Per-agent | Orchestrator's guardrails |

## Combining Both

A triage agent can hand off to an orchestrator, which then calls specialists as tools. This is valid and common for complex pipelines.

## Source paths
- `docs/multi_agent.md` — orchestration decision guide
- `docs/handoffs.md` — handoff configuration
- `docs/tools.md` — agents-as-tools section
- `src/agents/handoffs/` — handoff implementation
