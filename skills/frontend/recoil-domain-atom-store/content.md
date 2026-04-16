## Directory Structure

```
shared/store/
├── atom/
│   ├── global/                    # App-wide state
│   │   ├── userAtom.ts            # Login user & profile
│   │   ├── dateAtom.ts            # Global timestamp
│   │   ├── filterAtom.ts          # Search filter state
│   │   ├── gridAtom.ts            # Grid configuration
│   │   ├── modalAtom.ts           # Modal open/close
│   │   ├── menuAtom.ts            # Menu selection
│   │   ├── breadcrumbAtom.ts      # Navigation breadcrumbs
│   │   ├── localeMessageAtom.ts   # i18n messages
│   │   ├── actionDispatchAtom.ts  # Refresh triggers (counter-based)
│   │   ├── screenSizeAtom.ts      # Responsive breakpoints
│   │   └── refreshAtom.ts         # Generic refresh triggers
│   ├── app/
│   │   └── layoutAtom.ts          # Layout metadata + menu collapse
│   └── remote/                    # Domain-scoped state
│       ├── apm/detail.ts, summary.ts
│       ├── dpm/main.ts, timeRange.ts
│       ├── alarm/main.ts
│       ├── kcm/main.ts
│       ├── widget/main.ts
│       └── [domain]/main.ts
└── hook/                          # Typed consumer hooks
    ├── useTimeSelector.ts
    ├── useDashboardFilter.ts
    └── filterHook.ts
```

## Pattern 1: Global Atom

```typescript
// shared/store/atom/global/actionDispatchAtom.ts
import { atom } from 'recoil'

export const actionDispatchAtom = atom<number>({
  key: 'actionDispatchAtom',
  default: 0,
})
```

## Pattern 2: Domain Atom with Persistence

```typescript
// shared/store/atom/app/layoutAtom.ts
import { atom, selector } from 'recoil'

export const menuCollapsedAtom = atom<boolean>({
  key: 'menuCollapsedAtom',
  default: sessionStorage.getItem('menuCollapsed') === 'true',
})

export const alarmCollapsedAtom = atom<Record<string, boolean>>({
  key: 'alarmCollapsedAtom',
  default: {},
})

// Derived state via selector
export const alarmCollapsedSelector = selector({
  key: 'alarmCollapsedSelector',
  get: ({ get }) => {
    const collapsed = get(alarmCollapsedAtom)
    return (domain: string) => collapsed[domain] ?? false
  },
})
```

## Pattern 3: Hook Wrapper

```typescript
// shared/store/hook/useTimeSelector.ts
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'
import { timeRangeAtom, showTimeSelectorAtom } from '../atom/remote/dpm/timeRange'

const useTimeSelector = () => {
  const modeTime = useRecoilValue(timeRangeAtom)
  const setModeTime = useSetRecoilState(timeRangeAtom)
  const resetModeTime = () => setModeTime(defaultTimeRange)
  const isShowTimeSelector = useRecoilValue(showTimeSelectorAtom)
  const setIsShowTimeSelector = useSetRecoilState(showTimeSelectorAtom)

  return {
    modeTime,
    setModeTime,
    resetModeTime,
    isShowTimeSelector,
    setIsShowTimeSelector,
  }
}

export default useTimeSelector
```

## Pattern 4: Counter-Based Refresh Trigger

```typescript
// Usage: increment atom to trigger dependent useEffect
const useActionDispatch = () => {
  const setDispatch = useSetRecoilState(actionDispatchAtom)
  const reload = () => setDispatch((prev) => prev + 1)
  return { reload }
}

// Consumer
const Component = () => {
  const refreshState = useRecoilValue(actionDispatchAtom)
  useEffect(() => {
    fetchData()
  }, [refreshState])
}
```

## Key Design Decisions

1. **Global vs Remote separation** — global atoms for cross-cutting concerns, remote atoms scoped to feature domains
2. **Hook wrappers** — typed hooks hide atom internals, expose clean API
3. **Counter-based refresh** — simple `atom<number>` with increment for triggering re-fetches without event buses
4. **SessionStorage backing** — UI layout state persisted across page refreshes via sessionStorage defaults
5. **Selector for derived state** — function-returning selectors for parameterized lookups (e.g., `(domain) => boolean`)
