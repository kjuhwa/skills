---
version: 0.1.0-draft
tags: [domain, mongodb, exclude, system, databases]
name: mongodb-exclude-system-databases
category: domain
summary: When enumerating tenant databases in a shared MongoDB cluster, filter out admin/config/local plus third-party DBs (yorkie-meta, migration) to avoid touching shared state
source:
  kind: project
  ref: lucida-audit@65ff568
  path: src/main/resources/application.yml
confidence: medium
---

# Fact

The audit service shares a MongoDB cluster with other internal systems. When listing "all tenants" by enumerating databases, the exclude list is:

`admin`, `config`, `local` (MongoDB internals), `migration` (shared schema tooling), `yorkie-meta` (collaborative editing framework), plus any tenant-management meta DB.

# Why

- **admin/config/local** — writing here corrupts the cluster; reading breaks on permissions.
- **migration** — shared across services; an audit-side write would race with migration tooling.
- **yorkie-meta** — owned by a collaborative-editing framework; touching its collections disrupts real-time ops on other services.

A fresh deploy that enumerated ALL DBs and tried to create audit collections inside each would have corrupted the migration DB.

# How to apply

- Never enumerate databases to discover tenants — always pull the tenant list from the authoritative metadata service (see `tenant-db-initialization-on-startup`).
- If you MUST enumerate (disaster recovery, audit report), apply the exclude list as a first-class config, not an inline hardcoded check.
- When onboarding a new shared platform component that creates DBs, add its DB prefix to the exclude list immediately — don't wait for the collision incident.

# Counter / Caveats

- Exclude list will drift as the platform evolves. Codify it as a shared config module so all services pick up updates together.
