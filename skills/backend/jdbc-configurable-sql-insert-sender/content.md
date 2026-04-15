# JDBC-Configurable SQL Insert Sender

## When to use
The downstream system (SMS gateway, ITG, legacy ticketing) exposes **no API** — the integration contract is "insert a row into this table". You cannot hard-code the schema because each customer deploys with different column names.

## Config shape
```json
{
  "driver": "org.mariadb.jdbc.Driver",
  "url": "jdbc:mariadb://host:3306/message",
  "user": "...",
  "password": "...(encrypted)...",
  "query": "insert into sms_message(sender, recipient, message) values ('${from_phone_number}', '${to_phone_number}', '${plain_message}')"
}
```

## Steps
1. Build a `DataSource` per configured item (cache by config hash; rebuild on config change).
2. At send time, copy the query string and `.replace("${from_phone_number}", ...)` etc. for the known variable set.
3. Run via `jdbcTemplate.update(substitutedSql)`.
4. Store encrypted password at rest; decrypt only during `DataSource` build.

## Counter / Caveats
- **SQL injection**: `${plain_message}` contents go straight into the SQL string. At minimum, escape single quotes; better: rewrite the channel to prepared statements with named parameters. This project accepts the risk because messages are operator-authored — document that assumption.
- **XML/HTML escape must be OFF** for the template engine (see `freemarker-two-phase-expression-subst`), otherwise `&amp;` leaks into the DB.
- Enforce message length per-charset (UTF-8 vs EUC-KR byte counts differ) with ellipsis truncation — see `byte-aware-sms-truncation-with-ellipsis`.
- Test with Testcontainers MariaDB; don't mock `jdbcTemplate` for this code path.
