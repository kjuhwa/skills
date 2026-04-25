# overwrite-map-for-non-canonical-types — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `assets/models/standard_v3_3/config.min.json (overwrite_map)`
- `rust/lib/src/model.rs:35-130`
- `js/src/overwrite-reason.ts:15-19`

## When this pattern is a fit

Your model was trained on a finer label set than your application wants to expose, and you need a config-driven projection layer.

## When to walk away

- Cycles or chains in the map break inference; validate the DAG at load time.
- Conflating LowConfidence and OverwriteMap reasons makes auditing impossible — keep them distinct.
- Changing the map between releases breaks reproducibility; version it and document changes.
- Don't expose the map mutable at runtime unless you also expose a way to audit which version was applied.
