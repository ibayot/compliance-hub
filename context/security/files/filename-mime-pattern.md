---
id: SEC-FILE-TYPE
status: baseline
scope: security
owner: application-maintainer
triggers: ["filename", "MIME", "file extension"]
---

# Filename and content type pattern

## Guidelines

Separate display filename, storage key, detected content type, and approved business type.

## Why

One user-supplied string cannot safely serve as UI text, filesystem path, HTTP header, and type verification.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
{displayName: normalized bounded text, storageKey: serverGenerated, declaredType, detectedType, approvedType}
```

## Implementation

Use a maintained parser for content detection and decode names once at a defined boundary. Treat archives and compound formats as processing workloads. Format download headers through the framework rather than string concatenation.

## Rules

- **SEC-FILE-TYPE-001** — MUST generate storage keys independently of user filenames and constrain them to the approved storage root.
- **SEC-FILE-TYPE-002** — MUST reject or neutralize path separators, traversal, control characters, and unsafe header values.
- **SEC-FILE-TYPE-003** — MUST treat declared MIME and extensions as untrusted hints and handle detection failures explicitly.

## Validation

Test Unicode, long names, duplicate names, double extensions, encoded traversal, platform path forms, and content/header mismatches.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [upload-security-pattern](upload-security-pattern.md)
- [download-access-pattern](download-access-pattern.md)

Reference: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
