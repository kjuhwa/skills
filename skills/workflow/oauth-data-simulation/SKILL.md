---

name: oauth-data-simulation
description: Generating realistic OAuth tokens, flow states, and scope sets for client-side simulators without a real auth server
category: workflow
triggers:
  - oauth data simulation
tags: [workflow, oauth, data, simulation, auth]
version: 1.0.0
---

# oauth-data-simulation

Client-side OAuth simulators need deterministic-but-realistic fixture data: generate JWTs in-browser using a well-known symmetric secret (`"demo-secret-do-not-use-in-prod"`) or an ephemeral Web Crypto–generated keypair so signatures actually verify. Populate claims with plausible values — `iss: "https://auth.example.com"`, `aud: "api://default"`, `sub: "user_" + nanoid(8)`, `iat: now`, `exp: now + 3600`, plus domain-appropriate custom claims (`scope`, `roles`, `tenant_id`). Include a gallery of **pre-seeded anomalous tokens**: expired, not-yet-valid (`nbf` in future), wrong-audience, algorithm-confusion (`alg: none`), tampered-payload-valid-signature — these are the scenarios users most want to inspect.

For flow simulation, model each OAuth grant type as a state machine with explicit transitions and wire-level artifacts at each edge: `/authorize` request params, consent screen, redirect with code, `/token` POST body, token response JSON. Store the full transcript as an array of `{step, timestamp, direction: 'client→as' | 'as→client', payload}` entries so users can scrub through the exchange. For PKCE, generate `code_verifier` (43–128 char URL-safe random) and derive `code_challenge` via SHA-256 + base64url on the fly — don't hardcode, because users will want to change the verifier and see the challenge update.

Scope simulation should ship a realistic scope catalog (OIDC standards: `openid profile email address phone offline_access` plus resource-specific: `read:X write:X admin:X delete:X`) and a resource catalog mapping endpoints to required scopes. Then simulate consent: user-granted subset → token scope claim → API call authorization decision. Randomize partial grants to teach users that requested ≠ granted.
