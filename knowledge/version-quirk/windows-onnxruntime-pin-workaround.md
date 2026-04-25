---
version: 0.1.0-draft
name: windows-onnxruntime-pin-workaround
type: knowledge
category: version-quirk
summary: Windows builds temporarily pinned onnxruntime to work around build issues — later resolved as ONNX Runtime stabilized.
confidence: medium
tags: [magika, version-quirk]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Windows Onnxruntime Pin Workaround

## Fact

Windows CI hit failures on newer ONNX Runtime versions, leading to a temporary pin (commit b2411c6). Resolved later (commit 1436616) once ONNX Runtime fixed the underlying issue. Pattern: Windows build complexity (CMake + MSVC toolchain) tends to lag Linux/macOS — be ready to pin temporarily.

## Evidence

- `commit b2411c6`
- `commit 1436616`
