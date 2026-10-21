---
id: SEC-FILE-ROUTE
status: baseline
scope: security
owner: application-maintainer
triggers: ["file", "attachment", "download", "preview"]
---

# File handling security context router

## Guidelines

Review files as a lifecycle spanning selection, receiving, processing, storing, delivery, replacement, and disposal.

## Why

Protection at upload time does not determine access, safety of conversion, or retention of derived copies.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
UI selection → authorized bounded receive → validation → processing → protected storage → authorized retrieval → replacement/retention
```

## Implementation

Select granular file patterns for changed stages. Link the UI's file-picker behavior to server policies without claiming browser restrictions enforce server security. Add classification and retention when file sensitivity or lifecycle changes.

## Rules

- **SEC-FILE-ROUTE-001** — MUST inspect the downstream stages affected by a changed file type, access policy, processing step, or storage key.
- **SEC-FILE-ROUTE-002** — MUST ensure file-policy documentation distinguishes proposed standards from verified implementation behavior.

## Validation

Record relevant acceptance/rejection, authorization, artifact-version, and cleanup cases using harmless fixtures.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [upload-security-pattern](files/upload-security-pattern.md)
- [download-access-pattern](files/download-access-pattern.md)
- [filename-mime-pattern](files/filename-mime-pattern.md)
- [preview-replacement-pattern](files/preview-replacement-pattern.md)
- [upload-security-tests](validation/upload-security-tests.md)
- [retention-deletion-pattern](data-protection/retention-deletion-pattern.md)
