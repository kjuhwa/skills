---
name: ort-crate-onnx-runtime-session-configuration
description: Configure ONNX Runtime via the ort crate's session builder: inter/intra threads, optimization level, parallel execution, embedded model bytes.
category: inference
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [magika, inference]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Ort Crate Onnx Runtime Session Configuration

**Trigger:** Tuning Rust ONNX Runtime inference for your throughput / latency profile, especially when the model is embedded with include_bytes!().

## Steps

- Use ort::session::Session::builder() and configure with_intra_threads, with_inter_threads.
- Set optimization level via GraphOptimizationLevel (NoOptimization → Level3) based on startup-vs-throughput tradeoff.
- Embed the model with commit_from_memory(include_bytes!(...)) for single-binary distribution.
- Expose intra/inter thread counts as constructor parameters; respect ORT_INTRA_THREADS / ORT_INTER_THREADS env vars.
- Default thread counts to auto (let ORT pick); only override if you've benchmarked.
- Benchmark your specific model — small models are hurt by high thread counts due to scheduler overhead.

## Counter / Caveats

- Too many threads = slower for small models due to scheduler overhead.
- GPU flags are ignored by CPU-only ORT builds.
- Graph optimization is slow on first load; cache the optimized graph or skip it for cold-start-sensitive paths.
- Different models prefer different settings; never assume one configuration fits all.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `rust/lib/src/builder.rs:20-76`
- `rust/lib/src/session.rs:20-36`
