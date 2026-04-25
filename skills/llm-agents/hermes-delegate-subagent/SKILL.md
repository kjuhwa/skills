---
name: hermes-delegate-subagent
description: Spawn child LLM agents with restricted toolsets, isolated context, and summary-only parent feedback.
category: llm-agents
version: 1.0.0
version_origin: extracted
tags: [llm-agents, subagent, delegation, parallelism, context-isolation]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/NousResearch/hermes-agent.git
source_ref: main
source_commit: 73bccc94c7af3a07b4002c2a14a4b54f844bd561
source_project: hermes-agent
imported_at: 2026-04-18T00:00:00Z
---

# LLM Delegation — Isolated Subagents

## Context

Putting every intermediate tool call into the parent's transcript balloons context and slows responses. Delegating focused work to a child agent lets the parent see only the final summary while the child bears the full fan-out.

## When to use

- Parent needs to parallelize N independent search/analysis tasks.
- You want a clear scope boundary — child can't accidentally touch parent's memory, send messages, or recurse.
- Token-heavy subtasks (browse → extract → summarize) should collapse into one compact result turn.

## Procedure

### 1. Bound recursion depth

`MAX_DEPTH = 2` means parent (depth 0) → child (depth 1) → grandchild REJECTED. See `tools/delegate_tool.py:53`. Without this, a buggy prompt can recursively delegate until the thread pool starves.

### 2. Strip tools the child must never have

```python
DELEGATE_BLOCKED_TOOLS = frozenset([
    "delegate_task",   # no recursive delegation
    "clarify",         # no user interaction
    "memory",          # no writes to shared MEMORY.md
    "send_message",    # no cross-platform side effects
    "execute_code",    # force step-by-step reasoning in children
])
```

(`tools/delegate_tool.py:31-39`)

Build the advertised toolset list by excluding composite/platform toolsets (`hermes-*` prefix) and scenario toolsets:

```python
_EXCLUDED_TOOLSET_NAMES = {"debugging", "safe", "delegation", "moa", "rl"}
_SUBAGENT_TOOLSETS = sorted(
    name for name, defn in TOOLSETS.items()
    if name not in _EXCLUDED_TOOLSET_NAMES
    and not name.startswith("hermes-")
    and not all(t in DELEGATE_BLOCKED_TOOLS for t in defn.get("tools", []))
)
```

### 3. Build a focused child system prompt

Children get a tight system prompt — no SOUL.md, no memory injection:

```python
def _build_child_system_prompt(goal, context=None, workspace_path=None):
    parts = [
        "You are a focused subagent working on a specific delegated task.",
        f"YOUR TASK:\n{goal}",
    ]
    if context:
        parts.append(f"CONTEXT:\n{context}")
    if workspace_path:
        parts.append(f"WORKSPACE PATH:\n{workspace_path}\nUse this exact path...")
    parts.append(
        "Complete this task. When finished, summarize:\n"
        "- What you did\n- What you found\n"
        "- Any files you created or modified\n"
        "- Any issues encountered\n"
        "Never assume /workspace/... unless the task gives that path."
    )
    return "\n".join(parts)
```

(`tools/delegate_tool.py:90-122`)

Injecting a **concrete absolute workspace path** (only when verified real) prevents subagents from hallucinating `/workspace/repo` container paths that don't exist on the host.

### 4. Cap concurrent children

```python
_DEFAULT_MAX_CONCURRENT_CHILDREN = 3

def _get_max_concurrent_children() -> int:
    cfg = _load_config()
    val = cfg.get("max_concurrent_children")
    if val is not None:
        return max(1, int(val))
    env_val = os.getenv("DELEGATION_MAX_CONCURRENT_CHILDREN")
    if env_val:
        return max(1, int(env_val))
    return _DEFAULT_MAX_CONCURRENT_CHILDREN
```

Config precedence: `config.yaml` > env > default (3). Running 20 children in parallel is almost always worse than 3 because of rate limits and tool-pool starvation.

### 5. Relay progress without leaking transcripts

The child's tool progress callback batches tool names (5 at a time) and forwards them to the parent's callback — the parent only sees `"[1] running browser_navigate..."`, never the child's reasoning or tool results (`tools/delegate_tool.py:158-201`).

### 6. Each child gets its own `task_id`

A unique `task_id` gives each child its own terminal session, file-ops cache, and process-registry scope. This is what keeps parallel children from stepping on each other's `terminal()` state.

## Pitfalls

- **Don't let children share memory.** A child that can call `memory()` will happily rewrite the parent's persistent memory mid-task, causing race conditions and making traces non-reproducible.
- **Don't skip the depth guard.** Without `MAX_DEPTH`, one mistake in the parent's planning prompt causes fan-out denial-of-service.
- **Parent process-global state leaks.** Hermes notes that `_last_resolved_tool_names` in `model_tools.py` must be saved/restored around child runs (`AGENTS.md` pitfalls section). Watch for similar globals in your own codebase.
- **Summary-only means summary.** If the child fails silently, the parent sees nothing. Structure the child's concluding prompt with explicit "What you did / What failed" sections and log full child transcripts for audit elsewhere.
