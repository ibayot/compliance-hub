---
id: DS-FILEPICKER
status: baseline
scope: design-system
triggers:
  - "file picker"
  - "attachment selector"
  - "dropzone"
---

# File Picker Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Provide browse selection and optional drag/drop, clear restrictions, selected-file feedback, and explicit removal/replacement.

## Why

A file selection is a draft input; it is different from an uploaded, saved, or authorized attachment.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
FilePicker(label, multiple, acceptedHints, maxSizeHint)
onChoose(files) -> validateDraft -> form.attachments
SelectedFile(name, size, removeAction, error)
```

## Store Implementation

The form owns selected File objects while mounted; upload orchestration owns transfer states; the server owns saved attachment metadata. Use global state only for a documented cross-page upload requirement.

## Rules

- **DS-FILEPICKER-001** — Browse MUST remain available when drag/drop is offered.
- **DS-FILEPICKER-002** — Selecting a file MUST NOT be presented as successful upload or persistence.
- **DS-FILEPICKER-003** — Duplicate, oversize, unsupported, cancelled, replacement, and multi-file partial-failure behavior MUST be defined.
- **DS-FILEPICKER-004** — Object URLs and local resources MUST be released when replaced, removed, or unmounted.
- **DS-FILEPICKER-005** — Client accept/MIME/size checks MUST be treated as hints; authoritative validation belongs to the upload service.

## Accessibility

Expose a labelled keyboard-operable browse action, file list, remove actions, and per-file errors.

## Security and Permissions

Follow security upload guidance for authorization, content verification, filenames, storage, and retrieval; do not expose local/server paths.

## Validation

Test browse/drop, cancellation, repeated same-file choice, invalid type/size, multiple files, removal, retries, and keyboard operation.

## Related Patterns

- [file-upload-pattern ](../../interaction-patterns/file-upload-pattern.md)
- [file-replacement-pattern ](../../interaction-patterns/file-replacement-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
