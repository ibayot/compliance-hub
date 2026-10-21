---
id: SEC-OUTPUT
status: baseline
scope: security
owner: application-maintainer
triggers: ["HTML rendering", "rich text", "user URL", "XSS"]
---

# Output encoding, XSS, and rich text pattern

## Guidelines

Render ordinary content through the framework's safe text mechanisms. Rich text needs a deliberate sanitization and rendering contract.

## Why

A value safe as text may be dangerous in HTML, script, style, or a URL.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
untrusted content → context-specific safe API/encoding
approved rich content → maintained allowlist sanitizer → controlled HTML sink
```

## Implementation

Centralize rich-text rendering; restrict elements, attributes, URL schemes, and embedded content. Keep sanitizers updated and avoid transformations that reintroduce unsafe markup. Use CSP as an additional control selected with the web platform profile.

## Rules

- **SEC-OUTPUT-001** — MUST encode or safely bind output according to its destination context.
- **SEC-OUTPUT-002** — MUST sanitize permitted user-authored HTML with a maintained allowlist-based solution before an unsafe HTML sink.
- **SEC-OUTPUT-003** — MUST NOT rely on input validation or CSP alone as the XSS prevention mechanism.

## Validation

Test stored/reflected content, dangerous link schemes, event attributes, malformed markup, and post-sanitization transformations with inert assertions.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [input-validation-pattern](input-validation-pattern.md)
- [preview-replacement-pattern](../files/preview-replacement-pattern.md)

Reference: [OWASP Cross Site Scripting Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
