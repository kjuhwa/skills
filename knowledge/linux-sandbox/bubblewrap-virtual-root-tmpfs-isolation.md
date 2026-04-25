---
version: 0.1.0-draft
name: bubblewrap-virtual-root-tmpfs-isolation
summary: `bwrap --tmpfs /` creates an empty virtual root; you then explicitly bind-mount each path the process needs, giving full PID and mount namespace isolation. `--die-with-parent` and `--new-session` prevent orphan daemons after the parent exits.
category: linux-sandbox
tags: [bubblewrap, bwrap, sandbox, namespace, tmpfs, isolation, linux, security]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Bubblewrap Virtual Root tmpfs Isolation

## Context

Bubblewrap (`bwrap`) is an unprivileged sandbox tool that creates a new mount
namespace and optionally a new PID namespace. It is used to run processes in
an isolated environment without requiring root or a setuid binary. Common
use cases include sandboxing build processes, untrusted code execution, and
cowork/code-agent backends.

The choice of how to construct the virtual root significantly affects the
isolation level and what the sandboxed process can access.

## Observation

`--ro-bind / /` (bind the real host root read-only as the sandbox root) gives
the sandboxed process full read access to the entire host filesystem. This is
a wide attack surface: a compromised process can read `/etc/shadow`,
`~/.ssh/id_rsa`, application secrets, etc.

`--tmpfs /` instead mounts an empty tmpfs as the virtual root. The sandboxed
process starts with nothing visible. You then selectively bind-mount only the
paths the process actually needs:

```bash
bwrap \
  --tmpfs /                          \
  --dev /dev                         \
  --proc /proc                       \
  --ro-bind /usr /usr                \
  --ro-bind /lib /lib                \
  --ro-bind /lib64 /lib64            \
  --ro-bind /etc /etc                \
  --tmpfs /tmp                       \
  --tmpfs /run                       \
  --bind "$WORK_DIR" "$WORK_DIR"     \  # writable: only the project dir
  --unshare-pid                      \
  --die-with-parent                  \
  --new-session                      \
  -- "$COMMAND" "$@"
```

This is the minimal-surface approach: the sandboxed process can read system
libraries and configuration, write only to its designated work directory, and
cannot see the rest of the host filesystem.

## Why it happens

`--tmpfs /` is the correct foundation for a minimal-surface sandbox because:
- tmpfs is memory-backed and entirely separate from the host filesystem.
- Paths not explicitly mounted do not exist in the sandbox.
- The sandboxed process cannot escape to unmounted host paths because they
  are simply not present in its mount namespace.

`--die-with-parent`: when the parent process exits (normally or due to crash),
the sandbox process receives SIGKILL via the Linux `PR_SET_PDEATHSIG`
mechanism. Without this, the sandboxed process becomes an orphan adopted by
init, continuing to consume resources and potentially holding locks.

`--new-session`: creates a new terminal session (`setsid()`), detaching the
sandbox from the parent's controlling terminal. This prevents the sandboxed
process from receiving signals (SIGHUP, SIGINT) directed at the parent's
terminal, and prevents it from reading the parent's tty.

`--unshare-pid`: creates a new PID namespace so the sandboxed process has
PID 1. Processes inside cannot see or signal host processes by PID.

## Practical implication

Use this pattern when you need a sandbox that is:
- Unprivileged (no root, no setuid).
- Minimal surface (process cannot read most of the host).
- Lifecycle-coupled (sandbox dies when parent dies, no orphans).

The `--tmpfs /` approach requires explicitly mapping every path the process
needs. Test the sandbox by running the target process and checking for `ENOENT`
errors against the bind-mount list.

Verify that `bwrap --ro-bind / / true` succeeds as a functional test before
assuming bwrap is available; it may be installed but non-functional if
user namespaces are disabled (common in some container environments).

## Source reference

- `docs/cowork-linux-handover.md`: "BwrapBackend path" section — minimal bwrap
  command line showing all flags.
- `docs/CONFIGURATION.md`: "Cowork Sandbox Mounts" section — configurable
  mounts and security restrictions (home-only writable mounts, critical paths
  that cannot be disabled).
