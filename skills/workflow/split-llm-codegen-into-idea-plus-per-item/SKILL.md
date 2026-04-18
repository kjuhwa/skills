---
version: 0.1.0-draft
name: split-llm-codegen-into-idea-plus-per-item
description: Split large LLM code generation into lightweight idea call + per-item full code calls to maximize output per artifact
category: workflow
tags:
  - llm
  - code-generation
  - output-limit
  - multi-call
triggers:
  - generate multiple apps
  - large code generation
  - output limit
---

# Split LLM Code Generation: Idea + Per-Item Calls

When generating multiple large code artifacts via LLM CLI, a single call requesting N items produces N small results. Splitting into (1 + N) calls — one lightweight idea call plus N individual code calls — gives each artifact the full response capacity.

## When to use

- Generating 3+ substantial code artifacts (apps, components, modules) in one workflow
- Each artifact needs 500+ lines
- Single-call approach produces undersized results

## Pattern

```
Call 1 (lightweight, 2min timeout):
  "Generate N ideas with names, descriptions, features"
  → Parse N idea blocks

Call 2..N+1 (heavy, 30min timeout each):
  "Build ONE complete app for idea[i] with full spec"
  → Each gets full response capacity
```

## Key decisions

- Idea call is cheap (short response) — use tight timeout (60-120s)
- Code calls are heavy — use generous timeout (15-30min)
- Pass idea metadata (name, features) into each code call for consistency
- Concatenate results after all calls complete

## Anti-patterns

- Requesting all artifacts in one call ("generate 3 complete 2000-line apps") — each gets ~1/3 capacity
- Not parsing idea output before code calls — fails silently if ideas malformed
- Equal timeouts for idea vs code calls — wastes time or causes premature timeout
