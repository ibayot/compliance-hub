---
id: CORE-API-AND-INTEGRATIONS-REST-CONTRACT
status: baseline
scope: api-and-integrations
owner: application-maintainers
---

# REST Contract

## Guidelines
API-REST-001 MUST define request/response types, validation, authentication, authorization, and failure status semantics.

## Why
Explicit contracts keep UI, services, integrations, and tests aligned.

## Structure
~~~text
method + path + actor scope
request schema -> validation -> domain result
response projection + status + documented errors
~~~

## Implementation
Separate persistence entities from public DTOs. Preserve absent/null/empty distinctions where meaningful. Define bounded pagination/filter/sort and compatibility strategy.

## Rules
API-REST-002 MUST use safe read methods without business mutations.
API-REST-003 MUST apply authorization to collection counts, detail records, and exports.
API-REST-004 MUST version or migrate breaking contracts deliberately.
API-REST-005 MUST validate runtime input; language types alone do not validate network payloads.

## Validation
Contract samples, boundary values, unknown fields, invalid identifiers, authorized/denied requests, and old consumers.

[HTTP method semantics](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods) distinguish safe and idempotent methods.
