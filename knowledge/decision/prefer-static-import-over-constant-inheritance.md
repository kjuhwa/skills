---
version: 0.1.0-draft
name: prefer-static-import-over-constant-inheritance
category: decision
summary: "Access shared constants via `import static SomeConstants.*` instead of `extends SomeConstants` — inheritance for constants pollutes the single-inheritance slot, leaks protected visibility, and makes subclasses nonsensically \"is-a\" a constants bag."
scope: global
source:
  kind: project
  ref: lucida-widget@0e5d3fb
confidence: high
tags: [java, refactor, anti-pattern, constants]
---

# Prefer `import static` over `extends ConstantsClass`

## Fact
Using inheritance purely to access a bag of `public static final` constants (`class X extends StringConstant implements Y`) is an anti-pattern. The project converted 17 classes from `extends StringConstant` to `import static ...StringConstant.*;`.

## Why
- Inheritance for constants pollutes the class hierarchy and blocks extending a real parent later (Java is single-inheritance).
- Subclasses inadvertently "are-a" `StringConstant`, which is nonsense semantically.
- Requires constants to be `protected` (leakier than needed); converting to `public static` + static import lets callers opt in explicitly.

## How to apply
- When you see `extends SomeConstants`, replace with `import static com.x.SomeConstants.*;`.
- Flip constant visibility `protected → public` on the constants class.
- Convert any instance "helper" methods on the constants class into `public static` — they don't need state.
- Apply across DAO / Service / Util layers; BaseController-style inheritance for real behavior is still fine.

## Counter / Caveats
- If the "constants" class also holds genuine protected helpers that rely on subclass state, extract helpers to a separate util class first.
- Static imports can hurt readability when many are mixed in one file — group related constants into small cohesive classes.

## Evidence
- Commit `0e5d3fb` — "상수/설정 정리 (StringConstant 상속 제거, Kafka 토픽 상수 통합)".
- 17 classes converted across mongo/util (7), DAO (5), service (5) layers.
