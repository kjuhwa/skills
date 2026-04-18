---
version: 0.1.0-draft
name: object-storage-implementation-pitfall
description: Common mistakes when modeling object storage semantics in visualizations and simulators
category: pitfall
tags:
  - object
  - auto-loop
---

# object-storage-implementation-pitfall

The most frequent bug is treating object storage as a filesystem. There are no directories — `photos/` is not an entity, it's a derived prefix that disappears when the last object under it is deleted. Tools that cache "folder" nodes and forget to evict them on DELETE end up showing phantom folders that don't exist in the backing store. Similarly, "rename" is not an atomic operation: it's COPY + DELETE, which charges Class-A requests on the source, Class-A on the destination, and doubles storage temporarily. Cost simulators that model rename as free dramatically understate bulk-reorganization costs.

Consistency semantics are another trap. S3 has been strongly read-after-write consistent since December 2020, but list-after-write and cross-region replication are still eventually consistent — a replicated object may return 404 on the destination for seconds to minutes. Visualizations that show replication as instantaneous mislead users about RPO planning. Versioning adds a further layer: a DELETE on a versioned bucket creates a delete marker (billed as a tiny object), and noncurrent versions continue accruing storage charges until a lifecycle rule expires them. Simulators that ignore delete markers and noncurrent versions routinely underestimate storage bills by 20–40% on write-heavy workloads.

Finally, watch for early-deletion and minimum-storage-duration fees on IA/Glacier tiers (30/90/180 days depending on tier). A lifecycle rule that transitions objects to Glacier and then deletes them after 60 days actually costs *more* than leaving them in Standard, because the Glacier minimum-duration fee still applies. Cost simulators must encode these minimum-duration charges and retrieval fees (including per-GB retrieval cost and per-request retrieval cost, which differ between Expedited/Standard/Bulk tiers) or they will recommend lifecycle configurations that increase spend.
