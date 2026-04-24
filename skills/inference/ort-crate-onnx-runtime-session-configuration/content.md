# ort-crate-onnx-runtime-session-configuration — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/lib/src/builder.rs:20-76`
- `rust/lib/src/session.rs:20-36`

## When this pattern is a fit

Tuning Rust ONNX Runtime inference for your throughput / latency profile, especially when the model is embedded with include_bytes!().

## When to walk away

- Too many threads = slower for small models due to scheduler overhead.
- GPU flags are ignored by CPU-only ORT builds.
- Graph optimization is slow on first load; cache the optimized graph or skip it for cold-start-sensitive paths.
- Different models prefer different settings; never assume one configuration fits all.
