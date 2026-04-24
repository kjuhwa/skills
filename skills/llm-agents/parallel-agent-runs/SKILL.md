---
name: parallel-agent-runs
description: Run multiple agent instances concurrently with asyncio.gather() and pick the best result.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, parallelization, asyncio, gather, best-of-n]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/parallelization.py
imported_at: 2026-04-18T00:00:00Z
---

# parallel-agent-runs

Run the same (or different) agents in parallel using `asyncio.gather()`. Wrap the whole workflow in `trace()` to see all runs in a single trace. Use a picker/judge agent to select the best output.

## When to apply

Best-of-N sampling, multi-language translation in one pass, or any task where independent subtasks can execute concurrently to reduce wall-clock time.

## Core snippet

```python
import asyncio
from agents import Agent, ItemHelpers, Runner, trace

spanish_agent = Agent(name="spanish_agent", instructions="You translate the user's message to Spanish")
translation_picker = Agent(name="translation_picker", instructions="You pick the best Spanish translation.")

async def main():
    msg = "Good morning!"
    with trace("Parallel translation"):
        res_1, res_2, res_3 = await asyncio.gather(
            Runner.run(spanish_agent, msg),
            Runner.run(spanish_agent, msg),
            Runner.run(spanish_agent, msg),
        )
        outputs = [
            ItemHelpers.text_message_outputs(res_1.new_items),
            ItemHelpers.text_message_outputs(res_2.new_items),
            ItemHelpers.text_message_outputs(res_3.new_items),
        ]
        combined = "\n\n".join(f"Translation {i+1}: {o}" for i, o in enumerate(outputs))
        best = await Runner.run(translation_picker, combined)
        print(best.final_output)

asyncio.run(main())
```

## Key notes

- Each `Runner.run()` is independent; they share no state unless you explicitly pass a shared context
- Wrap in `trace()` to group all parallel runs under one workflow trace
- `ItemHelpers.text_message_outputs(result.new_items)` extracts the text from new output items
- Useful for latency reduction when subtasks are independent (e.g., fan-out then fan-in)
