---
id: SEC-UPLOAD
status: baseline
scope: security
owner: application-maintainer
triggers: ["file upload", "attachment creation", "multipart"]
---

# File upload security pattern

## Guidelines

Define allowed business formats and processing risks. Client validation is immediate feedback; the receiving service enforces acceptance.

## Why

Names, extensions, MIME claims, and even valid file signatures do not establish that a file is safe to process.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
authenticate/authorize → bounded stream → type/content checks → isolated temporary/quarantine state → approved processing → published artifact
```

## Implementation

Set byte, count, decompression, processing-time, and storage quotas appropriate to the workflow. Use server-generated storage keys. Select malware scanning or content-disarm controls according to the profile threat assessment, and keep unapproved artifacts unavailable.

## Rules

- **SEC-UPLOAD-001** — MUST enforce upload authorization, accepted types, and resource limits on the server.
- **SEC-UPLOAD-002** — MUST validate content independently of the supplied extension and MIME header.
- **SEC-UPLOAD-003** — MUST prevent access to artifacts before required validation/processing succeeds and clean up rejected temporary objects.

## Validation

Test empty/oversize files, mismatched types, truncated content, invalid archives, rejected processing, and orphan cleanup using harmless fixtures.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [filename-mime-pattern](filename-mime-pattern.md)
- [download-access-pattern](download-access-pattern.md)
- [preview-replacement-pattern](preview-replacement-pattern.md)

Reference: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
