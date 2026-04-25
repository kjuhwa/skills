# generated-enum-and-config-code-from-json-schema — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/gen/src/main.rs:23-100`
- `python/src/magika/types/content_type_label.py:19-30`
- `rust/lib/src/content.rs (generated)`

## When this pattern is a fit

You have a large dynamic schema (300+ entries) and need per-language type safety without hand-writing or hand-maintaining enums.

## When to walk away

- Generator output must be deterministic; non-deterministic ordering breaks reproducible builds and noisy diffs.
- Schema drift (new fields, type changes) causes generator failures; version the schema and validate before generating.
- Large enums (300+ variants) slow Rust compile times; consider non_exhaustive and feature gates.
- IDE autocomplete fails until generation runs; document a clone-time setup script.
