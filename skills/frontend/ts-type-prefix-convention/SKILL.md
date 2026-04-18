---
tags: [frontend, type, prefix, convention]
name: ts-type-prefix-convention
description: Prefix interfaces with I and type aliases with T; use type for unions/literals and interface for inheritable shapes
source_project: lucida-builder-r3
version: 1.0.0
category: frontend
---

# TS type prefix & interface-vs-type

## Trigger
- Declaring a TypeScript `interface` or `type`.
- Reviewing a PR that adds types without prefixes.

## Steps
1. `interface Foo` → rename to `interface IFoo`.
2. `type Foo` → rename to `type TFoo`.
3. If it is a union, literal, or tuple → always `type`.
4. If it needs to be extended/implemented → `interface`.
5. Co-locate props types in the component file (under imports, above the component); co-locate shared folder types in `types.ts`; hoist project-wide types to `src/types/`.
6. For styled-components props, inline the generic on the styled call — do not export a separate props type.
