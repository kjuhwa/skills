---
version: 0.1.0-draft
name: go-requires-cgo-onnxruntime
type: knowledge
category: pitfall
summary: The Go binding requires CGO + an externally installed ONNX Runtime C library.
confidence: high
tags: [magika, pitfall]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Go Requires Cgo Onnxruntime

## Fact

The Go library uses ONNX Runtime's C API via CGO, not pure Go. This means: requires a C toolchain, prevents static linking, complicates cross-compilation. Users must install ONNX Runtime separately (microsoft/onnxruntime) and use build tags like `go run -tags onnxruntime -ldflags="-linkmode=external"`.

## Evidence

- `go/README.md:6-25`
