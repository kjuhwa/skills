# model-onnx-file-versioning-and-staging — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `assets/models/ (9 versions)`
- `assets/models/CHANGELOG.md`
- `rust/gen/src/main.rs:26-27`

## When this pattern is a fit

Iterating on ML models where you must keep older versions reachable for debugging, A/B testing, and backwards compatibility.

## When to walk away

- .onnx files are large (10–100MB); consider git-lfs or external storage if total size grows.
- Symlinks don't work on Windows without admin or developer mode; prefer text pointers.
- Multi-model test matrices multiply CI cost; gate non-default-model tests behind a flag.
- Running old models is the only way to debug old predictions; don't delete them.
