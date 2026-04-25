---
version: 0.1.0-draft
name: oauth-token-cache-corruption-workaround
summary: Some OAuth implementations leave a corrupted `oauth:tokenCache` key in the app's JSON config after periods of inactivity, causing persistent 401 errors; the workaround is to remove the offending key from the config file and re-authenticate.
category: troubleshooting
tags: [oauth, token-cache, 401, authentication, config-corruption, json, workaround]
source_type: extracted-from-git
source_url: https://github.com/aaddrick/claude-desktop-debian.git
source_ref: main
source_commit: 2fd9faf9db4eaa409b88310bdce397f8bdb0e916
source_project: claude-desktop-debian
imported_at: 2026-04-18T00:00:00Z
version_origin: extracted
confidence: low
---

# OAuth Token Cache Corruption Workaround

## Context

Electron apps that store OAuth tokens in a JSON configuration file
(`~/.config/AppName/config.json`) sometimes write a cached token object
(`oauth:tokenCache` or similar) during authentication. This cache speeds up
subsequent requests by avoiding re-authentication on startup.

After extended periods of inactivity (days to weeks), this cache can become
corrupted or stale in ways that cause every API request to return 401
Unauthorized, even after the app has been restarted.

## Observation

The symptom is recurring "API Error: 401" messages appearing in the app UI
after a period of inactivity. The error persists across normal app restarts.

The corrupted entry has a key matching a pattern like `"oauth:tokenCache"` in
the app's JSON config file. Removing this specific key (and re-authenticating
once) resolves the issue.

The `config.json` is a JSON file with various settings. Care must be taken to
maintain valid JSON after removal (trailing commas can invalidate the file).

Manual fix procedure:
1. Close the application completely (not just minimize).
2. Open `~/.config/AppName/config.json` in a text editor.
3. Find and remove the line containing `"oauth:tokenCache"` and any associated
   trailing comma from the previous line.
4. Verify the file is still valid JSON.
5. Save and restart the application.
6. Re-authenticate when prompted.

## Why it happens

OAuth token caches typically store access tokens with expiry timestamps. If
the cache corruption involves:
- A mismatched token/secret pair.
- An expired refresh token that the app does not handle gracefully.
- A serialization bug that writes an invalid token object.

...then the app may silently use the cached (invalid) token without attempting
a re-authentication flow, resulting in perpetual 401 responses.

The specific mechanism (upstream application behavior) may change across
versions. This is documented as an upstream issue rather than a packaging-level
bug.

## Practical implication

For any Electron app that stores OAuth state in a JSON config:

**Diagnostic**: If a user reports persistent 401 errors after a period of
inactivity, check the config file for a token cache key before suggesting
more invasive fixes (clearing all config, reinstalling).

**Scripted workaround** (Python example):
```python
import json
import re
from pathlib import Path

config_path = Path.home() / '.config' / 'AppName' / 'config.json'
with open(config_path) as f:
    config = json.load(f)

if 'oauth:tokenCache' in config:
    del config['oauth:tokenCache']
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    print('Removed oauth:tokenCache — restart the app and re-authenticate')
else:
    print('No oauth:tokenCache found')
```

**`--doctor` check** (preventive): Include a check that reads the config file,
parses it as JSON, and warns if a token cache key is present that is obviously
stale (e.g., expired timestamp in the token payload).

## Source reference

- `docs/TROUBLESHOOTING.md`: "Authentication Errors (401)" section — manual
  steps, credit to the contributor who identified the fix, link to the scripted
  solution in the GitHub issue thread.
