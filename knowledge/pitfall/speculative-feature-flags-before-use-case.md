---
version: 0.1.0-draft
name: speculative-feature-flags-before-use-case
summary: "Save preferences" becomes a PreferenceManager with cache, validator, merge, notify options. Every unused flag is speculative complexity — write only what was asked and add the rest when a real requirement appears.
category: pitfall
tags: [yagni, speculative-features, over-parameterization]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/forrestchang/andrej-karpathy-skills.git
source_ref: main
source_commit: c9a44ae835fa2f5765a697216692705761a53f40
source_project: andrej-karpathy-skills
source_path: EXAMPLES.md#simplicity-first-example-2
imported_at: 2026-04-18T08:26:22Z
---

# Pitfall — Speculative feature flags

## Symptom
Prompt: "Save user preferences to database."

LLM delivers a `PreferenceManager` class with `cache`, `validator`, `merge=True`, `validate=True`, `notify=False` parameters and a `notify_preference_change` method. None of those were requested.

## Better version
```python
def save_preferences(db, user_id: int, preferences: dict):
    db.execute(
        "UPDATE users SET preferences = ? WHERE id = ?",
        (json.dumps(preferences), user_id),
    )
```

## Add later, not now
- **Caching** — add when performance measurably hurts.
- **Validation** — add when bad data actually appears.
- **Merging** — add when a partial-update requirement arrives.
- **Notifications** — add when a consumer needs change events.

## Cost of premature flags
Each parameter becomes a test matrix, a documentation burden, and a decision point at every call site. Unused flags are pure liability.
