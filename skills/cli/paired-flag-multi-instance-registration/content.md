# Paired-flag multi-instance CLI registration

## Problem
A CLI needs to accept N copies of a composite value — e.g. N OpenAPI specs, each with its own base URL; N database connections with alias+DSN. Options that take `key=value,key=value` syntax force users to escape shell metacharacters, and hand-rolled `--spec-1`, `--spec-2` flags break on unknown counts. You want:

```
--openapi A.yaml --baseUrl https://a  --openapi B.yaml --baseUrl https://b
```

…where the parser registers `(A.yaml, https://a)` and `(B.yaml, https://b)` as separate pairs, preserving order.

## Pattern
Parse linearly with a single "pending" slot for the leading half of the pair. When the trailing half arrives, close the pair and clear the pending slot. At EOF, flush any pending leading value against the global default.

```java
String pendingPath = null;
for (int i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--openapi":
      String path = args[++i];
      if (pendingPath != null) cfg.addSpec(pendingPath, cfg.getBaseUrl()); // default-close
      pendingPath = path;
      break;
    case "--baseUrl":
      String url = args[++i];
      cfg.setBaseUrl(url);                        // also becomes global default
      if (pendingPath != null) {
        cfg.addSpec(pendingPath, url);
        pendingPath = null;
      }
      break;
  }
}
if (pendingPath != null) cfg.addSpec(pendingPath, cfg.getBaseUrl());
```

Two ordering rules make this robust:
1. `--baseUrl` closes the most recent open `--openapi`, so `--openapi X --baseUrl Y` always pairs.
2. If a second `--openapi` arrives before its `--baseUrl`, the previous path is closed against the current global baseUrl (so `--baseUrl X --openapi A --openapi B` pairs both with `X`).

## When to use
- You need M-to-N relationships between CLI flags without JSON or YAML config files.
- Order matters (selection drop-downs, first-registered-is-default).
- You want friendly usage where a single global `--baseUrl` implicitly applies to every `--openapi`.

## Pitfalls
- **Library argparsers resist this**: stdlib `argparse`/`picocli` treat repeated flags as a list per flag, losing interleaving. You need a custom parser or `action="append"` with a post-pass that zips by position — the pending-slot approach is simpler.
- **Missing trailing value**: always check `i + 1 < args.length` before `args[++i]`, and emit a clear error ("--openapi requires a path argument") instead of `ArrayIndexOutOfBoundsException`.
- **Value starting with `--`**: if the user typo's `--openapi --baseUrl`, the parser will consume `--baseUrl` as the path. Reject values that begin with `--`.
- **Document order semantics**: users will be surprised that `--baseUrl` before `--openapi` applies as a default. Either say so explicitly or reject that ordering.
