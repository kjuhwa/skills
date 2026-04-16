## Architecture

Three-layer loading stack:

```
RemoteApp (consumption layer)
  └─ FederatedComponent (loading UI layer)
       └─ useFederatedComponent (script loading + caching hook)
```

## Layer 1: useFederatedComponent Hook

Core hook that handles dynamic script loading with retry and caching.

```typescript
// shared/hooks/useFederatedComponent.tsx
const componentCache = new Map<string, { Component: React.LazyExoticComponent<any> }>()
const urlCache = new Set<string>()

const loadComponent = (scope: string, module: string, remoteUrl: string) => {
  return async () => {
    await __webpack_init_sharing__('default')
    const MAX_RETRIES = 5
    let retries = 0

    const loadRemoteScript = async () => {
      return new Promise<void>((resolve, reject) => {
        // Skip if script already loaded
        if (urlCache.has(remoteUrl)) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = remoteUrl
        script.async = true
        script.onload = () => {
          urlCache.add(remoteUrl)
          resolve()
        }
        script.onerror = () => {
          // Clean up stale scope on failure
          if (window[scope] != null) delete window[scope]
          reject(new Error(`Failed to load remote module at ${remoteUrl}`))
        }
        document.head.appendChild(script)
      })
    }

    while (!window[scope] && retries < MAX_RETRIES) {
      try {
        await loadRemoteScript()
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (e) {
        retries++
      }
    }

    if (!window[scope]) {
      throw new Error(`Remote scope ${scope} not available after ${MAX_RETRIES} retries`)
    }

    const container = window[scope]
    await container.init(__webpack_share_scopes__.default)
    const factory = await container.get(module)
    return factory()
  }
}

export function useFederatedComponent(remoteUrl: string, scope: string, module: string) {
  const cacheKey = `${remoteUrl}-${scope}-${module}`

  const [Component, setComponent] = useState<React.LazyExoticComponent<any> | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (componentCache.has(cacheKey)) {
      setComponent(componentCache.get(cacheKey)!.Component)
      return
    }

    try {
      const LazyComponent = React.lazy(loadComponent(scope, module, remoteUrl))
      componentCache.set(cacheKey, { Component: LazyComponent })
      setComponent(LazyComponent)
    } catch (e) {
      setError(e as Error)
    }
  }, [cacheKey])

  return { Component, error }
}
```

## Layer 2: FederatedComponent

Loading UI wrapper with Suspense and error fallback.

```tsx
// shared/components/remote/FederatedComponent.tsx
interface FederatedComponentProps {
  url: string
  scope: string
  module: string
  [key: string]: any
}

const FederatedComponent: React.FC<FederatedComponentProps> = ({
  url, scope, module, ...rest
}) => {
  const { Component, error } = useFederatedComponent(url, scope, module)

  if (error) return <ErrorFallback error={error} />
  if (!Component) return <ModuleLoader />

  return (
    <Suspense fallback={<ModuleLoader />}>
      <Component {...rest} />
    </Suspense>
  )
}
```

## Layer 3: RemoteApp

Consumption layer that resolves remote URLs from config.

```tsx
// shared/components/remote/RemoteApp.tsx
interface RemoteAppProps {
  appInfo: [string, string]  // [remoteName, componentName]
  [key: string]: any
}

const RemoteApp: React.FC<RemoteAppProps> = ({ appInfo, ...rest }) => {
  const [remoteName, componentName] = appInfo

  let baseUrl = RemoteAppInfoUtil.readUrl(remoteName)

  if (process.env.NODE_ENV === 'development') {
    const remoteEntryUrl = nfEnv.env.remoteEntryUrl[remoteName]
    if (remoteEntryUrl === '') {
      const port = nfEnv.env.remotePort[remoteName]
      baseUrl = `${window.location.protocol}//${window.location.hostname}:${port}`
    }
  }

  const remoteEntryPoint = `${baseUrl}/${remoteName}RemoteEntry.js`

  return (
    <FederatedComponent
      module={`./${componentName}`}
      scope={remoteName}
      url={remoteEntryPoint}
      {...rest}
    />
  )
}
```

## Consumption Example

```tsx
// host/src/remote-components/apm/ApmHome.tsx
import RemoteApp from '@shared/components/remote/RemoteApp'
import { MF_NAME_APM, MF_APM_HOME } from '@shared/types/remoteAppProps'

export default () => (
  <RemoteApp appInfo={[MF_NAME_APM, MF_APM_HOME]} />
)
```

## Key Design Decisions

1. **Component caching via Map** — prevents re-instantiation of lazy components on re-render
2. **URL deduplication via Set** — avoids injecting duplicate `<script>` tags
3. **5-retry with 1s delay** — handles transient network failures without infinite loops
4. **Scope cleanup on failure** — `delete window[scope]` prevents stale partial loads
5. **Config-driven URLs** — remote URLs from JSON config enable multi-environment support (dev ports, prod URLs)
