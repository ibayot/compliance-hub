---
id: SEC-DEPENDENCY
status: baseline
scope: security
owner: application-maintainer
triggers: ["new package", "dependency upgrade", "image dependency"]
---

# Dependency and supply-chain security pattern

## Guidelines

Review runtime and build dependencies proportionately, including transitive packages, install scripts, plugins, and container bases.

## Why

A pinned version improves repeatability but does not prove that a dependency is trustworthy or free of known defects.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
need → maintained source/license review → pinned resolution → vulnerability/reachability assessment → tests → update/exception record
```

## Implementation

Use the profile-approved package manager and lockfiles. Track advisories and removal of unsupported dependencies. Validate artifacts through the ecosystem's supported integrity/signature mechanisms where available.

## Rules

- **SEC-DEPENDENCY-001** — MUST document the purpose and maintenance suitability of new material dependencies.
- **SEC-DEPENDENCY-002** — MUST review relevant security advisories for changed dependency sets and disposition actionable findings.
- **SEC-DEPENDENCY-003** — MUST NOT bypass integrity checks or run automatic mass-fix commands without assessing resulting compatibility and scope.

## Validation

Inspect dependency/lockfile deltas and applicable advisories, then run targeted compatibility checks. Record tool date, scope, and limitations.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [container-hardening-pattern](container-hardening-pattern.md)
- [security-review-pattern](../validation/security-review-pattern.md)

Reference: [OWASP Vulnerable Dependency Management](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Management_Cheat_Sheet.html).
