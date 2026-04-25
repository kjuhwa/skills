---
name: deterministic-agent-chain
description: Chain multiple agents sequentially in code, feeding each agent's output as the next agent's input.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, pipeline, deterministic, chaining, structured-output]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/deterministic.py
imported_at: 2026-04-18T00:00:00Z
---

# deterministic-agent-chain

Orchestrate a multi-step pipeline in code: each agent runs, produces output, and your code decides whether and how to invoke the next agent. More predictable than LLM-driven handoffs.

## When to apply

Linear workflows where each step is clearly defined (generate → validate → refine). Use structured output from intermediate agents to branch logic in code.

## Core snippet

```python
import asyncio
from pydantic import BaseModel
from agents import Agent, Runner, trace

story_outline_agent = Agent(
    name="story_outline_agent",
    instructions="Generate a very short story outline based on the user's input.",
)

class OutlineCheckerOutput(BaseModel):
    good_quality: bool
    is_scifi: bool

outline_checker_agent = Agent(
    name="outline_checker_agent",
    instructions="Read the given story outline, judge quality and determine if it is scifi.",
    output_type=OutlineCheckerOutput,
)

story_agent = Agent(
    name="story_agent",
    instructions="Write a short story based on the given outline.",
    output_type=str,
)

async def main():
    with trace("Deterministic story flow"):
        outline_result = await Runner.run(story_outline_agent, "Write a short sci-fi story.")
        checker_result = await Runner.run(outline_checker_agent, outline_result.final_output)
        checker_output = checker_result.final_output_as(OutlineCheckerOutput)

        if not checker_output.good_quality or not checker_output.is_scifi:
            print("Outline didn't pass quality check, stopping.")
            return

        story_result = await Runner.run(story_agent, outline_result.final_output)
        print(story_result.final_output)

asyncio.run(main())
```

## Key notes

- Use `result.final_output_as(Model)` to get a typed intermediate result for branching
- Each `Runner.run()` call is independent; pass outputs explicitly as strings or item lists
- Wrap in `trace()` to view all steps in the OpenAI Traces dashboard as one workflow
- More predictable cost/latency than fully autonomous multi-agent flows
