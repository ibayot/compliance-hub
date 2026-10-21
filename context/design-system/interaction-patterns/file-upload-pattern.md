---
id: DS-UPLOAD
status: baseline
scope: design-system
triggers:
  - "upload"
  - "attachment transfer"
  - "multipart"
---

# File Upload Workflow Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Separate selection, validation, transfer, processing, persistence, and attachment association.

## Why

Each phase has different success, cancellation, retry, and security meaning.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
selected -> validated -> transferring -> processing -> saved -> associated
anyPhase -> phaseSpecificFailure -> allowedRecovery
```

## Store Implementation

The form owns selected drafts; an upload owner owns per-file phase/progress/cancellation; the server owns saved attachments. Cross-page uploads require an explicit background-workflow design.

## Rules

- **DS-UPLOAD-001** — Each file MUST have stable local/request identity and an independent phase when multiple files are supported.
- **DS-UPLOAD-002** — Client validation MUST NOT replace authoritative size, content, type, authorization, and storage checks.
- **DS-UPLOAD-003** — Transfer completion MUST NOT be reported as saved/associated completion until confirmed.
- **DS-UPLOAD-004** — Retry and cancellation MUST define duplicate prevention, cleanup, and partial-success behavior.
- **DS-UPLOAD-005** — Leaving a page MUST have defined continuation or cancellation semantics; it must not silently lose meaningful pending work.

## Accessibility

Provide browse and keyboard paths, per-file status/errors, meaningful progress, and recovery announcements.

## Security and Permissions

Load the applicable security file-upload route for server boundaries, content validation, storage, and access policy.

## Validation

Test malformed/oversize files, network interruption, server processing failure, multi-file partial success, cleanup, and uncertain result.

## Related Patterns

- [file-picker-pattern ](../components/inputs/file-picker-pattern.md)
- [progress-pattern ](../components/feedback/progress-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
