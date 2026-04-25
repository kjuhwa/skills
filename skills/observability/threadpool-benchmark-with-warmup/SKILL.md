---
name: threadpool-benchmark-with-warmup
description: Run a concurrent HTTP load test against an LLM server with a warmup phase, tqdm progress on completion, and per-prompt result aggregation — all using the stdlib ThreadPoolExecutor.
category: observability
version: 1.0.0
version_origin: extracted
tags: [benchmark, threadpool, http, tqdm, warmup, load-test]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/z-lab/dflash.git
source_ref: main
source_commit: 1fe684b00efba56490d920d15eeb9ba6e4471751
source_project: dflash
source_path: dflash/benchmark.py
imported_at: 2026-04-18T00:00:00Z
---

# Threadpool HTTP Benchmark with Warmup

## When to use
- You need to benchmark a local LLM server (sglang / vllm / any `/generate`-style HTTP endpoint) with tunable concurrency.
- You want a steady-state measurement — the warmup must compile/graph-cache kernels before the real run starts.
- You want per-request results (usage, accept length) aggregated, not just aggregate throughput.

## Pattern

```python
def _run_server(args):
    dataset = load_and_process_dataset(args.dataset)
    prompts = [...]   # chat-template applied if needed

    def send_one(prompt):
        return _send_vllm(args.base_url, prompt, ...) if args.backend == "vllm" \
          else _send_sglang(args.base_url, prompt, ...)

    # --- Warmup: run `concurrency` requests and throw away the results ---
    bs = max(args.concurrency, 1)
    if len(prompts) > bs:
        print(f"[warmup] {bs} requests ...")
        with ThreadPoolExecutor(max_workers=bs) as pool:
            list(pool.map(send_one, prompts[:bs]))
        prompts = prompts[bs:]

    # --- Measurement ---
    start = time.perf_counter()
    total_tokens = 0
    accept_lengths = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        futures = {pool.submit(send_one, p): i for i, p in enumerate(prompts)}
        for fut in tqdm(as_completed(futures), total=len(prompts), desc="Benchmarking"):
            out = fut.result()
            usage = out.get("usage", {}) or out.get("meta_info", {})
            total_tokens += int(usage.get("completion_tokens", 0))
            if "spec_accept_length" in usage:
                accept_lengths.append(float(usage["spec_accept_length"]))

    latency = time.perf_counter() - start
    print(f"Throughput:  {total_tokens / latency:,.2f} tok/s")
    if accept_lengths:
        print(f"Accept len:  {statistics.mean(accept_lengths):.3f}")
```

## Why this shape
- `ThreadPoolExecutor` + `as_completed` + `tqdm` gives a live progress bar that advances on completion, not submission — what you actually care about.
- The warmup run uses a *separate* `ThreadPoolExecutor`, sized to `concurrency`, because kernels often JIT on the first `bs` concurrent requests; you want `bs` warmup requests in flight together, not serially.
- `concurrency + num_prompts` prompts are drawn so warmup does not eat into the benchmarked sample.
- Response shape differs per backend — branch on `args.backend == "vllm"` once inside `send_one`, and extract tokens from `usage.completion_tokens` (vLLM) vs `meta_info.completion_tokens` (sglang).

## Gotchas
- For sglang, call `GET /flush_cache` before the warmup so radix-cache hits don't artificially accelerate the first runs:
  ```python
  try: requests.get(args.base_url + "/flush_cache", timeout=60).raise_for_status()
  except Exception: print("Warning: /flush_cache failed. Continuing.")
  ```
- `time.perf_counter()` (not `time.time()`) — monotonic and finer resolution.
- `max(args.concurrency, 1)` guards the edge case `--concurrency=0` from becoming a zero-worker pool.
- If your server is slow to start, push the warmup size above `concurrency` — the first batch often has dispatcher overhead unrelated to steady-state throughput.
