---
version: 0.1.0-draft
name: ci-gpg-signing-batch-mode-non-interactive
summary: GPG signing in CI requires `--batch --yes` flags, a pre-imported key, and `git config user.signingKey` set; without a TTY, pinentry will fail and the signing step hangs or errors unless all interactive prompts are bypassed.
category: ci-cd
tags: [gpg, signing, ci-cd, github-actions, non-interactive, batch, pinentry]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# CI GPG Signing Batch Mode (Non-Interactive)

## Context

Package signing (`.deb`, `.rpm`, APT repository metadata, RPM repository
metadata) often requires GPG. CI environments have no interactive terminal
(TTY), which breaks the standard GPG flow that relies on pinentry for
passphrase input.

## Observation

Two distinct GPG errors occur in CI:

1. **"cannot open /dev/tty"**: GPG tries to open a TTY for passphrase input
   via pinentry-curses or pinentry-gnome3. Without a TTY, this fails.
   Fix: `--batch` flag tells GPG to read from stdin/env and not try to open
   a terminal.

2. **"File exists"**: When exporting or writing a key file that already exists
   from a previous run (common in cached CI runners or re-runs).
   Fix: `--yes` flag tells GPG to overwrite without prompting.

Additionally, if the signing key is not imported into the CI runner's GPG
keyring before the signing step, GPG will fail with "secret key not available".
Keys must be imported from a CI secret (environment variable or file secret)
as an explicit step.

## Why it happens

GPG's interactive mode is designed for human users. It opens `/dev/tty`
directly (bypassing stdin/stdout redirection) to read passphrases. CI
environments run in containers or VMs without a controlling terminal; the
open fails immediately.

The `--batch` flag enables non-interactive mode:
- Reads passphrase from `--passphrase-fd 0` or `--passphrase` option.
- Does not attempt to open a terminal.
- Fails deterministically on errors instead of prompting.

`--yes` globally answers "yes" to overwrite prompts that would otherwise block.

## Practical implication

CI GPG signing setup checklist:

```yaml
- name: Import GPG signing key
  run: |
    echo "${{ secrets.GPG_PRIVATE_KEY }}" | gpg --batch --import

- name: Configure git signing
  run: |
    git config user.signingKey "${{ secrets.GPG_KEY_ID }}"
    git config commit.gpgsign true

- name: Sign a file (e.g., APT repo Release file)
  run: |
    gpg --batch --yes \
        --passphrase "${{ secrets.GPG_PASSPHRASE }}" \
        --pinentry-mode loopback \
        --armor --detach-sign \
        --output Release.gpg \
        Release
```

Key flags:
- `--batch`: non-interactive mode.
- `--yes`: overwrite existing files.
- `--passphrase-fd 0` or `--passphrase "..."` + `--pinentry-mode loopback`:
  reads passphrase without TTY.
- `--pinentry-mode loopback`: modern GPG 2.1+ way to bypass pinentry entirely
  for scripted use.

Common CI pitfall table:

| Error | Cause | Fix |
|---|---|---|
| "cannot open /dev/tty" | No TTY, interactive mode | Add `--batch` |
| "File exists" | Output file already present | Add `--yes` |
| "No secret key" | Key not imported | Import key from secret first |
| "Bad passphrase" | Passphrase in env has whitespace | Quote the passphrase |
| Push rejected after signing | Concurrent pushes | Add retry with rebase |

Test signing commands locally with `--dry-run` where available, or in a
container without a TTY, before committing the CI workflow.

## Source reference

- `CLAUDE.md`: "Common CI Pitfalls" table — lists "GPG 'cannot open /dev/tty'"
  with `--batch` fix and "GPG 'File exists'" with `--yes` fix.
- `CLAUDE.md`: "CI/CD" section — `gh workflow run` and `gh run watch` commands
  for triggering and monitoring CI.
