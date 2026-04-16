---
name: api-versioning-implementation-pitfall
description: Common traps when building api-versioning demos — field-rename vs field-add confusion, risk-score weighting, and sunset semantics
category: pitfall
tags:
  - api
  - auto-loop
---

# api-versioning-implementation-pitfall

The biggest trap in a diff simulator is treating a **rename as add+remove**. When v1 has `user_id` and v2 has `userId`, the naive `Object.keys` set-diff emits two notes: "Removed: user_id" and "Added: userId", which inflates the risk score and hides the actual semantic (a breaking rename). Either match by lowercase/camelCase-normalized key, or maintain an explicit rename map in the schema registry. Also beware of **nested object diffs** — `JSON.stringify` equality flags an entire nested object as "Changed" even if a single leaf differs, so you lose granularity on objects like `{total:4200,currency:"USD"}`.

Risk-score weighting is easy to get backward. Removed fields (`*2`) must outweigh modified (`*1`) because removal is always breaking while modification is often compatible (e.g. widening an enum, adding precision). Added fields should contribute **zero** to the score — new optional fields are backward-compatible for consumers. If you count adds, upgrading to v3 always looks risky even when it's purely additive, which defeats the tool.

For the traffic monitor, don't let `sunset` versions silently succeed. Real sunset APIs return 410 Gone — if your simulator serves 200 OK for a sunset version, viewers won't see why migration matters. Conversely, do *not* return 410 for `deprecated` — deprecated still works, it just warns. Mixing these two states is the most common conceptual error and collapses the four-state lifecycle (beta/stable/deprecated/sunset) into a meaningless two-state on/off.
