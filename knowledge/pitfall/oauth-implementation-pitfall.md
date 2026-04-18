---
version: 0.1.0-draft
name: oauth-implementation-pitfall
description: Common mistakes when building OAuth visualizers and educational tools that misrepresent the protocol
category: pitfall
tags:
  - oauth
  - auto-loop
---

# oauth-implementation-pitfall

The most common pitfall is **conflating OAuth 2.0 with OIDC** in visualizations — showing an `id_token` in a pure OAuth authorization_code flow, or labeling the `sub` claim as "the user's identity" in a plain access token. OAuth 2.0 grants authorization, not authentication; only OIDC produces id_tokens with authenticated subject claims. Visualizers must clearly label which protocol layer is active and avoid treating access tokens as identity assertions. A related mistake: decoding access tokens as JWTs in the UI — many real-world access tokens are opaque strings, and showing them always as JWTs trains users to introspect client-side, which is wrong for opaque tokens and a privacy leak for JWTs not intended for the client.

JWT inspector tools frequently **fail to validate signatures** and only decode, leading users to believe a decoded token is trustworthy. Worse, some tools accept `alg: none` without prominent warning, or auto-detect HS256 vs RS256 from the header without warning about algorithm-confusion attacks (where an RS256 public key is used as an HS256 secret). Any inspector must explicitly surface: signature verification status, algorithm used, key source, and a warning banner for `none`/`HS*` when a public key is present. Also avoid auto-copying decoded tokens to clipboard — pasted tokens from support channels often contain real credentials.

Scope simulators commonly misrepresent **consent semantics**: showing scopes as boolean grants rather than user-negotiable, omitting the distinction between requested/granted/effective, and not modeling `offline_access` as the specific trigger for refresh_token issuance. Additionally, PKCE is frequently shown as optional — since OAuth 2.1 it is required for all public clients, and simulators targeting current best practice should default to PKCE-on and warn when disabled. Finally, never hardcode redirect_uri validation as "exact match" only in the visualization — show the full validation rule including the prohibition on wildcards and the registered-URI check, since redirect_uri manipulation remains a top attack vector.
