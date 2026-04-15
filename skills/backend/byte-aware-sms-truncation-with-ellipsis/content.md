# Byte-Aware SMS Truncation

## Problem
SMS DB column is `VARCHAR(100)` (bytes on MariaDB in `utf8mb3`, chars on Oracle `VARCHAR2(100 CHAR)`). A 50-character Korean message in UTF-8 is 150 bytes — it silently truncates mid-codepoint on insert, or the gateway rejects it.

## Algorithm
```
budget = maxBytes - ELLIPSIS.getBytes(charset).length
out = new ByteArrayOutputStream()
for codePoint in message:
  bytes = codePoint.encode(charset)
  if out.size() + bytes.length > budget: break
  out.write(bytes)
if truncated: out.write(ELLIPSIS.getBytes(charset))
return new String(out.toByteArray(), charset)
```

## Steps
1. Take `maxBytes` and `charset` as parameters (EUC-KR for legacy Korean gateways, UTF-8 for modern).
2. Iterate by *code point*, not `char` — surrogate pairs must stay intact.
3. Append `...` in the target charset only if truncation happened.
4. Unit-test boundary: message fits exactly, message one byte over, multibyte char straddling boundary.

## Counter / Caveats
- If preview UI shows the untruncated message and DB stores truncated, users get confused — apply the same truncation in the preview API (see `one-default-template-per-type-rule` area for a parallel preview-diverges-from-db bug).
- Don't hard-code `...`; some locales use `…` (3 bytes UTF-8 vs 1 byte in EUC-KR — breaks budget math if changed carelessly).
- This only handles body; `sender`/`recipient` have their own column limits.
