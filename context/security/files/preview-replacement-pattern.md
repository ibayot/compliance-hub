---
id: SEC-PREVIEW
status: baseline
scope: security
owner: application-maintainer
triggers: ["preview", "thumbnail", "replace file", "conversion worker"]
---

# Preview generation and file replacement pattern

## Guidelines

Treat converters as consumers of hostile content. Preserve the relationship between artifact, source version, permissions, and retention.

## Why

A stale preview can disclose replaced content, while a converter can consume excessive resources or reach unrelated files.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
approved source/version → bounded isolated converter → derived artifact(version, policy) → authorized delivery
replacement → create new version → atomic metadata switch → retire old artifacts
```

## Implementation

Bound CPU, memory, time, output size, filesystem, and network access. Invoke converters with argument arrays rather than shell interpolation. Define retry, cleanup, audit history, and permissions across replacement.

## Rules

- **SEC-PREVIEW-001** — MUST bind derived artifacts to the exact source version and its effective access policy.
- **SEC-PREVIEW-002** — MUST bound converter resources and restrict its available filesystem/network authority.
- **SEC-PREVIEW-003** — MUST handle replacement failures without exposing an unapproved artifact or losing the prior valid version unintentionally.

## Validation

Test harmless corrupt files, timeout, worker crash, concurrent replacement, stale preview retrieval, and cleanup retry.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [upload-security-pattern](upload-security-pattern.md)
- [download-access-pattern](download-access-pattern.md)
- [retention-deletion-pattern](../data-protection/retention-deletion-pattern.md)
