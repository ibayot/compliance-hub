---
id: CORE-INFRASTRUCTURE-OBSERVABILITY
status: baseline
scope: infrastructure
owner: application-maintainers
---

# Observability

## Guidelines
INFRA-OBS-001 MUST correlate failures across request, service, job, and relevant business resource without unnecessary sensitive content.

## Why
Useful diagnostics reduce repeated investigation; excessive raw payload logging creates exposure.

## Structure
~~~text
request/job correlation + service + operation + outcome
metrics -> latency/error/saturation
trace/log -> bounded detail for diagnosis
audit -> accountable business event
~~~

## Implementation
Use the application's logger/correlation mechanism. Separate liveness, readiness, dependency state, and business processing status. Define alert ownership and avoid high-cardinality personal-data labels.

## Rules
INFRA-OBS-002 MUST redact tokens, passwords, and restricted payload fields.
INFRA-OBS-003 MUST make degraded optional dependencies distinguishable from failed critical dependencies.
INFRA-OBS-004 SHOULD measure user-relevant outcomes rather than only process uptime.

## Validation
Trace a failure end-to-end, inspect redaction, simulate dependency loss, and confirm actionable health/alerts.
