---
id: SEC-INDEX
status: baseline
scope: security
owner: application-maintainer
triggers: ["security discovery", "security coverage audit"]
---

# Security context index

These documents are portable prospective baselines. They guide relevant new or changed work; they do not certify that an existing application already implements the controls. The [application profile](../application/PROFILE.md) determines active features, frameworks, platforms, identities, and infrastructure. An optional feature such as MFA is not a requirement to introduce that feature.

## Guidelines

Read only the route and granular patterns needed by the request. A security folder alone cannot enforce a control: the implementation, relevant tests, and review evidence remain necessary. Select risk-appropriate checks; routine context-only work needs document validation rather than application changes or intrusive scans.

## Why

Stable rule identifiers and targeted routes make repeated audits easier to scope. Reuse previous evidence only while its code version, trust assumptions, and coverage remain applicable; no automatic audit-cost or security guarantee is implied.

## Structure

```text
profile → relevant security route → granular pattern → SEC rule IDs → implementation evidence → validation/disposition
```

## Implementation

Each pattern supplies Guidelines, Why, Structure, Implementation (Store Implementation for session state), Rules, Validation, Exceptions, and Related Patterns. Examples are illustrative contracts, not drop-in framework implementations. Legal obligations, retention schedules, security contact details, risk thresholds, allowed algorithms, and operational secrets must come from verified application inputs.

## Rules

- **SEC-CONTEXT-001** — MUST load security patterns based on the changed attack surface and active profile rather than preloading every security document.
- **SEC-CONTEXT-002** — MUST label undocumented implementation behavior as unverified until inspected; baseline status is not an implementation compliance result.
- **SEC-CONTEXT-003** — MUST keep secret values, real personal records, and sensitive incident/exploit details out of shared context; use approved private tracking references.

## Catalog

### foundations

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Security principles](foundations/security-principles.md) | `SEC-PRINCIPLES` | security review, new boundary, sensitive data |
| [Threat modeling pattern](foundations/threat-model.md) | `SEC-THREAT` | new service, new integration, data flow change |
| [Trust boundary pattern](foundations/trust-boundaries.md) | `SEC-TRUST` | service boundary, network ingress, external data |
| [Data classification pattern](foundations/data-classification.md) | `SEC-CLASSIFY` | new data field, export, sensitive data |

### identity

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Authentication pattern](identity/authentication-pattern.md) | `SEC-AUTHN` | login, identity provider, reauthentication |
| [Session lifecycle and state pattern](identity/session-pattern.md) | `SEC-SESSION` | logout, session expiration, auth state |
| [Token verification and storage pattern](identity/token-pattern.md) | `SEC-TOKEN` | JWT, bearer token, refresh token |
| [Password handling pattern](identity/password-pattern.md) | `SEC-PASSWORD` | password storage, password change, credential migration |
| [Multifactor and authenticator change pattern](identity/mfa-pattern.md) | `SEC-MFA` | MFA, passkey, authenticator reset |
| [Account recovery pattern](identity/recovery-pattern.md) | `SEC-RECOVERY` | password reset, account recovery, recovery link |

### authorization

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Capability policy pattern](authorization/capability-pattern.md) | `SEC-CAPABILITY` | permission, role, capability |
| [Server-side authorization enforcement pattern](authorization/backend-enforcement-pattern.md) | `SEC-BACKEND-AUTHZ` | endpoint, protected mutation, export endpoint |
| [Permission-aware interface pattern](authorization/frontend-visibility-pattern.md) | `SEC-FRONTEND-AUTHZ` | hidden action, disabled control, restricted selector |
| [Resource ownership and scope pattern](authorization/resource-scope-pattern.md) | `SEC-SCOPE` | record ID, unit scope, tenant, owner |
| [Service identity and delegation pattern](authorization/service-identity-pattern.md) | `SEC-SERVICE-ID` | internal endpoint, service-to-service, worker identity |

### data-protection

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Sensitive and personal data pattern](data-protection/sensitive-data-pattern.md) | `SEC-SENSITIVE` | PII, personal data, sensitive response |
| [Encryption and key lifecycle pattern](data-protection/encryption-pattern.md) | `SEC-CRYPTO` | encryption, TLS, key rotation |
| [Retention and deletion pattern](data-protection/retention-deletion-pattern.md) | `SEC-RETENTION` | retention, data deletion, backup expiry |
| [Response and diagnostic redaction pattern](data-protection/redaction-pattern.md) | `SEC-REDACT` | redaction, logging payload, entity serialization |

