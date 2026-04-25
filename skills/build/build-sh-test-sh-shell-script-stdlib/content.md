# build-sh-test-sh-shell-script-stdlib — extended notes

This is an extracted draft from the **magika** project at commit `0a8cb9626b`.
See `SKILL.md` for the procedure. Use the source references below to study the
original implementation before adapting the pattern to a new codebase.

## Source references

- `rust/cli/build.sh`
- `rust/test.sh`
- `rust/color.sh`
- `rust/onnx/build.sh`

## When this pattern is a fit

Multi-language monorepo where every CI workflow tends to grow ad-hoc inline scripts that drift from local dev commands.

## When to walk away

- Bash vs sh vs zsh portability bites; explicitly require bash if you use bash-isms.
- Color output assumes ANSI; detect TTY and disable for redirected output.
- Sourcing across directories needs absolute paths or relative-to-script ($(dirname ${BASH_SOURCE[0]})).
- Windows users need WSL or Git Bash; document or provide a PowerShell variant.
