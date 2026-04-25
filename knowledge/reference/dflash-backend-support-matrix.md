---
version: 0.1.0-draft
name: dflash-backend-support-matrix
summary: Quick-reference table of which inference backends support DFlash, their install commands, required flags, and model coverage — distilled from the DFlash README.
category: reference
tags: [dflash, vllm, sglang, transformers, mlx, speculative-decoding, reference]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: README.md
imported_at: 2026-04-18T00:00:00Z
---

# DFlash backend support matrix

## Install and launch (condensed from upstream README)

| Backend | Install | Launch / use | Model scope |
|---|---|---|---|
| **vLLM** (nightly) | `uv pip install -e ".[vllm]"` then `uv pip install -U vllm --torch-backend=auto --extra-index-url https://wheels.vllm.ai/nightly` | `vllm serve <target> --speculative-config '{"method":"dflash","model":"<draft>","num_speculative_tokens":15}' --attention-backend flash_attn` | All listed DFlash drafts |
| **SGLang** | `uv pip install -e ".[sglang]"` | `python -m sglang.launch_server --speculative-algorithm DFLASH --speculative-draft-model-path <draft> --attention-backend trtllm_mha --speculative-draft-attention-backend fa4` | All listed DFlash drafts |
| **Transformers** | `uv pip install -e ".[transformers]"` (pins `transformers==4.57.1`) | `draft.spec_generate(input_ids, max_new_tokens, target=target, stop_token_ids, temperature)` | **Qwen3 and Llama-3.1-8B-Instruct only** |
| **MLX** | `pip install -e ".[mlx]"` | `stream_generate(model, draft, tokenizer, prompt, block_size=16, max_tokens, temperature)` — optional `sliding_window_size` on draft | Qwen3 / Qwen3.5 family on Apple Silicon |

## Models with published DFlash drafts
- Qwen3.6-35B-A3B (preview), Kimi-K2.5, Qwen3.5-4B/9B/27B/35B-A3B, Qwen3-Coder-Next / 30B-A3B
- gpt-oss-20b, gpt-oss-120b
- Qwen3-4B/8B non-thinking variants (b16)
- Llama-3.1-8B-Instruct (UltraChat variant)
- *Coming*: Qwen3.5-122B-A10B, Qwen3.5-397B-A17B, GLM-5.1

## Flags worth remembering
- `--enable-thinking` is *incompatible* with Qwen3-4B / Qwen3-8B DFlash drafts — they were not trained with thinking traces.
- SGLang schedule-overlap v2 is experimental: `SGLANG_ENABLE_SPEC_V2=1`, `SGLANG_ENABLE_DFLASH_SPEC_V2=1`, `SGLANG_ENABLE_OVERLAP_PLAN_STREAM=1` — set only if you want to ride the bleeding edge.
- MLX `sliding_window_size` on the *draft* bounds KV growth for ultra-long-context use; leave `None` for default unbounded behaviour.

## Datasets used by `python -m dflash.benchmark`
gsm8k, math500, humaneval, mbpp, mt-bench. They are auto-downloaded as JSONL into `cache/` on first run.
