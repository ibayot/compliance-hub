---
id: DS-FILEREPLACE
status: baseline
scope: design-system
triggers:
  - "replace attachment"
  - "update document"
  - "file version"
---

# File Replacement Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Define replacement identity, history, retention, and rollback before treating it as an upload with a new label.

## Why

A replacement can alter evidence, links, audit history, and concurrent workflows.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
authorizeExisting -> selectCandidate -> validateAndUpload -> atomicReplacementOrVersion
confirm -> refreshMetadataAndPreview
```

## Store Implementation

The form owns the replacement draft; the server owns current version, prior-version access, and audit records.

## Rules

- **DS-FILEREPLACE-001** — Replacement MUST define whether identity is preserved, a new version is added, or an old attachment is detached.
- **DS-FILEREPLACE-002** — Failure before confirmed replacement MUST leave a valid existing file available under its policy.
- **DS-FILEREPLACE-003** — Concurrent updates MUST use the application's conflict/version policy.
- **DS-FILEREPLACE-004** — Replacement history, old-file retention, and audit behavior MUST follow domain/data rules.
- **DS-FILEREPLACE-005** — Success MUST invalidate stale metadata, download links, and previews as required.

## Accessibility

Make the current file, proposed replacement, consequence, cancel, and final outcome clear.

## Security and Permissions

Reauthorize both the old resource and new content; do not expose old versions outside their access policy.

## Validation

Test cancel, invalid candidate, transfer failure, association failure, concurrency, old-link handling, and preview refresh.

## Related Patterns

- [file-upload-pattern ](file-upload-pattern.md)
- [document-preview-pattern ](../components/data-display/document-preview-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
