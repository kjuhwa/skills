---
name: copy-naming-suffix-numbered
category: decision
summary: |
  When duplicating user-named entities, append "- Copied (N)" with a monotonic counter, not a
  bare "- Copied" suffix. The numbered form disambiguates repeated copies without needing to
  inspect sibling names beyond one pass.
source:
  kind: project
  ref: lucida-snote
---

# Decision: copy-naming uses "- Copied (N)" rather than "- Copied"

## Fact
Duplicating a named entity (page, document, template) produces a new name of the form
`{original} - Copied (N)` where `N` is the smallest positive integer that makes the resulting name unique among siblings. A plain `- Copied` suffix is not used.

## Why
The first implementation used a bare `- Copied` suffix. Users who duplicated the same page multiple times ended up with `Foo - Copied`, `Foo - Copied - Copied`, `Foo - Copied - Copied - Copied` — names grew unboundedly and were hard to distinguish. The project explicitly switched to the numbered form so:

- Repeated copies are visually distinguishable at a glance (`Foo - Copied (1)`, `Foo - Copied (2)`).
- Name length stays bounded regardless of how many times the source is copied.
- Uniqueness can be computed in one sibling scan: strip the suffix pattern, find max N in use, pick N+1.

## How to apply
- Use this pattern consistently wherever the product clones user-named items (pages, blocks, databases, templates). Mixed conventions ("- Copy" here, "- Copied (N)" there) confuse users across surfaces.
- Compute the suffix against **siblings in the same container**, not globally. A copy named `Foo - Copied (3)` in folder A shouldn't reserve the number for folder B.
- Regex for detection: roughly `^(.*?)(?: - Copied(?: \((\d+)\))?)?$` — be careful to keep the base name when the source itself already contains ` - Copied (k)` so that re-copying `Foo - Copied (2)` produces `Foo - Copied (3)`, not `Foo - Copied (2) - Copied (1)`.
- Localize the `" - Copied"` token if the product is translated; keep the numeric suffix format identical across locales for programmatic parsing.
