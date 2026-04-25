---
name: model-onnx-file-versioning-and-staging
description: Version model assets under assets/models/<name>_v<major>_<minor>/ with per-version README and a top-level CHANGELOG.md, and a 'default' pointer (file or symlink).
category: versioning
version: 1.0.0
version_origin: extracted
confidence: medium
tags: [magika, versioning]
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Model Onnx File Versioning And Staging

**Trigger:** Iterating on ML models where you must keep older versions reachable for debugging, A/B testing, and backwards compatibility.

## Steps

- Adopt a naming convention: <family>_v<major>_<minor>/ (standard_v3_3, fast_v2_1).
- Each model dir contains: model.onnx, config.min.json, metadata.json, README.md.
- Maintain a single assets/models/CHANGELOG.md with one section per version: dataset changes, accuracy deltas, breaking changes.
- Pick a default with a pointer file or a symlink — but on Windows prefer a text pointer because symlinks need admin rights.
- Test new models against the full tests_data/ corpus before promoting to default.
- Archive old binaries even after promotion — they're needed for reproducing old predictions.

## Counter / Caveats

- .onnx files are large (10–100MB); consider git-lfs or external storage if total size grows.
- Symlinks don't work on Windows without admin or developer mode; prefer text pointers.
- Multi-model test matrices multiply CI cost; gate non-default-model tests behind a flag.
- Running old models is the only way to debug old predictions; don't delete them.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `assets/models/ (9 versions)`
- `assets/models/CHANGELOG.md`
- `rust/gen/src/main.rs:26-27`
