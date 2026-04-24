# cli-output-format-dispatch-with-template — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/cli/src/main.rs:102-230`
- `python/src/magika/cli/magika_client.py:70-85`

## When this pattern is a fit

Building a CLI that must output the same data in multiple formats (machine, human, custom column selection) without spawning child tools.

## When to walk away

- Keep the template grammar simple — no conditionals, no loops, just substitution.
- Aligning columns with Unicode (CJK, emoji) breaks monospace assumptions; document the limitation.
- Changing the default format between releases breaks user scripts; treat the default as a stable API.
- Escape sequences (%, \t, \n) inside templates are confusing; show them in --help with examples.
