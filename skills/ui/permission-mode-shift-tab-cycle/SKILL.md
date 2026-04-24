---
name: permission-mode-shift-tab-cycle
description: Bind SHIFT+TAB at the chat input to cycle through permission modes (safe/ask/allow-all), show the current mode as a persistent indicator, and fire a change event so automations can react in real time.
category: ui
version: 1.0.0
version_origin: extracted
tags: [ux, permissions, keybindings, agent-ui]
confidence: medium
source_type: extracted-from-git
source_url: https://github.com/lukilabs/craft-agents-oss.git
source_ref: main
source_commit: 61f7d48a5b4fd0a8094f002c9e3aea5f3824dcfb
source_project: craft-agents-oss
source_path: README.md
imported_at: 2026-04-18T00:00:00Z
---

# SHIFT+TAB permission-mode cycle

## When to use
- Agent UI where users want to quickly escalate/de-escalate permissions mid-conversation.
- Claude Code-like mental model is already familiar to users.
- You need a keybinding that works when the chat input is focused without conflicting with tab-navigation.

## How it works
1. Single keybinding bound on the chat input: `Shift+Tab` -> `cyclePermissionMode()`.
2. Show a persistent indicator (color-coded) next to the input and in the session header: Explore (grey), Ask (amber), Execute (green).
3. On cycle, fire a `PermissionModeChange` event on the session event bus so automations / handlers react.
4. Store the new mode in the session header via debounced persistence queue.
5. Preserve the PREVIOUS mode (`previousPermissionMode` in session header) so "undo mode change" works.
6. Show a transient toast: "Mode: Ask -> Execute (SHIFT+TAB to cycle)".

## Example
```tsx
function ChatInput() {
  const [mode, setMode] = useAtom(permissionModeAtom);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      const next = cyclePermissionMode(mode);
      setMode(next);
      toast(`Mode: ${toCanonical(mode)} -> ${toCanonical(next)}`);
    }
  };
  return <>
    <ModeBadge mode={mode} />
    <textarea onKeyDown={onKeyDown} />
  </>;
}
```

## Gotchas
- Browsers default Shift+Tab to "move focus backward" - you MUST `preventDefault` on the textarea, or focus jumps.
- Accessibility: users on keyboard navigation need an alternate escape hatch; add a menu item / command palette entry.
- The badge colors should be consistent across light/dark themes; bake them into the design token system.
- When permission mode drops (Ask -> Explore), consider canceling in-flight tool calls that the new mode would block - otherwise users get confused mid-stream.
- Log mode changes for audit - "how did I end up in Execute?" is a common debug question.
