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

Key loading, errors, and resources to the selected record and version. On selection change, cancel or discard the old response and clean up resources. If the authenticated request already returns bytes, prefer passing them directly to the renderer when supported. Isolate generated markup from the application's scripts, storage, and navigation authority. Select an appropriate viewport fit and keep navigation, zoom and recovery reachable.

## Rules

- **DS-PREVIEW-001** — Preview access MUST be authorized independently of the presence of a file link.
- **DS-PREVIEW-002** — Unsupported and failed previews MUST provide truthful explanation and an allowed alternative.
- **DS-PREVIEW-003** — Temporary URLs/resources MUST be revoked or expired according to their lifecycle.
- **DS-PREVIEW-004** — Preview rendering MUST use an approved safe-content boundary and supported format policy.

- **DS-PREVIEW-005** — The visible preview MUST remain bound to the active selection. A delayed render or response MUST NOT replace a newer selection.
- **DS-PREVIEW-006** — When the renderer depends on a packaged asset or worker, verification MUST confirm that the deployed route serves the expected bytes and MIME type under the deployed browser security policy.

## Accessibility

Provide a meaningful title, keyboard controls, zoom alternatives, and accessible download information.

## Security and Permissions

Follow file security guidance for content isolation, short-lived access, safe rendering, and confidential metadata.

## Validation

Test supported/unsupported files, denied/expired access, malformed content, cleanup, keyboard controls, and large files. Open a real authorized fixture through the deployed frontend, verify rendered content at narrow and wide widths, switch versions during a pending load, and test the fallback. Distinguish API fetch, packaged asset response, browser policy, renderer startup, and visible rendering when diagnosing failures.

## Related Patterns

- [file-picker-pattern ](../inputs/file-picker-pattern.md)
- [file-upload-pattern ](../../interaction-patterns/file-upload-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
