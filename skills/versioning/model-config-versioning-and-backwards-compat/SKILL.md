---
name: model-config-versioning-and-backwards-compat
description: Embed major/minor version in model config.min.json; validate at load time; ship multiple model versions side-by-side under assets/models/<version>/ with a CHANGELOG.
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

# Model Config Versioning And Backwards Compat

**Trigger:** An ML pipeline that must continue serving older models while you ship new ones — and must reject configs whose schema you can't speak.

## Steps

- Add version_major (int) and version_minor (int) fields to model config JSON.
- At load time, compare model version against the runtime's supported range; raise on unsupported.
- Keep multiple model versions in assets/models/ (standard_v3_3/, standard_v3_2/) with one symlink/pointer to the default.
- Document each version in a CHANGELOG with accuracy deltas, dataset changes, breaking changes.
- When the input schema changes (e.g. beg_size), bump major and refuse to load old runtimes against new models.
- Log model version in CLI --version output and in every result envelope.

## Counter / Caveats

- Multiple model versions on disk grow your package; consider optional download or external hosting.
- Feature dependencies (does the model require beg/mid/end offsets?) must be explicit in config — implicit assumptions break.
- Backwards-compat coverage requires running the regression suite against every supported model.
- Parameter changes (feature size, padding token) cannot be silently auto-migrated.

## Source

Extracted from `magika` (https://github.com/google/magika.git @ main).

Files of interest:
- `assets/models/standard_v3_3/config.min.json`
- `rust/lib/src/content.rs (MODEL_MAJOR_VERSION)`
- `python/src/magika/magika.py:47-48`
- `assets/models/CHANGELOG.md`
