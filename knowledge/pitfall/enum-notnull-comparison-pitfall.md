---
version: 0.1.0-draft
tags: [pitfall, enum, notnull, comparison]
name: enum-notnull-comparison-pitfall
description: In Java, comparing an enum field with `==` without a null guard NPEs on the left operand; prefer constant-on-the-left or an explicit @NotNull contract
category: pitfall
confidence: high
source:
  kind: project
  ref: lucida-realtime@336a1e2
---

# Enum `==` Comparison NPE

## Fact
`anEnum == SomeEnum.FOO` throws NPE if `anEnum` is null. The idiomatic safe form is either:
1. `SomeEnum.FOO == anEnum` — constant on the left, null-safe because `enumConst.equals(null)` is never called (it's identity `==`, but the left is guaranteed non-null).
2. Declare the field `@NotNull` and validate at the boundary (Bean Validation, or a guard in the setter/constructor).

Form 1 still NPEs on autoboxing contexts like `switch(anEnum)` — so declaring `@NotNull` is the robust fix.

## Why it bites
Enums feel safe. Developers skip null checks reflexively. The NPE appears in a distant call site — usually a Kafka listener or an event handler — and crashes the container, not just the request.

## Evidence
- Commit `f2c26cd` in lucida-realtime: "Enum 객체에 비교시 NotNull 선언 방식으로 변경을 통한 오류 수정" — switched enum fields to `@NotNull` declaration to remove NPE in the consumer path.

## How to apply
- On every message/event DTO with an enum field, add `@NotNull` and validate.
- In code review, flag `someEnum == ENUM_CONST` without a prior null check. Prefer Yoda form or `@NotNull` at the source.
- For `switch`: Java 21 pattern-matching `switch` handles null explicitly (`case null ->`) — use it instead of guarding externally.

## Counter / Caveats
- Yoda-form comparisons read oddly and tools like SonarQube may flag them — document the intent or prefer `@NotNull`.
- `@NotNull` is only enforced if validation actually runs (e.g. `@Valid` on the controller/consumer). Declaring it without enabling validation is decoration, not safety.
