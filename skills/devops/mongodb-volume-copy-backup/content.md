# mongodb-volume-copy-backup

Replace `mongodump`/`tar.gz` MongoDB backup with a volume-to-volume `rsync` copy, executed from a short-lived helper container that mounts both the source volume and the backup target.

## When to use
- MongoDB data in a Docker named volume (bind mount or local driver).
- Archive-based backup is slow or fails on multi-GB datasets.
- A cold backup window is acceptable (stop mongo, copy, start).

## Why not tar.gz / mongodump
- `tar.gz` on a running volume produces inconsistent snapshots and is CPU-bound.
- `mongodump` BSON export is logical, not byte-accurate (indexes rebuild, order lost).
- Volume copy is byte-accurate and restore is a rename/swap, not an import.

## Procedure

```sh
# 1. Stop mongo service (cold backup)
docker compose -f dc-platform-mongodb.yml stop mongodb-1

# 2. rsync the volume into a backup volume via a throwaway container
docker run --rm \
  -v mongodb-1-db:/src:ro \
  -v mongodb-1-db-backup-$(date +%Y%m%d):/dst \
  alpine:3 sh -c "apk add --no-cache rsync && rsync -aHAX /src/ /dst/"

# 3. Start mongo
docker compose -f dc-platform-mongodb.yml start mongodb-1
```

Restore = same, with source/target swapped, while mongo is stopped.

## Gotchas
- Keep `-aHAX` so hard links, ACLs, and xattrs are preserved.
- Pin backup volume name with a date suffix to avoid clobbering.
- Host `DockerRootDir` detection: `docker info -f '{{.DockerRootDir}}'` — fall back to `/var/lib/docker`.
- For replica sets, back up one secondary at a time; initializer volumes should be excluded (`grep -v initializer`).
