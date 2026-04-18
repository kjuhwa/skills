---
version: 0.1.0-draft
tags: [decision, query, manager, version, conversion, fallback]
name: query-manager-version-conversion-fallback
description: Unknown target RDBMS versions fall back to a documented default bucket rather than erroring, keeping collection alive
category: decision
source:
  kind: project
  ref: lucida-domain-dpm@c0758569
---

# Unknown DBMS version → fallback to nearest supported bucket

**Fact.** `QueryTextMapper` does not require an exact `(dbms, version)` match. Each DBMS has a version normalizer that maps raw version strings into a supported bucket; when the raw version falls outside every known bucket, the normalizer returns a documented default (e.g. unknown Oracle → `12c`, unknown MySQL → `5.7`).

**Why:** monitoring agents are deployed faster than new DBMS versions are qualified. A strict lookup means the day a customer upgrades Oracle to a point release ahead of us, collection on that target silently stops. The cost of running slightly outdated queries against a new version is almost always less than the cost of a collection outage, and operators get a warning log either way.

**How to apply.**
- For any versioned external API, prefer "nearest supported + warn" over "exact match or fail" as the default policy.
- Document the fallback bucket per DBMS so operators know what they're actually running.
- Emit a one-shot warn log per `(target, resolvedBucket)` so fallbacks are visible but not noisy.
- Keep the fallback list in code review scope — each new DBMS version release should explicitly update the normalizer, not just quietly inherit the old default.

**Evidence.**
- `QueryTextMapper.java` version converters (`convertVersion*` methods) per DBMS.
- This policy is implicit in the codebase, not written down — capturing it here.
