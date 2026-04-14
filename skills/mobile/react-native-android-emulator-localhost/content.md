# React Native: Backend Host for Android Emulator vs iOS Simulator

## Problem
A React Native dev app calling `http://localhost:8080/api/...` works in the iOS simulator but fails with "Network request failed" on the Android emulator.

Root cause: inside the Android emulator, `localhost` resolves to the emulator itself, not the developer's host machine. Android exposes the host via the special alias `10.0.2.2`. iOS Simulator, on the other hand, shares the host network and `localhost` points correctly at the host.

## Pattern

Use `Platform.select` at module scope to compute the API base URL once:

```ts
import {Platform} from 'react-native';

const API_BASE = Platform.select({
  android: 'http://10.0.2.2:8080',
  ios: 'http://localhost:8080',
  default: 'http://localhost:8080',
});

await axios.post(`${API_BASE}/api/webtoon/generate`, {story});
```

Key details:
- `default` covers the web target (`react-native-web`) and any future platform.
- Set `API_BASE` once at module load, not inside render — evaluating `Platform.select` on every render is harmless but noisy.
- For physical devices (not emulators), neither works — the device must reach the host's LAN IP (`192.168.x.y`) or use `adb reverse` (Android) / a tunnel (ngrok, Cloudflare Tunnel).

## Alternative: `adb reverse`

For physical Android devices or when you want `localhost` to "just work" in the emulator too:

```
adb reverse tcp:8080 tcp:8080
```

This forwards the device's `localhost:8080` to the host's `localhost:8080`. Survives for the lifetime of the adb connection. Must be re-run after device reboot.

## When to use

- Any RN project in development where the backend runs on the host machine.
- E2E tests (Detox, Maestro) that spin up a local backend.
- Docs and onboarding READMEs for new contributors — this trips up almost every new RN dev.

## Pitfalls

- **Do not bake the dev URL into production builds** — gate on `__DEV__` or an env var (`react-native-config`, `react-native-dotenv`), and use the real production URL for release builds.
- **HTTPS on Android**: if your backend serves self-signed HTTPS, Android blocks cleartext and untrusted certs. Either run HTTP locally (simplest for dev) or configure `network_security_config.xml` with a debug-only override.
- **iOS ATS**: App Transport Security blocks cleartext HTTP in release builds. For dev, `NSAllowsLocalNetworking: true` in `Info.plist` is enough for `localhost`.
- **Android Studio emulator vs Genymotion**: both use `10.0.2.2`. Physical devices do not.
- **Windows + WSL2**: if the backend runs inside WSL2, `10.0.2.2` reaches Windows, not WSL2. Use the WSL2 IP (`wsl hostname -I`) or port-forward with `netsh interface portproxy`.
