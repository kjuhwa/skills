---
name: object-storage-visualization-pattern
description: Three complementary visualization strategies for bucket/object hierarchies in object-storage UIs.
category: design
triggers:
  - object storage visualization pattern
tags:
  - auto-loop
version: 1.0.0
---

# object-storage-visualization-pattern

Object storage data has a natural two-level hierarchy — buckets containing objects with size metadata — that maps well to three distinct visualization modes. The **galaxy/particle** approach renders each object as a Canvas circle orbiting its bucket center, with radius proportional to object size and per-bucket color coding from a shared palette (`#6ee7b7`, `#7dd3fc`, `#fbbf24`, `#f87171`, `#c084fc`). Bucket centers are evenly distributed horizontally (`cx = W * (0.2 + bucketIndex * 0.15)`), and each object animates along a circular orbit with individual angular velocity and a `Math.sin`-based pulsing effect. Hover detection uses Euclidean distance to the nearest object. This mode excels at conveying relative cluster density and giving a dashboard-style ambient view. The **treemap** approach uses CSS Grid with column widths proportional to each bucket's total size (`gridTemplateColumns` computed as `fr` units from size ratios, with a `Math.max(w*100, 10)` floor). Clicking a bucket drills down to a square grid of its objects (`cols = Math.ceil(Math.sqrt(n))`), each cell showing a colored accent bar, formatted size, and percentage. Breadcrumb navigation returns to root. This mode is strongest for understanding relative storage distribution at a glance.

The **terminal/CLI** approach emulates an S3-like command interface (`ls`, `put`, `get`, `rm`, `mb`, `rb`, `stat`) operating on a mutable nested-object store (`store[bucket][key] = {size, date}`). Output lines are color-coded by severity (ok/err/info/dim). Arrow-key history navigation tracks an index into a command array with an out-of-bounds sentinel for the "empty input" state. This mode suits power users who need CRUD operations and scriptable exploration. All three share a dark theme (`bg: #0f1117`, text: `#c9d1d9`, panels: `#1a1d27`, borders: `#2a2d37`), the same `fmt(kb)` size-formatting function (`kb >= 1024 ? (kb/1024).toFixed(1) + ' MB' : kb + ' KB'`), and a consistent bucket-centric data model. The pattern generalizes: pick galaxy for monitoring dashboards, treemap for capacity planning views, and terminal for admin tooling — all backed by the same underlying bucket/object data shape.
