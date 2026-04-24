---
name: llm-as-judge-loop
description: Run an agent in a loop with an evaluator agent that provides feedback until the output meets a quality threshold.
category: llm-agents
version: 1.0.0
version_origin: extracted
confidence: high
tags: [openai-agents, llm-as-judge, eval-loop, quality-control, feedback]
source_type: extracted-from-git
source_url: https://github.com/openai/openai-agents-python.git
source_ref: main
source_commit: e80d2d2319eb300ac17ec496988b70246a5042d6
source_project: openai-agents-python
source_path: examples/agent_patterns/llm_as_a_judge.py
imported_at: 2026-04-18T00:00:00Z
---

# llm-as-judge-loop

Alternate between a generator agent and an evaluator agent in a while loop. The evaluator provides structured feedback (pass/fail/needs_improvement); loop continues until the score is "pass" or a max round limit is hit.

## When to apply

Creative generation, code writing, or any task where quality is subjective and iterative refinement is valuable. Replaces manual review with automated LLM quality gates.

## Core snippet

```python
import asyncio
from dataclasses import dataclass
from typing import Literal
from agents import Agent, ItemHelpers, Runner, TResponseInputItem, trace

story_outline_generator = Agent(
    name="story_outline_generator",
    instructions="Generate a short story outline. Use feedback to improve if provided.",
)

@dataclass
class EvaluationFeedback:
    feedback: str
    score: Literal["pass", "needs_improvement", "fail"]

evaluator = Agent[None](
    name="evaluator",
    instructions="Evaluate the story outline. Provide feedback until it reaches a pass score.",
    output_type=EvaluationFeedback,
)

async def main():
    input_items: list[TResponseInputItem] = [{"content": "A detective story in space.", "role": "user"}]
    latest_outline: str | None = None

    with trace("LLM as a judge"):
        while True:
            outline_result = await Runner.run(story_outline_generator, input_items)
            latest_outline = ItemHelpers.text_message_outputs(outline_result.new_items)
            
            eval_result = await Runner.run(evaluator, latest_outline)
            evaluation = eval_result.final_output_as(EvaluationFeedback)
            
            if evaluation.score == "pass":
                break
            
            # Feed feedback back into generator input
            input_items = outline_result.to_input_list() + [
                {"content": f"Feedback: {evaluation.feedback}", "role": "user"}
            ]

    print(latest_outline)

asyncio.run(main())
```

## Key notes

- Cap loop iterations (`max_rounds`) to avoid infinite loops
- Use `result.to_input_list()` to carry full conversation history into the next generator call
- The evaluator uses structured output for type-safe pass/fail branching
- Wrap in `trace()` to see all rounds in the OpenAI Traces dashboard
