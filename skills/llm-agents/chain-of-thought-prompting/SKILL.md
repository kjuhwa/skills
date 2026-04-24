---
name: chain-of-thought-prompting
description: Apply chain-of-thought prompting (zero-shot CoT, few-shot CoT, Self-Consistency) to improve LLM multi-step reasoning.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [chain-of-thought, prompting, reasoning]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/Lordog/dive-into-llms.git
source_ref: main
source_commit: f84c04268794ef94f8949808bbc14ab8636763a0
source_project: dive-into-llms
source_path: documents/chapter2/README.md
imported_at: 2026-04-18T00:00:00Z
---

# Chain-of-Thought Prompting

## When to use
- Multi-step reasoning: math word problems, logic puzzles, planning.
- Show intermediate steps before giving the final answer.
- Boost accuracy via Self-Consistency (sample multiple paths, majority vote).

## Steps

1. Zero-shot CoT - append the trigger phrase to the question:

```
Q: 10 friends playing, 7 quit, each remaining player has 8 lives. Total lives?
A: Let's think step by step.
```

2. Few-shot CoT - prepend fully worked examples:

```
Q: 15 trees, workers plant more, now 21. How many planted?
A: 15 originally, 21 after. 21-15=6. The answer is 6.

Q: 10 friends, 7 quit, each of remaining has 8 lives. Total lives?
A:
```

3. Self-Consistency - sample multiple times, pick majority answer:

```python
from collections import Counter
answers = []
for _ in range(5):
    resp = call_llm(prompt, temperature=0.7)
    answers.append(extract_final_answer(resp))
final = Counter(answers).most_common(1)[0][0]
```

4. Program-of-Thought (PoT) - instruct the model to return Python code that computes the answer.

## Pitfalls
- Wrong few-shot exemplar answers reduce accuracy while shifting answer format.
- Self-Consistency multiplies API cost by the number of samples.

## Source
- Chapter 2 of dive-into-llms - documents/chapter2/README.md
