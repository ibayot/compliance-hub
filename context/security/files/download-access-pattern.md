---
id: SEC-DOWNLOAD
status: baseline
scope: security
owner: application-maintainer
triggers: ["download", "attachment access", "signed URL"]
---

# File download and attachment access pattern

## Guidelines

Authorize retrieval against the current parent record and file state. Distinguish public artifacts from protected content.

## Why

A correctly protected record is undermined if its attachment has an unrestricted static URL.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
file ID → trusted metadata → current actor/parent authorization → approved version → controlled stream or bounded signed delivery
```

## Implementation

Do not turn caller paths into storage paths. Signed links, if selected, need scoped object/version, expiry, audience assumptions, and cache behavior. Define whether revocation is immediate or bounded by link lifetime.

## Rules

- **SEC-DOWNLOAD-001** — MUST authorize protected file retrieval and derived previews through the approved delivery mechanism.
- **SEC-DOWNLOAD-002** — MUST NOT expose storage paths or assume an unguessable filename grants sufficient protection.
- **SEC-DOWNLOAD-003** — MUST choose Content-Type, Content-Disposition, and cache policy appropriate to content trust and confidentiality.

## Validation

Try another actor's file ID, an unauthorized parent, deleted/replaced versions, expired links, and cached responses after identity changes.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [resource-scope-pattern](../authorization/resource-scope-pattern.md)
- [preview-replacement-pattern](preview-replacement-pattern.md)

Reference: [OWASP Insecure Direct Object Reference Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).
