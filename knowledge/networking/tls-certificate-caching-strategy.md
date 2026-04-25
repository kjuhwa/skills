---
version: 0.1.0-draft
name: tls-certificate-caching-strategy
type: knowledge
category: networking
summary: TLS cert validation caches results in-memory; upsert_tls_cache() implements trust-on-first-use.
confidence: medium
tags: [caching, certificate, networking, strategy, tls]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/rustdesk/rustdesk.git
source_ref: master
source_commit: ac124c068056395f9456a6c42eddab89b469a3a8
source_project: rustdesk
source_path: src/common.rs
imported_at: 2026-04-19T00:00:00Z
---

# Tls Certificate Caching Strategy

## Fact
TLS cert validation caches results in-memory; upsert_tls_cache() implements trust-on-first-use.

## Why it matters
Balance between real PKI and self-signed-friendly P2P setups.

## Evidence
- Repo: `rustdesk/rustdesk` @ `ac124c0680`
- `src/common.rs`
