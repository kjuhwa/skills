---
name: oauth-data-simulation
description: Patterns for generating realistic OAuth tokens, flows, and scope mappings entirely client-side without a real authorization server.
category: workflow
triggers:
  - oauth data simulation
tags:
  - auto-loop
version: 1.0.0
---

# oauth-data-simulation

All three apps simulate OAuth data without any backend or actual authorization server. The flow visualizer encodes grant types as arrays of message tuples `[fromActorIndex, toActorIndex, label]`, covering Authorization Code (with backend token exchange and refresh token), Implicit (with fragment-based token delivery), and Client Credentials (service-to-service with no user consent). Switching grant types resets both the step counter and animation progress, preventing state leakage between different protocol sequences. This tuple-array pattern makes it trivial to add new flows like Device Code or PKCE by simply defining a new message sequence.

The token inspector generates realistic JWTs via a `mockToken()` function that builds a three-part structure: header (RS256, key ID, typ), payload (iss, sub, aud, iat, nbf, exp, plus user claims like email, roles, and scopes), and a placeholder signature. The `expOffset` parameter controls expiry scenarios—positive for valid tokens, negative for expired ones—enabling demonstration of token lifecycle without cryptographic signing. Base64url encoding uses spec-compliant character replacement (`+→-`, `/→_`, strip padding) so generated tokens pass structural validation in real JWT libraries.

The scope playground defines endpoints as objects with `{method, path, needs: string[]}` where `needs` lists the OAuth scopes required for access. Validation uses AND-logic: all required scopes must be present (`needs.every(n => active.has(n))`). The initial state pre-selects only read scopes (`read:user`, `read:data`), modeling a least-privilege default. Missing scopes are computed via `needs.filter(n => !active.has(n))` and displayed inline, turning the simulation into an interactive permission debugger. This endpoint-to-scope mapping pattern scales to any API surface by extending the endpoint array.