### files

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [File upload security pattern](files/upload-security-pattern.md) | `SEC-UPLOAD` | file upload, attachment creation, multipart |
| [File download and attachment access pattern](files/download-access-pattern.md) | `SEC-DOWNLOAD` | download, attachment access, signed URL |
| [Filename and content type pattern](files/filename-mime-pattern.md) | `SEC-FILE-TYPE` | filename, MIME, file extension |
| [Preview generation and file replacement pattern](files/preview-replacement-pattern.md) | `SEC-PREVIEW` | preview, thumbnail, replace file, conversion worker |

### input-output

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Boundary input validation pattern](input-output/input-validation-pattern.md) | `SEC-INPUT` | request body, validation, import, webhook payload |
| [Output encoding, XSS, and rich text pattern](input-output/encoding-richtext-pattern.md) | `SEC-OUTPUT` | HTML rendering, rich text, user URL, XSS |
| [Query parameterization and database authority pattern](input-output/sql-query-pattern.md) | `SEC-SQL` | SQL, query builder, sort column, filter |
| [CSRF and cross-origin request pattern](input-output/csrf-cors-pattern.md) | `SEC-CSRF-CORS` | cookie authentication, CORS, cross-origin, CSRF |
| [Server-side URL fetch and SSRF pattern](input-output/ssrf-pattern.md) | `SEC-SSRF` | URL import, remote image, webhook destination, server fetch |
| [Abuse limits and safe error pattern](input-output/rate-limit-error-pattern.md) | `SEC-ABUSE` | rate limit, login attempts, public error, expensive endpoint |

### infrastructure

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Secret provisioning and rotation pattern](infrastructure/secrets-management-pattern.md) | `SEC-SECRET-LIFECYCLE` | secret, API key, credential rotation |
| [Container security boundary pattern](infrastructure/container-hardening-pattern.md) | `SEC-CONTAINER` | Docker, container privilege, image |
| [Dependency and supply-chain security pattern](infrastructure/dependency-security-pattern.md) | `SEC-DEPENDENCY` | new package, dependency upgrade, image dependency |
| [Secure configuration pattern](infrastructure/secure-configuration-pattern.md) | `SEC-CONFIG` | environment variable, debug setting, production config |

### observability

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Security audit event pattern](observability/audit-event-pattern.md) | `SEC-AUDIT` | permission change, sensitive mutation, audit event |
| [Security logging and redaction pattern](observability/security-logging-pattern.md) | `SEC-LOG` | security log, request logging, diagnostic payload |
| [Security incident and exposure response pattern](observability/incident-response-pattern.md) | `SEC-INCIDENT` | credential exposure, security incident, suspected compromise |

### validation

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Scoped security review pattern](validation/security-review-pattern.md) | `SEC-REVIEW` | security review, new trust boundary, sensitive workflow change |
| [Authorization test matrix](validation/authorization-test-matrix.md) | `SEC-AUTHZ-TEST` | authorization change, scope change, protected endpoint |
| [File security validation pattern](validation/upload-security-tests.md) | `SEC-UPLOAD-TEST` | upload change, preview change, download change |
| [Negative API checks and release security evidence](validation/negative-release-pattern.md) | `SEC-RELEASE` | release, security-sensitive change, API negative tests |

### Entry routes

| Pattern | Rule prefix | Triggers |
|---|---|---|
| [Authentication and session context router](authentication-session-pattern.md) | `SEC-AUTH-ROUTE` | authentication, session, credential |
| [Authorization context router](authorization-pattern.md) | `SEC-AUTHZ-ROUTE` | permission, scope, role, capability |
| [Service authentication context router](service-authentication-pattern.md) | `SEC-SERVICE-ROUTE` | internal endpoint, service credential, delegated actor |
| [Input and output security context router](input-output-pattern.md) | `SEC-IO-ROUTE` | untrusted input, public output, browser security |
| [File handling security context router](file-handling-pattern.md) | `SEC-FILE-ROUTE` | file, attachment, download, preview |
| [Container security context router](container-security-pattern.md) | `SEC-CONTAINER-ROUTE` | Docker, Compose, image, container |
| [Secrets context router](secrets-pattern.md) | `SEC-SECRET-ROUTE` | credential, API key, signing key, secret |

## Validation

Check that every catalog target exists, all rule declarations are unique, relative links resolve, and relevant patterns contain concrete acceptance/rejection evidence guidance. Audit coverage is scoped per request; a checked document is not a passed security control.

## Exceptions

Record the exact affected rule, reason, scope, compensating control, accountable owner, and expiry/review condition through the application's governance process. Rules cannot grant legal authority or operational permissions. Unverified legal requirements remain profile questions.

## Related Patterns

- [Rule authoring](../governance/rule-authoring.md)
- [Pattern template](../templates/pattern-template.md)
- [Application profile](../application/PROFILE.md)
