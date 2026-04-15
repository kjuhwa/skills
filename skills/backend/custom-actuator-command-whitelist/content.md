# custom-actuator-command-whitelist

## Shape

Server side (target service):
- `@Endpoint(id = "command")` — custom Actuator endpoint.
- `ALLOWED_COMMANDS` = `Map<String, List<String>>` (command → allowed default args).
- Per-command arg validator: reject any input containing shell metacharacters `; | & ` \` $ > < ( ) { } \\ \n \r`.
- `ProcessBuilder` with 30s `waitFor` timeout; capture stdout, stderr, exitCode.

Client side (caller service):
- Separate allow-list mirror (defense in depth — never trust only the remote to enforce).
- Request: `{targetId, command, args?}` → POST to `/actuator/command` on the target.

## Steps

1. Expose only via `management.endpoints.web.exposure.include=...,command`. Never expose via the public port.
2. On both ends: reject `command` not in the whitelist with a stable error code (`COMMAND_NOT_ALLOWED`), not a 500.
3. Sanitize args by regex allowlist (`[A-Za-z0-9_\-./:=]+`) instead of blocklist — blocklists miss encodings.
4. Hard limits: 30s timeout, stdout cap (e.g. 1 MiB), non-zero exit still returns 200 with `exitCode` (it's diagnostic data, not an error).
5. Run as an unprivileged user; confirm no command in the list can write/modify (`ps, df, free, top -b -n 1, netstat -tlnp, uptime, hostname, uname, date, whoami, env, java -version`).
6. Audit-log every invocation with caller identity, target, command, args, exitCode, duration.

## Counter / Caveats

- `env` output can leak secrets — strip variables matching `*(SECRET|TOKEN|PASS|KEY)*` before returning.
- `top` without `-b -n 1` hangs forever; always pin args.
- Do not accept a freeform `args` string — parse into a list and re-validate each element.
- This endpoint is a supply-chain target; treat changes to the whitelist as security-reviewed PRs.

## Test hooks

- Unit: arg sanitizer rejects each metachar individually.
- Integration: disallowed command returns `COMMAND_NOT_ALLOWED`, not 500.
- Timeout test: inject a sleep command (behind a test-profile-only whitelist entry) and assert 30s kill.
