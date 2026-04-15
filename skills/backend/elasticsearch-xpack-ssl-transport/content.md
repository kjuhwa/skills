# Elasticsearch X-Pack SSL Transport Client

## When to use
Production ES cluster requires X-Pack auth and/or node-to-node TLS; dev cluster does not.

## Steps
1. Gate client construction on `es.xpack.security.enable`:
   - false → use `PreBuiltTransportClient` with bare settings.
   - true → use `PreBuiltXPackTransportClient` with `xpack.security.user=<user>:<pass>`.
2. If `es.xpack.security.ssl.enable=true`, also set:
   - `xpack.security.transport.ssl.enabled=true`
   - `xpack.ssl.keystore.path`, `xpack.ssl.keystore.password`
   - `xpack.ssl.truststore.path`, `xpack.ssl.truststore.password`
   - `xpack.ssl.verification_mode=certificate` (or `full`)
3. Keep keystore and truststore passwords as separate config keys — they are genuinely different fields.
4. Ensure the JVM user can read keystore files (file-mode / ACL).
5. Transport SSL and REST API SSL are configured independently on the cluster; don't assume enabling one enables the other (see `es-xpack-transport-vs-rest-ssl`).

## Watch out for
- Do not guard XPack settings behind only the SSL flag — auth must still apply when SSL is off.
- `PreBuiltXPackTransportClient` requires the `x-pack-transport` dependency; version must match cluster.
