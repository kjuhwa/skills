---
tags: [frontend, recoil, domain, atom, store]
name: recoil-domain-atom-store
description: Domain-scoped Recoil atom organization with typed hook wrappers for large-scale React state management
triggers:
  - recoil atom
  - state management
  - domain store
  - global state
category: frontend
version: 1.0.0
source_project: lucida-ui
---

# Recoil Domain Atom Store

## Purpose

Organize Recoil atoms into domain-scoped modules with typed hook wrappers. Scales to 2000+ usages across a monorepo by separating atoms (global vs remote-domain), selectors, and consumer hooks.

## When to Use

- React project using Recoil with 20+ atoms
- Multi-module/micro-frontend architecture needing shared state
- Want clean separation between global and domain-specific state

## Pattern

See `content.md` for full implementation.
