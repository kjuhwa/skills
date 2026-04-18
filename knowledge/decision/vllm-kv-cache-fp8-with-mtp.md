---
version: 0.1.0-draft
tags: [decision, vllm, cache, fp8, with, mtp]
name: vllm-kv-cache-fp8-with-mtp
description: vLLM serving chose fp8_e4m3 KV cache + prefix caching + MTP speculative decoding for Qwen3.5 throughput
category: decision
source:
  kind: project
  ref: lucida-for-docker@2bf2a33
confidence: medium
---

# vLLM serving flags: fp8 KV cache + prefix caching + MTP speculative decoding

## Decision
For self-hosted vLLM serving Qwen3.5-class MoE models on a single GPU host, enable all three of:

1. `--kv-cache-dtype fp8_e4m3` — halves KV cache memory vs fp16, freeing room for larger batches.
2. `--enable-prefix-caching` — near-free win for chat/RAG where system prompts repeat.
3. `--speculative-config '{"method":"mtp","num_speculative_tokens":3}'` — Multi-Token Prediction speculative decoding; requires a model trained with MTP heads (Qwen3.5 has them).

Also set `--compilation-config '{"max_cudagraph_capture_size": 256}'` and `ipc: host`, `shm_size: 32g` for multi-GPU tensor parallel.

## Why
- KV fp8 and prefix caching each give measurable throughput wins and are nearly free to turn on for modern models.
- MTP speculative decoding specifically exploits Qwen3.5's native MTP heads — not applicable to models lacking them.
- Combined on a shared GPU box, these let one LLM + one embedding server coexist within the same VRAM budget.

## Evidence
- Commit `2bf2a33`: `vLLM v0.19.0 업그레이드 + KV cache fp8/prefix caching 적용, chat-ai sandbox 태그 전환`.
- Commit `b06cde7`: `feat: apply MTP(Multi Token Prediction) to vLLM`.
- `polestar/platform/dc-platform-vllm.yml` `vllm-llm.command` shows the full flag set in production use.

## How to apply
When rolling out a new vLLM backend, verify the target model documents fp8 KV support and MTP heads before enabling speculative. Fall back to no speculation + fp16 KV for unknown-provenance models.

## Counter / Caveats
- fp8 KV cache quality impact depends on model training — evaluate on your task before blindly enabling in prod.
- MTP requires a compatible model; applying it to a non-MTP model degrades quality with no throughput win.
