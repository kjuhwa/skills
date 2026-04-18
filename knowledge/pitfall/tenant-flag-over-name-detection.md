---
version: 0.1.0-draft
tags: [pitfall, tenant, flag, over, name, detection]
name: tenant-flag-over-name-detection
category: pitfall
summary: Identify special/system tenants by a boolean flag on the entity, never by matching on name.
source:
  kind: project
  ref: lucida-account@f1efa2ba
---

# Detect System Tenants by Flag, Not by Name

**Fact.** The Polestar (system) organization is identified by `organization.system == true`. Earlier code matched `name == "Polestar"`, which broke on renames, localization, and test fixtures.

**Why.** Names are user-mutable metadata; business logic must key off immutable identity. A rename during a demo once silently stripped admin capabilities because the name-based check stopped matching (commit `3203b18b`).

**How to apply.** Any new "is this a privileged/system tenant?" branch must consult a dedicated flag or tenant-type enum. If adding a similar concept (system user, system group), give it its own flag too — do not reuse name. When migrating legacy data, backfill the flag once based on name, then remove all name-based checks.
