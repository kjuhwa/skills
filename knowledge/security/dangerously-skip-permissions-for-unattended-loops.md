---
version: 0.1.0-draft
name: dangerously-skip-permissions-for-unattended-loops
summary: `claude -p --dangerously-skip-permissions` is the only realistic way to run the CLI unattended in a loop, because every tool-use permission prompt would otherwise deadlock the child. The flag is safe *only* when the parent has already fenced the child's blast radius (scoped cwd, no prod creds in env, outbound network constrained).
category: security
confidence: medium
tags: [claude-code, permissions, unattended, security, sandboxing, trust-boundary, dangerous-flags]
source_type: extracted-from-project
source_project: trending-hub-loop
imported_at: 2026-04-18T00:00:00Z
linked_skills: [claude-cli-unattended-wrapper]
---

# `--dangerously-skip-permissions` for Unattended Loops

## Why the flag is unavoidable in a loop

`claude -p` normally prompts before each tool invocation the user hasn't pre-approved: `Edit`, `Bash`, `WebFetch`, `git clone`, `rm`. In an interactive session you answer `y`/`n`. In an unattended pipeline:

- There is no human to answer.
- Piping `y\n` to stdin *sometimes* works, but the prompt format and the exact byte sequence it expects have drifted between CLI versions.
- A single un-whitelisted tool hanging the child will stall the loop forever.

The flag skips every permission check. Every spawn in the reference wrapper pattern uses it because the alternative is brittle and unpredictable.

## What "dangerous" actually means

With the flag set, the child can, without asking, run:
- Any `Bash` command — `rm -rf`, `curl | sh`, `git push --force`, `docker run`, shell metacharacters, …
- Any `Edit`/`Write` on any path the process has filesystem access to.
- Any `WebFetch`/`WebSearch` to any URL.
- Any `git clone` / `gh` command using ambient credentials.

The model is generally careful, but "generally" is not a security guarantee. Treat the flag as authorizing full control of the user account that runs the child.

## Containment before you set the flag

Before flipping `--dangerously-skip-permissions` in production, make sure at least one of these is true:

1. **Per-run ephemeral environment.** Container or VM that's torn down after each run. `rm -rf /` in the child is survivable because the host isn't there.
2. **Scoped working directory.** The child's `cwd` is a throwaway directory. Outside the cwd, the process lacks write perms (dedicated user, locked-down home).
3. **No production credentials in env.** The child's `env` is explicitly constructed, not inherited wholesale. Strip `AWS_*`, `GITHUB_TOKEN` (or use a scoped PAT with just the perms this loop needs), `NPM_TOKEN`, `SSH_AUTH_SOCK`, `KUBECONFIG`, cloud CLI creds.
4. **Network egress allowlist.** Firewall or DNS that only permits `api.anthropic.com`, `github.com`, and whatever domains the loop legitimately needs. Blocks the "exfiltrate stolen creds" failure mode.

If you cannot say "yes" to at least one, do **not** set the flag. Go back to interactive mode or add a hook-based middle layer that auto-approves a **specific** allowlist of tool calls.

## Parent-side protections that don't require the flag

- **Wall-clock timeout.** Kill the child after N minutes regardless of state. A well-aimed `kill -9` stops catastrophes the model didn't mean to start.
- **Disk-usage cap.** `du -s <cwd>` before and after; alert if delta > threshold.
- **Audit log.** The parent should log every child invocation with the prompt hash, start/end time, exit code, and drafts delta. This is your only forensic trail if something goes wrong.
- **No `sudo`, no `--privileged`.** The user that runs the parent must not have any elevated powers. Defence in depth.

## Common mistakes

- **"It's just a loop that runs `/hub-import`, it's safe."** `/hub-import` internally runs `git clone` of an arbitrary URL. A poisoned `package.json` install script or `.git/hooks/post-checkout` can run on clone. The fence is necessary regardless of the parent slash command.
- **Using the flag on the developer's laptop.** Every fence above assumes a throwaway environment. On your personal machine, the flag hands your SSH keys, tokens, and source code to whatever the model decides to do. Prefer interactive mode there.
- **Assuming the model won't run a destructive command.** The model has been trained to be careful; it has not been trained to be *incapable* of running destructive commands. Fences are enforcement, not trust.

## Related

- Skill: `claude-cli-unattended-wrapper` — the wrapper where this flag lives.
- Knowledge: `claude-cli-hook-bypass-envs` — paired flag set; together they make the child fully non-interactive, which means the parent now owns all safety.
