---
name: gridfs-template-upload-data-loss-pitfall
description: MongoDB GridFS uploads can silently drop file bytes if the bucket/db selection or stream flush is wrong — always verify metadata size equals input size
type: pitfall
category: pitfall
source:
  kind: project
  ref: lucida-report@35a2a06
confidence: medium
---

## Fact
Uploading report templates (or any binary) into MongoDB GridFS can result in a **zero-byte or truncated file** that the driver still reports as "stored successfully" if:
- the caller picks the wrong `(dbName, bucket)` on a multi-tenant `DynamicGridFsTemplate`,
- the input `InputStream` is closed before the GridFS writer flushes,
- or a Spring Data upgrade changes default chunk size and the old bucket is re-used.

The bug is silent: the `ObjectId` is returned, the filename exists, and only downstream rendering fails with "template empty" or "ozr file not found".

## Why
GridFS `store()` consumes an `InputStream` asynchronously and returns an ID before confirming chunk writes. Multi-tenant dynamic templates compound the problem by pointing the same filename at different tenants’ buckets. The lucida-report repo has at least four commits chasing this exact issue (`e71b457`, `999a341`, `9fcb8a7`, `1c1c573`) over the #110715 thread.

## How to apply
- After `.store()`, read back `GridFSFile.getLength()` and assert it equals the original payload size. Fail loudly on mismatch.
- Log `(tenantId, dbName, bucket, objectId, bytesWritten)` at INFO level for every template upload. It’s the only way to correlate later rendering failures.
- Use a `try-with-resources` on the InputStream and pass it into `.store()` within that block — don’t let the stream leave the `try` scope.
- Write a round-trip integration test with Testcontainers Mongo: upload → fetch → byte-equal the original.

## Evidence
- Commits (issue #110715): `e71b457`, `ebd8eb3`, `4267e19`, `6ccc065`, `999a341`, `9fcb8a7`, `1c1c573` — all chasing "template upload data missing" and "ozr file not found".

## Counter
- If you control the storage layer, move large binaries off GridFS to object storage (S3/MinIO). GridFS is workable but the failure modes are poorly documented.
