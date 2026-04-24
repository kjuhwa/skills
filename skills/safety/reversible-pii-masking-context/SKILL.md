---
name: reversible-pii-masking-context
description: Replace sensitive identifiers with stable placeholders before LLM calls and reverse-map them on the way out, using a per-investigation context that survives node-to-node state transitions in a graph pipeline.
category: safety
version: 1.0.0
version_origin: extracted
tags: [masking, pii, llm, reversible, langgraph]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/Tracer-Cloud/opensre.git
source_ref: main
source_commit: fb5ba0a1b4ef511d16c56a80f1f126b1f581d724
source_project: opensre
source_path: app/masking/context.py
imported_at: 2026-04-18T00:00:00Z
---

# Reversible PII Masking Context

## When to use
You need to send logs/evidence to an LLM but must keep raw identifiers (pod names, namespaces, IPs, account IDs, emails) out of the prompt. After the LLM responds, you want the original identifiers restored in the output so users still see real names. The placeholder map needs to survive across multiple LangGraph nodes.

## How it works
- A `MaskingContext` carries a placeholder map (`<NS_0> -> "kube-system"`) plus a counter per identifier kind so successive calls reuse the same placeholder for the same value.
- `mask_value` recurses into dicts/lists/tuples; same for `unmask_value`.
- `MaskingContext.from_state(state)` reconstructs the context from `state["masking_map"]`; `to_state()` serializes it back. Each node masks evidence before LLM input, then unmasks the LLM's output before storing it back to state.
- A regex-based `MaskingPolicy` (built from env vars per-investigation, no singleton) decides which identifier kinds are enabled.

## Example
```python
class MaskingContext:
    @classmethod
    def from_state(cls, state):
        policy = MaskingPolicy.from_env()
        existing = state.get("masking_map") or {}
        return cls(policy=policy, placeholder_map=dict(existing))

    def _ensure_placeholder(self, kind, value):
        if value in self._reverse_map:
            return self._reverse_map[value]
        index = self._counters.get(kind, 0)
        self._counters[kind] = index + 1
        placeholder = f"<{kind.upper()}_{index}>"
        self._placeholder_map[placeholder] = value
        self._reverse_map[value] = placeholder
        return placeholder

    def mask_value(self, value):
        if isinstance(value, str):  return self.mask(value)
        if isinstance(value, dict): return {k: self.mask_value(v) for k, v in value.items()}
        if isinstance(value, list): return [self.mask_value(v) for v in value]
        return value

# Usage in a node:
masking_ctx = MaskingContext.from_state(dict(state))
masked_evidence = masking_ctx.mask_value(evidence)
result["masking_map"] = masking_ctx.to_state()
# ...later, on LLM output:
display_root_cause = masking_ctx.unmask(llm_response)
```

## Gotchas
- Apply replacements in **reverse order of position** so earlier indices stay valid.
- Resolve overlapping detector matches by keeping the longest/earliest one — overlapping spans corrupt the output.
- Build the policy fresh per investigation (`MaskingPolicy.from_env()`) so toggling env vars between calls works without restarting the process.
- Compile extra regex patterns once per context, not per `mask()` call.
