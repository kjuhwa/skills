---
version: 0.1.0-draft
tags: [domain, encrypted, pii, decode, export]
name: encrypted-pii-decode-on-export
category: domain
summary: PII fields (phone, email) are stored encrypted; only decrypted for explicit export/API response, never for logs.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# PII Encrypted at Rest, Decrypted Only on Egress

**Fact.** User `phone` and `email` are persisted as AES-encrypted strings. Decryption occurs in:
- CSV export (`UserBatchService` export path)
- API responses that explicitly opt-in
- NEVER in log statements, error messages, or exception payloads

**Why.** Meets PII-at-rest compliance and limits blast radius if a Mongo dump leaks. Logs are the most common accidental exfiltration vector — masking utilities exist precisely because engineers reflexively log DTOs during debugging.

**How to apply.** When adding a new endpoint that returns user data, explicitly call the decryption util and justify the exposure in the PR. When adding logs involving users, log only `loginId` and `userId`; never echo a full `User` entity. On bulk imports, validate phone/email BEFORE encryption so the regex failure message doesn't contain the raw value.
