# model-config-versioning-and-backwards-compat — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `assets/models/standard_v3_3/config.min.json`
- `rust/lib/src/content.rs (MODEL_MAJOR_VERSION)`
- `python/src/magika/magika.py:47-48`
- `assets/models/CHANGELOG.md`

## When this pattern is a fit

An ML pipeline that must continue serving older models while you ship new ones — and must reject configs whose schema you can't speak.

## When to walk away

- Multiple model versions on disk grow your package; consider optional download or external hosting.
- Feature dependencies (does the model require beg/mid/end offsets?) must be explicit in config — implicit assumptions break.
- Backwards-compat coverage requires running the regression suite against every supported model.
- Parameter changes (feature size, padding token) cannot be silently auto-migrated.
