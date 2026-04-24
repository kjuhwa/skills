# jsonl-stdout-batch-prediction-format — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/cli/src/main.rs:102-128`
- `python/src/magika/cli/magika_client.py:70-71`

## When this pattern is a fit

Building a CLI that processes many files and must compose with Unix text-processing pipelines.

## When to walk away

- Paths with embedded newlines/control chars break naive line-by-line parsers; escape inside the JSON string.
- Field ordering in JSON is not guaranteed across serializers; if downstream relies on order, use ordered maps.
- JSONL is not Excel-friendly; users expecting CSV need a separate format.
- stdout buffering can delay tail-style consumers if you forget the explicit flush.
