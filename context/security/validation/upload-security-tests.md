---
id: SEC-UPLOAD-TEST
status: baseline
scope: security
owner: application-maintainer
triggers: ["upload change", "preview change", "download change"]
---

# File security validation pattern

## Guidelines

Use harmless fixtures that exercise boundary behavior and the approved processing contract.

## Why

UI acceptance alone cannot verify stream limits, object access, or converter failure handling.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
fixture → expected accept/reject → stored-state assertion → access assertion → cleanup assertion
```

## Implementation

Cover valid formats, count/size limits, extension/type mismatch, malformed content, unsafe names, unauthorized parent, conversion timeout, replacement races, and deleted/revoked access. Test archive limits only in resource-bounded isolation.

## Rules

- **SEC-UPLOAD-TEST-001** — MUST validate applicable server-side file limits and access policy independently of the browser.
- **SEC-UPLOAD-TEST-002** — MUST assert rejection cleanup and unavailability of unapproved artifacts.
- **SEC-UPLOAD-TEST-003** — MUST NOT use live malware or real sensitive files in ordinary test suites.

## Validation

Record file-policy settings, fixture properties, expected response, artifact state, and cleanup evidence. Assess policy or scanner availability separately from proof of file safety.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [upload-security-pattern](../files/upload-security-pattern.md)
- [download-access-pattern](../files/download-access-pattern.md)
- [preview-replacement-pattern](../files/preview-replacement-pattern.md)
