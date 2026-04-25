---
version: 0.1.0-draft
name: legacy-vs-explicit-subcommand-migration
summary: VoxCPM migrated from implicit mode detection (arg presence) to explicit subcommands (voxcpm design|clone|batch); old style emits deprecation warning
category: cli
tags: [cli, migration, subcommands, backward-compatibility, deprecation]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/OpenBMB/VoxCPM.git
source_ref: main
source_commit: 13605c5a0e6b99d6d3527a43bd1a4e0e69c8800e
source_project: VoxCPM
source_paths:
  - src/voxcpm/cli.py
imported_at: 2026-04-18T00:00:00Z
---

# Legacy implicit-mode CLI vs explicit subcommand CLI

VoxCPM's CLI underwent a breaking change between releases: the old style inferred the generation mode from which arguments were present on the command line (e.g., if `--reference-audio` was provided, it was clone mode; if only `--control` was provided, it was design mode). The new style requires an explicit subcommand: `voxcpm design ...`, `voxcpm clone ...`, or `voxcpm batch ...`.

The legacy implicit mode is still supported for backward compatibility but emits a deprecation warning via Python's `warnings.warn()` when detected. The detection logic is in `cli.py` around lines 64–69: if `sys.argv[1]` is not one of the known subcommand names, the code falls back to legacy mode and parses arguments heuristically.

This migration was made to eliminate ambiguous argument combinations (e.g., what does it mean to provide both `--control` and `--reference-audio` without a subcommand?) and to improve error messages for new users.

## Why it matters
When debugging shell scripts or CI pipelines that invoke VoxCPM and see deprecation warnings in stderr, the fix is to add the explicit subcommand. For example, change `voxcpm --text "hello" --control "calm"` to `voxcpm design --text "hello" --control "calm"`. The legacy mode will likely be removed in a future major release.

## Source reference
- Upstream: `OpenBMB/VoxCPM` @ `main` / `13605c5a`
- Key files:
  - `src/voxcpm/cli.py:64-69` — legacy mode detection and deprecation warning emission
