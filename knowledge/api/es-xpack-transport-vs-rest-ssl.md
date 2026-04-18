---
name: es-xpack-transport-vs-rest-ssl
version: 0.1.0-draft
tags: [api, xpack, transport, rest, ssl]
category: api
summary: Elasticsearch transport SSL and REST SSL are independent X-Pack configs; enabling one does not enable the other
source:
  kind: project
  ref: cygnus@cbb96a6dfff
confidence: high
---

# Elasticsearch X-Pack: Transport vs REST SSL

## Fact
X-Pack exposes two separate SSL toggles: `xpack.security.transport.ssl.enabled` (node-to-node, TransportClient) and `xpack.security.http.ssl.enabled` (REST). They share keystore files but are configured independently. Auth (`xpack.security.enabled` + `xpack.security.user`) is orthogonal and applies even when SSL is off.

## Why
A deployment may terminate REST TLS at a proxy while keeping transport plaintext inside a trusted network, or vice versa. The ES team intentionally decoupled the toggles.

## How to apply
- Do NOT gate `PreBuiltXPackTransportClient` construction solely on the SSL flag — gate on the auth flag and independently add SSL settings when SSL is on.
- Document which of the two SSL layers each deployment uses.
- Keystore vs truststore passwords are different fields even when pointing at the same file.
