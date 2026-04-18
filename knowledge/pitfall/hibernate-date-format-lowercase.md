---
name: hibernate-date-format-lowercase
version: 0.1.0-draft
tags: [pitfall, hibernate, date, format, lowercase]
category: pitfall
summary: Use lowercase `yyyy` for calendar year — `YYYY` is ISO week-year and produces wrong values near Jan 1 / Dec 31
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: high
---

# Date Format: yyyy vs YYYY

## Fact
In Java `SimpleDateFormat` / `DateTimeFormatter` and in many DB date-format functions, `yyyy` means calendar year while `YYYY` means ISO week-based year. The two differ for dates in the last days of December or first days of January, producing values that are off by one year.

## Why
ISO week-year is defined so every week belongs to exactly one year, which forces the boundary weeks of December/January to borrow from the adjacent year. Most application code wants calendar year.

## How to apply
- Default to lowercase `yyyy` everywhere; only use `YYYY` when you explicitly need ISO week-year.
- Grep existing patterns before adding new ones; one bad format string tends to propagate via copy-paste.
- Add a unit test with a date in late December and early January to catch this in review.
