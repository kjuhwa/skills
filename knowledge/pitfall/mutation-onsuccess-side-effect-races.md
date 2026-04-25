---
version: 0.1.0-draft
name: mutation-onsuccess-side-effect-races
summary: Putting both state-switch and navigate() in a mutation's onSuccess causes flash-and-jump races; let the UI layer own the side-effect sequence in one microtask.
category: pitfall
tags: [react-query, mutations, side-effects, race-condition, ux]
confidence: high
source_type: extracted-from-git
source_url: https://github.com/multica-ai/multica.git
source_ref: main
source_commit: 6cd49e132de7632b1f2aaa675c98e8eca9308bb7
source_project: multica
source_path: HANDOFF_ARCHITECTURE_AUDIT.md
imported_at: 2026-04-18T00:00:00Z
---

Symptom: after "Create Workspace" completes, the app flashes `/issues` for one frame before jumping to `/onboarding`. Root cause: two `onSuccess` callbacks race:
- `useCreateWorkspace.onSuccess` → `switchWorkspace(newWs)` → Zustand updates → `/issues` route renders once.
- Modal's own `onSuccess` → `router.push("/onboarding")` → async-schedule navigation.

The first is synchronous state update; the second is async navigation. `/issues` always wins one render before `/onboarding` pushes.

## Why

Fix by pulling side effects out of the mutation into the UI layer so they execute in the same microtask:

```tsx
function CreateWorkspaceModal() {
  const createWs = useCreateWorkspace();
  return <Button onClick={async () => {
    const ws = await createWs.mutateAsync({ name, slug });
    switchWorkspace(ws);
    navigate.push('/onboarding');    // same microtask, no flash
  }} />;
}
```

Same class of bug shows up on workspace delete (no auto-nav after delete) and accept-invite (two acceptance paths, one missing the switch). Root cure is the URL-based workspace identity refactor — switching becomes pure `<Link>` navigation, no `switchWorkspace` function exists, no race possible.

## Evidence

- `HANDOFF_ARCHITECTURE_AUDIT.md` Task 4 — three specific bugs tied to this pattern.
- `packages/core/workspace/mutations.ts` — cleaned-up mutation without side effects.
