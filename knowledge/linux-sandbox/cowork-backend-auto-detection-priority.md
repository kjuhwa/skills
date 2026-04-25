---
version: 0.1.0-draft
name: cowork-backend-auto-detection-priority
summary: Sandbox backend selection should prefer the most-isolated available option (bwrap > kvm > host) using functional tests, not just binary presence; expose the active backend via a `--doctor` diagnostic command and allow override via an environment variable.
category: linux-sandbox
tags: [sandbox, bubblewrap, kvm, qemu, detection, backend, isolation, cowork, linux]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: medium
---

# Cowork Backend Auto-Detection Priority

## Context

A service that needs process isolation has multiple backend options with
different isolation levels and dependency requirements. Choosing the right
backend automatically (without user configuration) requires more than checking
if the relevant binary is in PATH — the binary may be present but non-functional
due to missing kernel features, disabled privileges, or missing device nodes.

## Observation

A three-tier backend priority system with functional testing works as follows:

| Priority | Backend | Isolation | Functional test |
|---|---|---|---|
| 1 (default) | bwrap (bubblewrap) | PID + mount namespace | `bwrap --ro-bind / / true` succeeds |
| 2 (opt-in) | KVM (QEMU/KVM) | Full VM | `/dev/kvm` readable+writable, `qemu-system-x86_64` in PATH, `/dev/vhost-vsock` readable |
| 3 (fallback) | host | None | Always available |

Key design decisions:
- **Functional test, not presence test**: `which bwrap` succeeds even when
  user namespaces are disabled (common in some container environments). The
  functional test `bwrap --ro-bind / / true` actually verifies the sandbox
  can run.
- **KVM is opt-in**: full VM isolation has higher latency and resource cost.
  It should not be auto-selected unless explicitly requested.
- **Host is always-available fallback**: never fails, but provides no
  isolation. Should be documented as a security tradeoff.
- **Environment variable override**: `BACKEND_NAME=bwrap/kvm/host` allows
  power users and CI environments to force a specific backend.

## Why it happens

Binary presence alone is insufficient for two reasons:
1. System-level features may be disabled (user namespaces, KVM acceleration,
   vsock) even when the tool binary is installed.
2. Permission issues (missing read/write on `/dev/kvm`, missing group
   membership) can prevent a tool from functioning.

A fast functional test (`bwrap --ro-bind / / true` exits in milliseconds)
catches all of these cases at once.

## Practical implication

```js
async function detectBackend() {
  const override = process.env.SANDBOX_BACKEND;
  if (override) {
    console.log(`Backend override: ${override}`);
    return createBackend(override);
  }

  // Test bwrap: check both presence and functionality
  if (commandExists('bwrap')) {
    try {
      execFileSync('bwrap', ['--ro-bind', '/', '/', 'true'], {
        timeout: 5000,
        stdio: 'ignore'
      });
      console.log('Backend: bwrap (namespace sandbox)');
      return new BwrapBackend();
    } catch (_) {
      console.log('bwrap present but non-functional, trying next backend');
    }
  }

  // Test KVM: check device nodes and binary
  if (
    canReadWrite('/dev/kvm') &&
    commandExists('qemu-system-x86_64') &&
    canRead('/dev/vhost-vsock')
  ) {
    console.log('Backend: KVM (VM isolation)');
    return new KvmBackend();
  }

  // Fallback: no isolation
  console.log('Backend: host (no isolation — install bwrap for sandbox)');
  return new HostBackend();
}
```

Expose the active backend via a diagnostic command:

```bash
# Output example:
# Cowork isolation: bubblewrap (namespace sandbox)
# Cowork isolation: KVM (full VM isolation)
# Cowork isolation: none (host-direct, no isolation)
```

Log the selected backend to a file at daemon startup so users can verify what
is active without running the diagnostic command.

## Source reference

- `docs/cowork-linux-handover.md`: "Backend Detection" section — auto-detection
  order, functional test for bwrap, KVM device checks, and override mechanism.
- `docs/cowork-linux-handover.md`: target architecture diagram showing the
  three-backend hierarchy.
- `scripts/cowork-vm-service.js`: `detectBackend()` function and `BACKEND_OVERRIDE`
  constant.
