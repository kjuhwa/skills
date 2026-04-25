---
version: 0.1.0-draft
name: single-model-onnx-not-multiple-backends
type: knowledge
category: decision
summary: Magika standardized on one ONNX model rather than maintaining separate per-language backends.
confidence: high
tags: [magika, decision]
linked_skills: [multi-language-onnx-model-binding]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Single Model Onnx Not Multiple Backends

## Fact

ONNX (Open Neural Network Exchange) was chosen so Rust, Python, JS, and Go bindings can all consume the same model file. Avoids the maintenance burden of N parallel TensorFlow/PyTorch/ONNX models and guarantees feature parity.

## Evidence

- `go/README.md:6-8`
- `js/README.md:3-7`
