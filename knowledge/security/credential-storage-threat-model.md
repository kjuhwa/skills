---
version: 0.1.0-draft
name: credential-storage-threat-model
summary: Craft Agents stores secrets in ~/.craft-agent/credentials.enc with AES-256-GCM keyed from a machine-stable hardware UUID — protecting against file exfiltration, not against local root.
category: security
tags: [credentials, threat-model, aes-gcm, machine-id]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/credentials/backends/secure-storage.ts
imported_at: 2026-04-18T00:00:00Z
---

# Credential storage threat model

The repo stores all user secrets (API keys, OAuth refresh tokens) in a single encrypted file `~/.craft-agent/credentials.enc`.

### Construction
- AES-256-GCM for AEAD.
- Key = `PBKDF2(machineId, randomSalt, 100_000, 32)`.
- `machineId` is OS-stable:
  - macOS: `IOPlatformUUID` from `ioreg`.
  - Windows: `MachineGuid` from `HKLM\SOFTWARE\Microsoft\Cryptography`.
  - Linux: `/var/lib/dbus/machine-id` (fallback `/etc/machine-id`).
  - Fallback: `${username}:${homedir}` string.
- File layout: 64-byte header (`"CRAFT01\0"` magic + flags + salt + reserved) followed by `IV(12) | tag(16) | ciphertext`.

### What it defends against
- **Offline exfiltration of `credentials.enc`.** A copy of the file WITHOUT a copy of the machine UUID cannot be decrypted.
- **Cloud backup leakage.** iCloud / OneDrive / rsync of `~/.craft-agent` doesn't leak secrets — the key lives in hardware/registry identifiers that aren't in the backup.

### What it does NOT defend against
- **Local root / admin.** Anyone with root can call `ioreg` / `reg query` and derive the same key.
- **Other processes running as the same user.** No process sandbox; any code the user runs can read `credentials.enc` and the machine ID.
- **Disk forensics with full-host access.** Attacker with the whole machine image recovers both file and hardware IDs.

### Legacy migration
Early versions used hostname as the machine-id seed; that's unstable under network changes. The backend detects legacy files by magic bytes and re-encrypts with the new key on first load — a one-shot migration.

### Other design choices
- Single encrypted file rather than OS keychain integration: avoids keychain prompts in every dev cycle, works headlessly (no GUI password dialog).
- PBKDF2 at 100k iterations is on the low end by 2026 - trade-off is app startup latency. Argon2id is a candidate for a v2 format if it becomes a problem.
- File format versioned via magic `"CRAFT01"` so a v2 can coexist transparently.

### Reference
`packages/shared/src/credentials/backends/secure-storage.ts` — full implementation. The file header comment enumerates the format.
