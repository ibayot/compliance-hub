---
id: DS-PREVIEW
status: baseline
scope: design-system
triggers:
  - "document preview"
  - "image preview"
  - "attachment viewer"
---

# Document Preview Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Treat preview as an authorized rendering workflow with loading, unsupported, failed, and download alternatives.

## Why

A preview is a different processing and exposure surface from selecting or downloading a file.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Preview(fileId, safeMetadata)
  loading -> Progress
  supported -> approvedRenderer
  unsupportedOrFailed -> authorizedDownloadAlternative
```

## Store Implementation

The server owns attachment identity/access; the preview owner manages fetch/render state and temporary resources.

## Rules

- **DS-PREVIEW-001** — Preview access MUST be authorized independently of the presence of a file link.
- **DS-PREVIEW-002** — Unsupported and failed previews MUST provide truthful explanation and an allowed alternative.
- **DS-PREVIEW-003** — Temporary URLs/resources MUST be revoked or expired according to their lifecycle.
- **DS-PREVIEW-004** — Preview rendering MUST use an approved safe-content boundary and supported format policy.

## Accessibility

Provide a meaningful title, keyboard controls, zoom alternatives, and accessible download information.

## Security and Permissions

Follow file security guidance for content isolation, short-lived access, safe rendering, and confidential metadata.

## Validation

Test supported/unsupported files, denied/expired access, malformed content, cleanup, keyboard controls, and large files.

## Related Patterns

- [file-picker-pattern ](../inputs/file-picker-pattern.md)
- [file-upload-pattern ](../../interaction-patterns/file-upload-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
