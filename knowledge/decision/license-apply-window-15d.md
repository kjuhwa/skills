---
version: 0.1.0-draft
tags: [decision, license, apply, window, 15d]
name: license-apply-window-15d
category: decision
summary: Issued licenses must be applied within 15 days; expired licenses are immutable.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# License Apply Window: 15 Days from Issue

**Fact.** A license has a `applyExpireDateTime` = issueDate + 15d. After that window, the license cannot be applied or updated. Config: `apply-period-from-issue-date: 15`.

**Why.** Prevents indefinite "pending" licenses from cluttering the issuance pipeline and forces customers to acknowledge receipt promptly. Immutability after expiry prevents retroactive scope changes that would invalidate audit trails (#106522).

**How to apply.** When building license-related UX, surface `applyExpireDateTime` prominently and warn when < 3 days remain. Any update code path must check expiry BEFORE attempting to mutate — return a distinct error, not a generic "update failed".
