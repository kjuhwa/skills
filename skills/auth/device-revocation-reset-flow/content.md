# Device revocation / account deletion reset flow

The invariant: a revoked device must end up in a clean signed-out state without data corruption or crash, *whether or not* PowerSync gets a chance to tell it first.

Two signal paths converge on the same reset:

## Signal A: token refresh HTTP codes

- **410 Gone** with `{ code: 'ACCOUNT_DELETED' }` → the user is gone on the backend.
- **403 Forbidden** with `{ code: 'DEVICE_DISCONNECTED' }` → this specific `X-Device-ID` is revoked.
- **409** with `{ code: 'DEVICE_ID_TAKEN' }` → another user registered the id; reset and mint a new one.

The PowerSync connector dispatches a `powersyncCredentialsInvalid` CustomEvent with a `reason` discriminator. Reset lives in a React hook, not the connector.

## Signal B: synced `devices` row

Watch the current device's row with React Query:

```ts
const { data = [], isFetched } = useQuery({
  queryKey: ['devices', deviceId],
  query: toCompilableQuery(getDevice(db, deviceId)),
})
```

When `data[0]?.revokedAt` becomes truthy, run the reset. This gives an *immediate* response as soon as the sync frame arrives; we don't have to wait for the next token refresh.

## The "device row missing" gotcha

If the backend deleted the user, PowerSync eventually syncs DELETE ops that erase the `devices` row. But on a brand-new app launch before the first sync completes, the row is *also* missing. Treating missing as revoked would wipe a legitimate user's data on a cold start.

Guard: track `hadDeviceOnceRef`. Only treat a missing device as "deleted elsewhere" if you previously saw the row in this session.

## The reset itself

```ts
const performCredentialsInvalidReset = async (redirectTo: string) => {
  await clearLocalData()          // setSyncEnabled(false) + localStorage.clear() + reset app dir
  window.location.replace(redirectTo)
}
```

`/account-deleted` for 410, `/` for 403.

## Why it must live inside AuthProvider, above the early return

```tsx
export const AuthProvider = ({ children }) => {
  usePowerSyncCredentialsInvalidListener()     // <- BEFORE the early return

  const value = useAuthValue()
  if (!value) return null                       // <- Would unmount the listener
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

When the account is deleted, sync wipes settings, cloudUrl disappears, and `useAuthValue()` returns null. If the listener were a child, unmount would stop it firing the reset. Placing it above the early return keeps it alive long enough to run.

## Evidence

- `src/hooks/use-powersync-credentials-invalid-listener.ts:1-113`
- `docs/powersync-account-devices.md:98-205`
