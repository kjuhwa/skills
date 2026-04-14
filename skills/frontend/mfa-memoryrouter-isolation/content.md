# MFA MemoryRouter Isolation

## Problem

When a Module Federation remote exposes a React component that uses `useNavigate`, `Link`, or other router hooks, rendering it inside a host that:

- Runs on a different dev-server origin (e.g. host:3000, remote:3019), or
- Doesn't wrap the insertion point in a Router

throws `useNavigate() may be used only in the context of a <Router>` or triggers a cross-origin browser history sync error. Using `BrowserRouter` inside the expose would fight the host for the real URL.

## Pattern

Wrap the exposed component in `MemoryRouter` inside its expose file:

```tsx
// remote/src/remote-components/exposes/FooPanel.tsx
import FooPanel from '../../layout/FooPanel'
import { MemoryRouter } from 'react-router-dom'

const Component = (props: any) => (
  <MemoryRouter>
    <FooPanel {...props} />
  </MemoryRouter>
)
export default Component
```

`MemoryRouter` keeps its own in-memory history — routing inside the panel works, but never touches `window.location`.

## When to use MemoryRouter vs. host router

- **MemoryRouter** (recommended for MFA): internal routing stays local. Cross-origin safe. Panel is self-contained.
- **withRouter / shared Router**: only if the remote genuinely participates in the host URL — and both are served from the same origin. Heavyweight, couples routing semantics.

## Navigation out of the panel

Inside a `MemoryRouter`-wrapped expose, you still sometimes need to navigate the host (e.g. "open full dashboard"). `useNavigate` won't help — it only moves the in-memory history. Use explicit full navigation:

```tsx
window.location.href = '/widget/main'       // same-tab
window.open('/widget/main', '_blank')       // new tab
```

## Pitfalls

- Placing `MemoryRouter` at the wrong layer (e.g. inside a child of the exposed component instead of wrapping it) means the top-level hooks still run outside a Router.
- Using `BrowserRouter` instead: two routers fighting for `window.location` causes URL flicker and history corruption.
- Forgetting that links/redirects inside MemoryRouter are dead ends for the host — surface explicit "open in host" buttons using `window.location.href`.
