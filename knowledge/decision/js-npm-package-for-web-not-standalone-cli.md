---
version: 0.1.0-draft
name: js-npm-package-for-web-not-standalone-cli
type: knowledge
category: decision
summary: The npm package is for browser/Node library use; the Rust CLI is recommended for command-line work.
confidence: high
tags: [magika, decision]
linked_skills: []
source_type: extracted-from-git
source_url: https://github.com/google/magika.git
source_ref: main
source_commit: 0a8cb9626bbf76c2194117d9830b23e9052a1548
source_project: magika
imported_at: 2026-04-18T00:00:00Z
---

# Js Npm Package For Web Not Standalone Cli

## Fact

The JS package targets programmatic detection in browser/Node. The official CLI is the Rust-based one because the JS CLI has slow model loading. Use cases: integrate JS in your app or run the web demo. For CLI batch processing, use the Rust binary.

## Evidence

- `website-ng/src/content/docs/additional-resources/faq.md:18-20`
- `js/README.md:43-51`
