---
name: aes256gcm-machineid-credential-store
description: Cross-platform encrypted credential file (AES-256-GCM) keyed with a PBKDF2-derived key whose salt is pulled from a hardware-stable OS identifier so the store survives hostname/DHCP changes.
category: security
version: 1.0.0
version_origin: extracted
tags: [credentials, encryption, aes-gcm, pbkdf2, machine-id]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: packages/shared/src/credentials/backends/secure-storage.ts
imported_at: 2026-04-18T00:00:00Z
---

# AES-256-GCM credential store keyed on machine ID

## When to use
- Desktop/CLI app storing API keys, OAuth refresh tokens, etc. without a backing keychain prompt.
- Want cross-platform (macOS / Windows / Linux) without native keytar bindings.
- Need data authenticity (tamper detection), not just confidentiality - GCM gives both.

## How it works
1. **Stable hardware ID** per OS:
   - macOS: `ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID` -> parse the quoted UUID. Tied to the logic board.
   - Windows: `reg query HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid` -> parse `MachineGuid REG_SZ …`. Set at OS install.
   - Linux: `/var/lib/dbus/machine-id` (fallback `/etc/machine-id`). Set at OS install.
   - Fallback: `username + homedir` string.
2. **Key derivation**: `pbkdf2Sync(machineId, salt, 100_000, 32, 'sha256')`. Salt is stored in the file header.
3. **File layout** (`CRAFT01\0` magic + 4B flags + 32B salt + 20B reserved = 64B header, then `IV(12) | authTag(16) | ciphertext`).
4. **Encrypt**: `createCipheriv('aes-256-gcm', key, iv); update + final; getAuthTag()`.
5. **Decrypt**: same, `decipher.setAuthTag(tag)` before `final()` - throws if tampered.
6. **Legacy migration**: if magic bytes don't match, try the old hostname-based key first, re-encrypt with new key, write back.

## Example
```ts
import { createCipheriv, randomBytes, pbkdf2Sync } from 'crypto';
const MACHINE_ID = getStableMachineId(); // see OS-specific calls above
const salt = randomBytes(32);
const key = pbkdf2Sync(MACHINE_ID, salt, 100_000, 32, 'sha256');
const iv = randomBytes(12);
const cipher = createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
const tag = cipher.getAuthTag();
writeFileSync(path, Buffer.concat([MAGIC, flags, salt, reserved, iv, tag, enc]));
```

## Gotchas
- The derived key never leaves process memory, but anyone with ROOT/admin on the box can still call `ioreg`/`reg` and decrypt. This is about *offline exfiltration* protection, not local root.
- DON'T use `hostname()` as the machine ID - it changes with Wi-Fi, VPNs, DHCP. Learned the hard way; migration code needed.
- PBKDF2 100k iterations is on the low end by 2026 standards; consider Argon2 for new designs. Trade-off: app startup latency.
- Remember to `setAuthTag` BEFORE `final()` on decryption. Forgetting = `OperationError`.
- Keep a 64-byte fixed header with a magic string + flags field reserved for future format changes.
