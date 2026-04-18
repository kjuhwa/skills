---
name: sibling-scoped-name-uniqueness
version: 0.1.0-draft
tags: [pitfall, sibling, scoped, name, uniqueness]
title: Group name uniqueness must be scoped to parent, not global
category: pitfall
summary: A global unique index on group `name` was present and had to be dropped; uniqueness is correct only within the same parent.
source:
  kind: project
  ref: lucida-cm@0c4edd30
  commits:
    - 2b02bd7f
    - 78214a3f
    - 75eeacb5
confidence: high
---

## Fact

Group-name duplicate check was incorrectly global; fix scopes it to the same parent. A stray global-unique index on the name field also had to be removed at migration time.

## Why

Hierarchical groups model folders — "General" can exist under multiple parents without conflict. A global unique index enforces a constraint the product doesn't want and silently blocks legitimate creates.

## How to apply

- For any tree entity, the sibling-name uniqueness check queries `{parentId, name}`, never `{name}` alone.
- The matching unique index is composite `{parentId: 1, name: 1}`, not `{name: 1}`.
- On schema review, flag any unique index on a single human-readable name field — it's almost always wrong for tree data.

## Counter / caveats

- If the product explicitly wants globally unique names (e.g. user-visible slugs), document that and keep the global index — but then don't also enforce parent-scoped uniqueness.
