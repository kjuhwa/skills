---
version: 0.1.0-draft
name: over-abstraction-strategy-pattern-for-single-use
summary: LLMs reach for Strategy / ABC / Config classes for single-use code (e.g., calculating one percentage discount). Prefer a single function until a second concrete variant actually exists.
category: pitfall
tags: [yagni, over-engineering, abstractions, design-patterns]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#simplicity-first-example-1
imported_at: 2026-04-18T08:26:22Z
---

# Pitfall — Strategy pattern for a single discount

## Symptom
Prompt: "Add a function to calculate discount."

LLM produces `DiscountStrategy(ABC)`, `PercentageDiscount`, `FixedDiscount`, `DiscountConfig`, `DiscountCalculator` — 30+ lines of setup for a single percentage calculation.

## Why it's wrong
Follows design-pattern *form* without the *need*. Every extra class is more surface area to test, document, and understand with zero current payoff.

## Better version
```python
def calculate_discount(amount: float, percent: float) -> float:
    """Calculate discount amount. percent should be 0-100."""
    return amount * (percent / 100)
```

## When to add complexity
- Not when you *might* need multiple discount types later.
- When a second concrete variant actually ships and the duplication is visible.
- Refactor then, not now.

## Rule of three
The third near-duplicate is the signal for abstraction. Not the first.
