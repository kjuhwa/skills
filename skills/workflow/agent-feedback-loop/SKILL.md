---
name: agent-feedback-loop
description: Run an agent repeatedly in a while loop with user or evaluator feedback until a quality threshold is met.
category: workflow
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, feedback-loop, iteration, quality-control, while-loop]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/llm_as_a_judge.py
imported_at: 2026-04-18T00:00:00Z
---

# agent-feedback-loop

Implement an evaluation loop where a generator agent produces output and an evaluator agent scores it. The loop continues until the score passes or a max iteration limit is reached.

## When to apply

Any quality-gated generation task: creative writing, code review, report drafting. Automates what would otherwise be manual review-and-revise cycles.

## Core snippet

```python
import asyncio
from dataclasses import dataclass
from typing import Literal
from agents import Agent, ItemHelpers, Runner, TResponseInputItem, trace

generator = Agent(
    name="generator",
    instructions="Generate output. Improve based on feedback if provided.",
)

@dataclass
class EvalResult:
    feedback: str
    score: Literal["pass", "needs_improvement", "fail"]

evaluator = Agent[None](
    name="evaluator",
    instructions="Evaluate the output. Provide feedback. Give 'pass' only when quality is good.",
    output_type=EvalResult,
)

async def run_with_feedback(user_prompt: str, max_rounds: int = 5) -> str:
    input_items: list[TResponseInputItem] = [{"content": user_prompt, "role": "user"}]
    latest: str | None = None

    with trace("Feedback loop"):
        for round_num in range(max_rounds):
            gen_result = await Runner.run(generator, input_items)
            latest = ItemHelpers.text_message_outputs(gen_result.new_items)

            eval_result = await Runner.run(evaluator, latest)
            evaluation = eval_result.final_output_as(EvalResult)

            if evaluation.score == "pass":
                break

            # Feed feedback back into next generation
            input_items = gen_result.to_input_list() + [
                {"content": f"Feedback: {evaluation.feedback}", "role": "user"}
            ]

    return latest or ""

asyncio.run(run_with_feedback("Write a haiku about AI"))
```

## Key notes

- Cap `max_rounds` to avoid infinite loops and unbounded costs
- `result.to_input_list()` carries full conversation history for the next generator call
- Use structured output from evaluator for type-safe pass/fail branching
- Wrap in `trace()` to see all rounds in a single trace
