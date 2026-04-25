---
version: 0.1.0-draft
name: onnx-runtime-version-pinning-history
type: knowledge
category: version-quirk
summary: ONNX Runtime went through a pin → repin → unpin cycle (rc.11 → rc.12 → unpinned).
confidence: high
tags: [magika, version-quirk]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Onnx Runtime Version Pinning History

## Fact

Early Magika releases pinned onnxruntime to specific release-candidates because the API was unstable. As ONNX Runtime stabilized toward 2.0, the pin was removed (commit cf74f06). Pattern: pin to specific RCs while a dependency is moving fast; relax the pin once the upstream stabilizes.

## Evidence

- `commit 6746884`
- `commit cf74f06`
- `commit 37362cd`
