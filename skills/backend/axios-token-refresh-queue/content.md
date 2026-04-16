## Implementation

```typescript
// shared/apis/request.ts

// Window-scoped state to coordinate refresh across micro-frontends
declare global {
  interface Window {
    __isTokenRefreshing: boolean
    __refreshSubscribers: ((token: string) => void)[]
  }
}

window.__isTokenRefreshing = false
window.__refreshSubscribers = []

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  window.__refreshSubscribers.push(callback)
}

const onTokenRefreshed = (newToken: string) => {
  window.__refreshSubscribers.forEach((callback) => callback(newToken))
  window.__refreshSubscribers = []
}

// --- Axios Response Interceptor ---
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const errorCode = error.response?.data?.errorCode

    // Session terminated errors — no retry, force logout
    const SESSION_ERRORS = ['POLESTAR_00110', 'POLESTAR_00112']
    if (SESSION_ERRORS.includes(errorCode)) {
      Modal.warn({ content: getSessionErrorMessage(errorCode) })
      redirectToLogin()
      return Promise.reject(error)
    }

    // Token expired — refresh and retry
    const TOKEN_ERRORS = ['AUTHENTICATION', 'POLESTAR_00102']
    if (TOKEN_ERRORS.includes(errorCode) && !originalRequest._retry) {
      originalRequest._retry = true

      if (window.__isTokenRefreshing) {
        // Queue this request — it will be replayed after refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(axiosInstance(originalRequest))
          })
        })
      }

      // First 401 — initiate refresh
      window.__isTokenRefreshing = true

      try {
        const { data } = await axiosPublic.post('/api/account/refresh', {
          refreshToken: getRefreshToken(),
        })

        setAccessToken(data.accessToken)
        setRefreshToken(data.refreshToken)

        // Replay all queued requests with new token
        onTokenRefreshed(data.accessToken)

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // Refresh failed — clear queue and redirect to login
        window.__refreshSubscribers = []
        redirectToLogin()
        return Promise.reject(refreshError)
      } finally {
        window.__isTokenRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
```

## Dual Axios Instance Setup

```typescript
// Authenticated instance (with refresh interceptor)
const axiosInstance = axios.create({
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Public instance (login/refresh — no interceptor)
const axiosPublic = axios.create({
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})
```

## Request Interceptor (Header Enhancement)

```typescript
axiosInstance.interceptors.request.use((config) => {
  // Inject locale for server-side i18n
  config.headers['Accept-Language'] = getCurrentLocale()

  // Inject auth token
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
```

## Key Design Decisions

1. **Window-scoped state** — `window.__isTokenRefreshing` works across Module Federation remotes sharing the same window
2. **Subscriber pattern** — queued requests resolve via callback when refresh completes
3. **`_retry` flag** — prevents infinite retry loops on permanent auth failures
4. **Session vs Token errors** — session termination (concurrent login, inactivity) forces logout immediately; token expiry triggers refresh
5. **Dual instances** — public instance for login/refresh avoids circular interceptor calls
