---
id: PLAT-CLI-CMD
status: baseline
scope: "CLI Platform; applicable only when enabled by the application profile"
triggers:
  - "CLI command"
  - "maintenance utility"
  - "script output"
---

# CLI Command Contracts

## Guidelines

Make inputs, mutations, outputs, and exit status predictable for people and automation.

## Why

A tool that prints success but exits ambiguously can corrupt a larger workflow.

## Structure

```text
Pseudocode:
parse arguments -> validate environment/targets -> plan changes
-> authorized operation -> structured summary -> meaningful exit status
read-only/dry-run -> show intended scope without mutation
```

## Implementation

Use explicit targets, structured subprocess arguments, and documented working-directory rules. Separate normal machine-readable results from diagnostics when consumers need it. Keep credentials out of flags/output where possible. Do not add approval prompts to unattended flows without an established contract.

## Rules

- `PLAT-CLI-CMD-001` MUST return a failure status when a required operation fails.
- `PLAT-CLI-CMD-002` MUST resolve and validate destructive targets before mutation.
- `PLAT-CLI-CMD-003` MUST NOT log credentials or build executable shell text from untrusted arguments.

## Validation

Test success/failure status, absent arguments, paths with spaces, noninteractive execution, cancellation, and output parsing.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://www.gnu.org/s/bash/manual/html_node/Exit-Status.html)
