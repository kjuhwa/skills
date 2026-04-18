---
name: data-patch-package-for-migrations
version: 0.1.0-draft
tags: [arch, data, patch, package, for, migrations]
title: Data-migration code lives in a dedicated `patch` package, not alongside business services
category: arch
summary: One-off data patches (backfills, embedded→referenced splits, field additions) are grouped under a `patch` package so they're isolated from day-to-day service code and easy to audit/remove after a release.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  commits:
    - 6a4bf956
    - 95dcf3f5
confidence: medium
---

## Fact

Data-patch logic (e.g. top-resource-name backfill, tag_value_detail extraction migration) was moved into a `patch` package rather than living inside the domain services that own the data.

## Why

- Patches are release-bound and usually deletable after a few versions; isolating them keeps domain services from accumulating dead one-shot code.
- Review is easier when all "dangerous, runs-once" logic is in one place.

## How to apply

- New data backfills go in `patch/` with a clear `<issueId>_<short>` naming that maps to the ticket.
- Trigger backfills from a deliberate bootstrap path (ApplicationRunner gated by config/flag), not from random service hooks.
- When the patch has shipped and run everywhere, delete it in a follow-up release rather than leaving it dormant.

## Counter / caveats

- Confidence is medium: this reads as a project convention from commit messages, but may not yet be enforced by a code-review rule.
