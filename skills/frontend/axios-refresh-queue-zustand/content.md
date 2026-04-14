# Axios Refresh Queue with Zustand Auth Store

## Problem

You have JWT access + refresh tokens. When the access token expires:
- Many concurrent requests may 401 simultaneously (page with 8 API calls).
- A naive implementation kicks off 8 refresh calls — burns backend, rotates tokens weirdly, can invalidate each other.
- After refresh, each original request must retry with the **new** token, not the stale header captured when the request first fired.

The pattern: one refresh in flight at a time, failed requests queue up, all replay once the new token arrives.

## Pattern

Two collaborators:

1. **Zustand auth store** — holds `accessToken`, `refreshToken`, `setTokens(a, r)`, `clearTokens()`. Exposed to the API client via dependency injection (not imported directly, to avoid cycles in some bundlers).

2. **Axios client with two interceptors**:
   - **Request interceptor**: reads current access token, attaches `Authorization` header.
   - **Response interceptor** on 401: if a refresh is already in flight (`isRefreshing` flag), push the original request into a `subscribers` queue. Otherwise set the flag, hit `/auth/refresh`, update the store, flush the queue replaying each subscriber with the new token.

Guard: `originalRequest._retry` to prevent infinite loops if refresh itself 401s.

## Example (sanitized)

```ts
// authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  setTokens: (a: string, r: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setTokens: (a, r) => set({ accessToken: a, refreshToken: r }),
      clear: () => set({ accessToken: null, refreshToken: null }),
    }),
    { name: 'app-auth' }
  )
);
```

```ts
// apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

type Subscriber = (newToken: string) => void;

let isRefreshing = false;
let subscribers: Subscriber[] = [];

function queueRequest(cb: Subscriber) { subscribers.push(cb); }
function flushQueue(token: string) {
  subscribers.forEach(cb => cb(token));
  subscribers = [];
}

// Injected at app bootstrap to avoid circular imports
let getAccessToken: () => string | null = () => null;
let getRefreshToken: () => string | null = () => null;
let setTokens: (a: string, r: string) => void = () => {};
let onAuthFailure: () => void = () => {};

export function wireAuth(opts: {
  getAccess: () => string | null;
  getRefresh: () => string | null;
  setTokens: (a: string, r: string) => void;
  onFailure: () => void;
}) {
  getAccessToken = opts.getAccess;
  getRefreshToken = opts.getRefresh;
  setTokens = opts.setTokens;
  onAuthFailure = opts.onFailure;
}

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queueRequest((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          original._retry = true;
          api(original).then(resolve).catch(reject);
        });
      });
    }

    isRefreshing = true;
    original._retry = true;

    try {
      const refresh = getRefreshToken();
      if (!refresh) throw new Error('no refresh token');
      // Use a bare axios call — avoid our own interceptor recursion.
      const resp = await axios.post('/api/auth/refresh', { refreshToken: refresh });
      const { accessToken, refreshToken } = resp.data;
      setTokens(accessToken, refreshToken);
      flushQueue(accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (e) {
      flushQueue(''); // wake queued promises so they reject
      subscribers = [];
      onAuthFailure();  // e.g. redirect to /login
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
```

```ts
// app bootstrap
import { wireAuth } from './apiClient';
import { useAuthStore } from './authStore';
import { navigate } from './router';

wireAuth({
  getAccess: () => useAuthStore.getState().accessToken,
  getRefresh: () => useAuthStore.getState().refreshToken,
  setTokens: (a, r) => useAuthStore.getState().setTokens(a, r),
  onFailure: () => { useAuthStore.getState().clear(); navigate('/login'); },
});
```

## When to use

- SPAs consuming a JWT API with access + refresh tokens.
- Any client where many concurrent requests fire during normal use (dashboards, lists + detail).

## When NOT to use

- Cookie-based sessions with `HttpOnly` — the browser handles refresh transparently; no interceptor needed.
- Single-request-at-a-time flows (CLI-like apps) — the queue adds complexity for no benefit.

## Pitfalls

- **Importing the store directly into the client**: creates circular imports in some bundlers. Use dependency injection (`wireAuth`) instead.
- **Recursion**: calling `api.post('/auth/refresh')` re-triggers the interceptor on 401 loops. Use a bare `axios.post` for the refresh call itself.
- **Race on refresh failure**: if the refresh itself 401s, you must drain the subscriber queue *and* reject, otherwise queued promises hang forever.
- **Don't replay mutations blindly**: if the original request was a POST that partially succeeded server-side, a retry may double-apply. For idempotent requests this is fine; for mutations, consider an idempotency key.
- **Token capture**: request interceptor reads the token at *send* time, so queued replays pick up the new one correctly — as long as you set the header again on replay (as shown).
