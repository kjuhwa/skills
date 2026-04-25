---
version: 0.1.0-draft
name: runtime-mode-approval-policy-and-sandbox-mode
summary: T3 Code has a global runtime mode that controls whether commands need approval and what filesystem access is allowed
type: knowledge
category: api
confidence: high
tags: [api, safety, design]
source_type: extracted-from-git
source_url: https://github.com/pingdotgg/t3code.git
source_ref: main
source_commit: 9df3c640210fecccb58f7fbc735f81ca0ee011bd
source_project: t3code
imported_at: 2026-04-18
evidence:
  - .docs/runtime-modes.md
  - packages/contracts/src/orchestration.ts
---

## Fact
T3 Code's runtime mode is a UI switch in the chat toolbar. It controls two settings for new sessions:
1. **approvalPolicy: "never" vs "on-request"** — whether provider commands (shell, file write) need in-app approval
2. **sandboxMode: "danger-full-access" vs "workspace-write"** — what filesystem paths the agent can touch

Full access (default): `approvalPolicy: never`, `sandboxMode: danger-full-access`. Supervised: `approvalPolicy: on-request`, `sandboxMode: workspace-write`.

## Why it matters
1. **User safety** — in Supervised mode, agents can't delete system files or run arbitrary shell; human must approve each command
2. **Iteration speed** — Full access lets agents work uninterrupted; useful for trusted environments or disposable sandboxes
3. **Audit trail** — approvals are recorded as activities, showing who approved what
4. **Per-session control** — mode is set when session is created; can't change mid-turn (forces new session)

## Evidence
- Runtime modes doc lists approvalPolicy values and sandboxMode values
- Contracts define these as session properties
- ProviderCommandReactor checks approval policy before executing commands
- Runtime modes doc states these are the main values; extensibility path exists

## How to apply
- When creating a session (thread), pass the global runtime mode setting to provider
- In approval handling, read `session.approvalPolicy`; if "on-request", add command to pending approval queue before executing
- UI shows pending approvals as a list; user clicks to approve/deny
- If user denies, emit an activity record and skip execution
- Document that mode is global (not per-thread) and persisted in user settings
