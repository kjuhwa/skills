---
version: 0.1.0-draft
tags: [pitfall, docker, engine, requires, traefik, upgrade]
name: docker-engine-29-requires-traefik-upgrade
description: Docker Engine 29.x raises the minimum client API to 1.44, breaking older Traefik versions that pin an older API
category: pitfall
source:
  kind: project
  ref: lucida-for-docker@0d3d648
confidence: high
---

# Docker Engine 29.x breaks older Traefik (min client API → 1.44)

## Fact
Starting with Docker Engine 29, the minimum supported client API version was raised to **1.44**. Traefik versions that negotiate an older API version (via the Docker provider) fail to enumerate services, and dynamic routing silently stops updating.

## Evidence
- Commit `0d3d648`: `issue #83466 Docker Engine 29.x 부터 클라이언트 최소 API 버전이 1.44로 증가로 인하여 traefik 버전 업데이트`.

## How to apply
- Before upgrading Docker Engine to 29.x, audit Traefik version in use. Traefik ≥ 2.11 (or ≥ 3.0) supports API 1.44.
- If the Traefik version cannot be bumped, pin Docker Engine to 28.x.
- Same constraint applies to any other tool that talks to `/var/run/docker.sock` with a pinned older API version (compose plugins, portainer, dockerd-rootless shims).

## Counter / Caveats
The API-version floor changes on major Engine releases. Re-check the floor at each Engine major upgrade rather than relying on this specific 29/1.44 pairing.
