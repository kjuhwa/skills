# Zustand Preset Manager (Named Configurations with Active Selection)

## Problem

Users want to save N named configurations (team comps, filter sets, dashboard layouts, form snapshots) to localStorage, pick an "active" one, and have it auto-load where relevant. You need:
- A cap (e.g. 5 presets) to prevent unbounded growth.
- Active-preset tracking that updates correctly when the active preset is deleted or renamed.
- Persistence across reloads without a backend round-trip.

## Pattern

A Zustand store with `persist` middleware holds:
- `presets: Preset[]` — array of `{ id, name, items }`.
- `activePresetId: string | null`.
- Mutator methods: `savePreset`, `updatePreset`, `deletePreset`, `setActive`, `getActive`.

Invariants enforced in mutators:
1. `savePreset` rejects when `presets.length >= MAX`.
2. `deletePreset` auto-selects the first remaining preset if the deleted one was active (or `null` if none left).
3. `getActive()` returns the full preset object, not just the id — callers always need the items.

## Example (sanitized)

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

interface Preset<T> {
  id: string;
  name: string;
  items: T[];
}

interface PresetState<T> {
  presets: Preset<T>[];
  activeId: string | null;
  savePreset: (name: string, items: T[]) => { ok: true; id: string } | { ok: false; reason: string };
  updatePreset: (id: string, patch: Partial<Pick<Preset<T>, 'name' | 'items'>>) => void;
  deletePreset: (id: string) => void;
  setActive: (id: string | null) => void;
  getActive: () => Preset<T> | null;
}

const MAX_PRESETS = 5;

export function createPresetStore<T>(storageKey: string) {
  return create<PresetState<T>>()(
    persist(
      (set, get) => ({
        presets: [],
        activeId: null,

        savePreset: (name, items) => {
          const { presets } = get();
          if (presets.length >= MAX_PRESETS) {
            return { ok: false, reason: `max ${MAX_PRESETS} presets` };
          }
          const id = nanoid();
          set({ presets: [...presets, { id, name, items }] });
          return { ok: true, id };
        },

        updatePreset: (id, patch) =>
          set(({ presets }) => ({
            presets: presets.map(p => p.id === id ? { ...p, ...patch } : p),
          })),

        deletePreset: (id) =>
          set(({ presets, activeId }) => {
            const remaining = presets.filter(p => p.id !== id);
            const nextActive = activeId === id
              ? (remaining[0]?.id ?? null)
              : activeId;
            return { presets: remaining, activeId: nextActive };
          }),

        setActive: (id) => set({ activeId: id }),

        getActive: () => {
          const { presets, activeId } = get();
          return presets.find(p => p.id === activeId) ?? null;
        },
      }),
      { name: storageKey }
    )
  );
}

// Usage
export const useTeamStore = createPresetStore<number>('app-team-presets');
```

Consumer component:

```tsx
function TeamSelector() {
  const presets = useTeamStore(s => s.presets);
  const activeId = useTeamStore(s => s.activeId);
  const setActive = useTeamStore(s => s.setActive);

  return (
    <select value={activeId ?? ''} onChange={e => setActive(e.target.value || null)}>
      <option value="">— no preset —</option>
      {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}
```

## When to use

- Any client-side preset/profile/filter/layout system.
- Settings that should survive reloads but don't need server sync.
- Features where users want to name and switch between saved states.

## When NOT to use

- Shared or team-wide presets — use a backend + user-scoped storage.
- Large or sensitive data — localStorage is plaintext and ~5 MB.
- You only need one saved state — use plain `persist` on the canonical store.

## Pitfalls

- **Selector granularity**: `useStore(s => s)` re-renders on every change. Subscribe to slices: `useStore(s => s.presets)`.
- **SSR**: `persist` touches localStorage at module load; wrap with `skipHydration` or `onRehydrateStorage` if hydrating on the server.
- **Storage key collisions**: apps with multiple preset stores need distinct `name` values or they overwrite each other.
- **Migration**: when you change the preset shape, add a `version` and `migrate` option to `persist`, or existing users get runtime errors.
- **Active-on-delete edge case**: if you forget to reselect when the active preset is deleted, `getActive()` returns `null` and the UI silently stops working — test this path explicitly.
