---
version: 0.1.0-draft
tags: [decision, system, notification, shared, with, 2fa]
name: system-notification-shared-with-2fa-and-password-find
category: decision
summary: The `system_notification` config (SMTP/SMS credentials) is intentionally shared between 2FA and password-find flows rather than duplicated per flow
source:
  kind: project
  ref: lucida-notification@release-10.2.4_2
  evidence:
    - "commit 9739515 — '시스템 통보 2차 인증, 비밀번호 찾기 공통으로 사용할 수 있도록 수정'"
    - "commit 4b042fa / c22fb22 — password-find endpoint changes"
    - "commit 83bb862 / 95880ae — '통보 설정 비밀번호 암호화 적용'"
confidence: medium
---

## Fact
There is **one** system-notification configuration record (with encrypted SMTP/SMS password) that both the 2FA code delivery and the password-reset code delivery flows read from. It is not duplicated per flow.

## Why this was chosen
Operators don't want to maintain the same mail server credentials twice, and they don't want 2FA and password-reset to silently diverge (one working, one broken). A shared config means one place to rotate a password.

## How to apply
- When adding a new auth-side flow that needs to send a code (e.g. email-verification on signup), **reuse the system-notification config** — don't add a third record.
- Field-level validation lives on the config record (commit `359a9e7` added validation); per-flow code should not re-validate SMTP host/port.
- The password in this record is encrypted via `PasswordEncoder.encryptWithBase64`; always round-trip through the decoder at use time.

## Counter / Caveats
- Sharing means one breakage takes down multiple flows simultaneously. Health-check from each flow individually so alerts point to the real root cause (the shared config), not a flow.
- Sunset path: if a customer ever demands separate 2FA vs password-find SMTPs (compliance split), this decision must be revisited — don't design around "always one" forever.
