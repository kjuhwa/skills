# recursive-directory-traversal-cli-option — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/cli/src/main.rs:44-45`
- `python/src/magika/cli/magika_client.py:65-68`
- `go/cli/cli.go`

## When this pattern is a fit

Scanning entire directory trees from a CLI without forcing users to pipe `find` output through xargs.

## When to walk away

- Walking huge trees can be slow; parallelize directory I/O and inference.
- Symlink cycles are real; the visited-inode check is non-negotiable on *nix.
- node_modules / .git / target should usually be excluded by default — or at least documented.
- Parallel scanning produces non-deterministic output; sort if reproducibility matters.
