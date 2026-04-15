# Encrypted PII Decrypt Before Send

## Rule
User PII (email, phone) stays encrypted through: cache → repository → service DTO → template model. Decryption happens **once**, as late as possible, inside the concrete sender right before it hands the address to the transport.

## Why it matters
- Cached user objects are shared across workers. If decrypted there, a heap dump or log line leaks plaintext.
- Template rendering intentionally exposes variables like `${user.email}`; if the cached object already holds plaintext, any template can exfiltrate it.

## Steps
1. Repository returns the entity with encrypted fields verbatim.
2. Cache the encrypted form.
3. Service layer maps to DTO — still encrypted.
4. Sender does `decryptedEmail = AESCipher.decode(user.getEmail())` immediately before `mailSender.send(...)` / `jdbc.update(...)`.
5. Never put decrypted PII in a template model passed to FreeMarker — pass the bare string to the transport API directly. Phone numbers can drop formatting dashes here too (`phone.replace("-", "")`).

## Counter / Caveats
- Failed decryption should log a masked warning (`user id=X email=***`) and **skip that recipient**, not abort the whole batch.
- Phone-number dash-strip is transport-specific; keep it in the sender, not the shared util.
- If you must cache the decrypted form for performance, scope the cache to a single send operation (method-local map), not the global cache manager.
