---
version: 0.1.0-draft
tags: [arch, nfs, backed, volumes, for, docker]
name: nfs-backed-volumes-for-docker-swarm
description: Cross-node Docker Swarm persistence via a single NFS share mounted at the same host path on every swarm node
category: arch
source:
  kind: project
  ref: lucida-for-docker@polestar/documents/docker-swarm-nfs-integration.md
confidence: high
---

# Docker Swarm persistence pattern: single NFS export mounted at identical host path on every node

## Fact
For multi-node Docker Swarm deployments that need shared persistent volumes (Kafka, MongoDB, Elasticsearch, Redis), the working pattern is:

1. Run an NFS server exporting one shared directory (e.g. `/app/nfs/shared`).
2. Mount it at the **same** host path (e.g. `/mnt`) on every Swarm node via `/etc/fstab`.
3. Pre-create one subdirectory per service/replica (`/mnt/mongodb-1-db`, `/mnt/kafka-1-data`, …) with `chmod 777`.
4. Compose files bind-mount those subdirs via `${DATA_VOLUME_PATH}/<service>:/data/…`.

## Why
- Swarm tasks reschedule across nodes on failure; without shared storage the rescheduled task starts with an empty volume.
- Docker's native `volume` driver is node-local; NFS gives byte-compatible cross-node semantics with zero extra CSI plumbing.
- Bind-mounting a pre-created subdir is simpler than NFS-driver volumes — fewer moving parts, no docker-volume-plugin lifecycle.

## Evidence
- `polestar/documents/docker-swarm-nfs-integration.md` — canonical setup script.
- `polestar/scripts/create-volume.sh` — mirrors the directory layout using `DATA_VOLUME_PATH`.
- `/etc/exports` line: `${NFS_PATH} *(rw,sync,no_subtree_check,no_root_squash)`.

## How to apply
- Use `no_root_squash` so container-root processes can write (MongoDB / Elasticsearch need it). Restrict client IPs to the Swarm subnet, not `*`, in any production export.
- Set per-service subdir paths via env var (`DATA_VOLUME_PATH`), not hardcoded — lets dev/QA use a local path and prod use `/mnt/…`.
- For services that need low-latency fsync (Kafka, MongoDB primary), measure NFS vs local-SSD before committing. NFS can become the bottleneck under heavy write loads.

## Counter / Caveats
- Single NFS server is a SPOF — plan for NFS HA or accept the blast radius.
- `sync` export + small-file workloads (e.g. Elasticsearch translog) can be dramatically slower than local disk.
- For stateful workloads that already replicate (Mongo RS, ES cluster, Kafka), prefer **node-local storage + placement constraints** so each replica pins to a specific host — simpler and faster than shared NFS.
