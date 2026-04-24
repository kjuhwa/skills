---
name: contextual-identifier-detectors-overlap-resolution
description: Detect sensitive identifiers (pods, namespaces, IPs, emails, accounts) using context-anchored regex (e.g. preceded by "namespace=") and resolve overlapping matches by keeping the longest earliest one to avoid corrupting splice replacements.
category: safety
version: 1.0.0
version_origin: extracted
tags: [regex, masking, identifiers, kubernetes, infrastructure]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/masking/detectors.py
imported_at: 2026-04-18T00:00:00Z
---

# Contextual Identifier Detectors with Overlap Resolution

## When to use
You need regex detectors for infrastructure identifiers but generic words like `frontend` or `worker` should NOT match. Anchoring to a label like `namespace=foo` or `kube_cluster:bar` and capturing only group(1) is the trick. Then you must resolve overlaps before splicing replacements into the source string.

## How it works
- Each detector is a `re.Pattern` anchored on the identifier label (`namespace`, `cluster`, `service`).
- The capture group(1) holds just the value, so the label is preserved.
- `_resolve_overlaps` sorts matches by `(start ASC, length DESC)` and drops any candidate whose span shares a single character with an already-kept match. Required because reverse-order splicing corrupts when spans overlap.

## Example
```python
_NAMESPACE_RE = re.compile(
    r"\b(?:kube_namespace|namespace|ns)[=:\s]+([a-z0-9][-a-z0-9]*)\b",
    re.IGNORECASE,
)
_CLUSTER_RE = re.compile(
    r"\b(?:kube_cluster|eks_cluster|cluster(?:_name)?)[=:\s]+"
    r"([a-zA-Z0-9][-a-zA-Z0-9_]{1,})\b", re.IGNORECASE,
)

def _resolve_overlaps(matches):
    by_start = sorted(matches, key=lambda m: (m.start, -(m.end - m.start)))
    result = []
    for m in by_start:
        if any(
            kept.start < m.end and kept.end > m.start and kept is not m
            for kept in result
        ):
            continue
        result.append(m)
    return sorted(result, key=lambda m: m.start)
```

## Gotchas
- For DNS-style hostnames, exclude `.` from the inner character class so the outer `(?:\.LABEL)*` cannot backtrack exponentially (CodeQL ReDoS).
- Account ID detectors `\b\d{12}\b` will catch any 12-digit number — pair with policy gating so you can opt out per environment.
- When two detectors match overlapping regions, pick the longest. `[KIND_0]` placeholder for the inner span will mangle output if the outer span is replaced first.
