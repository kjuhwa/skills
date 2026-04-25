# cargo-dist-multi-platform-rust-cli-release — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `dist-workspace.toml:1-39`
- `.github/workflows/cli-release.yml:1-80`

## When this pattern is a fit

Releasing a Rust CLI that must be installable on Linux x86_64/aarch64, macOS aarch64, and Windows x64 with one-line installers.

## When to walk away

- Custom runners (aarch64) may not be in your GitHub plan; cross-compile via cross crate as fallback.
- Tag pattern in dist-workspace.toml is strict; mismatched tags silently skip the workflow.
- Installer scripts assume *nix conventions ($PATH, /usr/local/bin); restricted environments need manual install paths.
- Per-platform binaries can be 100MB+; GitHub Actions has a 5GB artifact cap.
