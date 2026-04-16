---
name: oauth-data-simulation
description: Client-side simulation strategies for generating realistic OAuth flow steps, JWT claims, and scope-permission matrices without any backend.
category: workflow
triggers:
  - oauth data simulation
tags:
  - auto-loop
version: 1.0.0
---

# oauth-data-simulation

OAuth data simulation follows three distinct strategies depending on which aspect of the protocol is being modeled. **Flow simulation** uses declarative step arrays where each grant type is a flat list of message tuples—Authorization Code has 9 steps including PKCE `code_challenge`/`code_verifier` exchange, Implicit has 7 steps with `response_type=token` and fragment-based token return, and Client Credentials has 4 steps for server-to-server. The runtime iterates linearly with fixed inter-step delay (400ms). This works because OAuth grant types are deterministic sequences with no branching in the happy path. To add error scenarios (denied consent, invalid redirect_uri, expired code), insert conditional forks after specific step indices.

**Token simulation** builds JWTs entirely client-side using `btoa(JSON.stringify(header))` + `btoa(JSON.stringify(payload))` + mock signature, with base64url encoding via `replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')`. The key technique is using relative timestamps—`iat` set to `now - N` seconds, `exp` set to `now + M` seconds—so tokens are always contextually valid or expired relative to the current moment. Three sample archetypes cover the common cases: (1) active user session with `openid profile email` scopes and a nonce, (2) expired service-account token with `admin write:all` scopes and a `client_id` claim, (3) near-expiry user token with group memberships. Cycling through samples via `idx % samples.length` gives a representative spread without backend token issuance.

**Scope-permission simulation** uses two parallel registries: a scope array `[{id, label, desc}]` and an endpoint array `[{method, path, requires: [scopeId...]}]`. The `requires` field models real OAuth patterns—simple endpoints need one scope (`read:profile`), sensitive endpoints need compound scopes (`admin` AND `read:org`). Active scopes live in a `Set` for O(1) lookup, and the unlock check `requires.every(r => set.has(r))` correctly implements AND-logic permission gating. To simulate realistic consent flows, pre-populate the active set with minimal default scopes (`read:profile`, `read:email`) representing a typical first-time user grant, then let users toggle additional scopes to observe the expanding access surface.
