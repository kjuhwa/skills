# multi-language-onnx-model-binding — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/lib/src/model.rs:23-31`
- `python/pyproject.toml:41-49`
- `js/src/model.ts:15-29`
- `go/onnx/onnx_runtime.go:1-25`

## When this pattern is a fit

Building a portable ML inference library that must support multiple language ecosystems with consistent behavior.

## When to walk away

- Version mismatch across bindings is fragile; requires coordinated cargo-dist + maturin + npm + Go module release pipeline.
- ONNX Runtime behavior differs subtly across platforms (GPU availability, threading semantics); test on every target OS.
- TensorFlow.js browser vs Node have different loading paths; detect environment and branch.
- Go via CGO requires the ONNX Runtime C library installed; consider vendoring or prebuilt binaries.
