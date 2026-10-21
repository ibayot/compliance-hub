---
id: TECH-SH-SAFE
status: baseline
scope: "POSIX Shell; applicable only when enabled by the application profile"
triggers:
  - "shell script"
  - "entrypoint"
  - "shell quoting"
---

# Safe Shell Entrypoints

## Guidelines

Pass arguments without re-parsing and validate filesystem targets before mutation.

## Why

String-built shell commands and unquoted paths create correctness and security failures.

## Structure

```sh
#!/bin/sh
set -eu
: "${APP_MODE:?APP_MODE is required}"
exec "$@"
```

## Implementation

Use this argument-forwarding example only when the caller supplies an approved executable and arguments. Add explicit checks around expected nonzero statuses; `set -e` has conditional-context limitations. Keep secret values out of tracing and output.

## Rules

- `TECH-SH-SAFE-001` MUST quote variable and argument expansions when they represent a single value.
- `TECH-SH-SAFE-002` MUST NOT use eval for untrusted arguments or log secret values with tracing.
- `TECH-SH-SAFE-003` MUST verify resolved target boundaries before recursive filesystem operations.

## Validation

Check syntax in the actual shell and test paths with spaces, missing configuration, failing commands, and signal forwarding. Use ShellCheck where already available.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)
