---
version: 0.1.0-draft
tags: [pitfall, audit, changed, prev, after, field]
name: audit-changed-prev-after-field-swap-bug
category: pitfall
summary: Audit diff logic had before/after swapped — iterating the wrong doc and putting the wrong value into changedPrev corrupted the audit trail silently
source:
  kind: project
  ref: lucida-audit@bd4dc66
  commits: [bd4dc66, 543f972, e4d77d4]
confidence: high
---

# Fact

An earlier version of `getChangedInfo()` in `AuditLogServiceImpl` iterated the AFTER document and wrote AFTER values into the `changedPrev` map. Result: auditors reading the trail saw the new value as "previous" and the old value as "after" — the change direction was inverted for every UPDATE event.

Fixed in commit bd4dc66 ("변경전/후 데이터 바뀜 오류 수정"). Two earlier attempts (543f972, e4d77d4) addressed the symptom but not the root cause.

# Why it happened

- The method received `baseDoc` and `targetDoc` but the naming was ambiguous — neither name told the reader which was "before".
- No unit test asserted `prev != after` for a non-trivial change.
- Existing audit entries all showed symmetric values on simple cases, masking the bug in manual QA.

# How to apply

When building ANY before/after diff utility:

1. Name parameters `beforeDoc`/`afterDoc` — never `base/target`, `source/dest`, `left/right`.
2. Write the canonical test first: `diff({x:1}, {x:2}) => { prev:{x:1}, after:{x:2} }`. Assert BOTH sides.
3. Iterate the BEFORE doc, then do a second pass picking up NEW keys from AFTER with `prev=null`.
4. On bug report "변경 데이터가 이상하다", check symmetry first — swapped-arg bugs are common.

# Counter / Caveats

- If the business domain genuinely stores diffs as "target vs base" (e.g. migration tooling), the naming advice flips — but document the convention loudly at the method signature.
