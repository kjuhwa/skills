---
version: 0.1.0-draft
name: llm-silently-picks-one-interpretation
summary: When a verb has multiple valid readings ("make search faster" → latency vs throughput vs perceived speed), LLMs often pick one silently and implement 200 lines of the wrong optimization. Enumerate interpretations instead.
category: pitfall
tags: [ambiguity, performance, premature-optimization, clarification]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#think-before-coding-example-2
imported_at: 2026-04-18T08:26:22Z
---

# Pitfall — Silently picking one interpretation

## Symptom
Prompt: "Make the search faster."

LLM adds `@lru_cache`, async, connection pooling, DB indexes — 200 lines of mixed optimizations. None were validated against the actual bottleneck.

## Three readings of "faster"
1. **Lower response time** (500ms → 100ms). Fix: indexes, query caches.
2. **Higher throughput** (more concurrent searches). Fix: async, pooling.
3. **Better perceived speed** (UX). Fix: partial results, progressive loading.

## Better behavior
1. State current baseline ("search takes ~500ms for typical queries").
2. Enumerate the three readings with effort estimates.
3. Ask which aspect matters.
4. Implement only the chosen axis.

## Tell
If your diff mixes caching + async + UX streaming for a single "faster" request, you didn't disambiguate.
