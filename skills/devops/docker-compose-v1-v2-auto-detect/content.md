# docker-compose-v1-v2-auto-detect

Detect whether Docker Compose v2 (`docker compose`) is available, and only fall back to v1 (`docker-compose`) if it is not. Set a single variable used throughout the script.

## When to use
- Multi-host deployment scripts where hosts may be mid-migration from v1 to v2.
- Scripts that use v2-only flags: `--env-file` at top level, `config --images`, `--profile`, etc.

## Pattern

```sh
set_docker_compose_cmd() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker-compose"
  else
    echo "Neither 'docker compose' nor 'docker-compose' is available." >&2
    exit 1
  fi
}

set_docker_compose_cmd
$DOCKER_COMPOSE_CMD -f dc-platform.yml up -d
```

## Why v2 first
- v1 (`docker-compose`) is deprecated and is missing flags like `--env-file` and `config --images`.
- Using v1 against a v2-only compose file causes false-negative prechecks (e.g. "no images found") that mislead ops.

## Gotcha
`docker compose version` prints to stdout on success *and* stderr on failure depending on CLI plugin init state — always pipe both to `/dev/null` and rely on exit code.
