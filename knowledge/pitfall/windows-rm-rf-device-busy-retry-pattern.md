---
version: 0.1.0-draft
name: windows-rm-rf-device-busy-retry-pattern
type: knowledge
category: pitfall
tags: [windows, msys, rm-rf, file-lock, retry, cleanup, claude-code]
summary: On Windows + Git Bash/MSYS, `rm -rf` on a directory containing git pack files or helper sidecar outputs often fails with "Device or resource busy" because background processes hold file handles. Mitigation - retry 2-3x with short sleeps, or ensure cwd and child processes are outside the target.
source: { kind: session, ref: wipe-skills-hub-script-test }
confidence: medium
linked_skills: []
supersedes: null
extracted_at: 2026-04-18
---

## Fact

`rm -rf ~/.claude/skills-hub/remote` on Windows (under Git Bash / MSYS) frequently fails with:

```
rm: cannot remove '<path>': Device or resource busy
```

even when the current shell is not inside the target directory and no obvious process has it open. Common culprits:

1. **Antivirus** scanning `.git/objects/pack/*.pack` files mid-delete.
2. **File Explorer** preview pane holding a handle.
3. **Claude Code's own sidecar** (`.omc/` inside the working tree) running a helper process.
4. **Git long-running processes** (fsmonitor, credential helper daemons).

`set -e` plus a single-shot `rm -rf` in a wipe script will abort halfway, leaving a partially-deleted directory tree that is *also* harder to clean because only some files are gone.

## Context / Why

The pattern surfaced while testing the skills-hub wipe-and-reinstall flow. First attempt aborted mid-delete; second attempt (same shell) still failed. Waiting ~30 seconds and retrying finally succeeded, suggesting lock-holder was transient.

Linux/macOS don't surface this because:
- They use advisory locking, not mandatory.
- They allow deleting open files (the file disappears when the last fd closes).
- Antivirus is less likely to hold open handles.

## Evidence

```bash
# Failure mode:
$ rm -rf ~/.claude/skills-hub/remote
rm: cannot remove '.../remote': Device or resource busy
# set -e aborts wipe script here; partial state left behind.

# Retry pattern that worked:
safe_rm() {
    local target="$1" attempt=1
    while [[ $attempt -le 3 ]]; do
        if rm -rf "$target" 2>/tmp/err.log; then return 0; fi
        if grep -q "busy\|being used" /tmp/err.log; then
            sleep 2
            attempt=$((attempt + 1))
            continue
        fi
        return 1
    done
    return 1
}
```

## Applies when

- You write cleanup / wipe / reinstall scripts that must run on Windows.
- Your target directory contains `.git/`, `node_modules/`, or other high-churn subtrees.
- The target may have live sidecar processes (OMC, fsmonitor, Dropbox, OneDrive).

## Counter / Caveats

- **Always `cd` out of the target first** before `rm -rf`. The session test first failed partly because a child shell was rooted inside the doomed dir.
- **Retry with `sleep 2` × 3** is usually enough for antivirus/explorer to release. Longer loops help fight OneDrive re-hydration.
- Don't mask the error permanently — if 3 retries fail, report it clearly and tell the user to close Explorer / kill sidecars.
- `set -e` should NOT cover the rm call — wrap in `|| true` within the retry function and handle failure explicitly.
- On paths with Unicode or long names, Windows path-length limit (260 chars) can *also* cause "cannot remove" errors — different root cause, different fix (`git config --global core.longpaths true`).
