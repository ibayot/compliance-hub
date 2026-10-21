---
id: CORE-OPERATIONS-HEALTH-ALERTING
status: baseline
scope: operations
owner: application-maintainers
---

# Health and Alerting

## Guidelines
OPS-HEALTH-001 MUST define what each health signal proves and the action a failed signal requires.

## Why
An HTTP 200 from a process is not proof that its database, queue, or critical workflow is usable.

## Structure
~~~text
liveness -> process functioning
readiness -> can serve required traffic
dependency/worker metric -> degraded or failed work
alert -> owner + symptom + diagnostic/runbook
~~~

## Implementation
Bound check timeouts, avoid expensive scans, and distinguish optional degradation. Keep health output safe for its exposure.

## Rules
OPS-HEALTH-002 MUST avoid restart storms caused by treating all downstream failures as dead processes.
OPS-HEALTH-003 SHOULD alert on meaningful changes and actionable sustained symptoms.
OPS-HEALTH-004 MUST document check false positives and blind spots.

## Validation
Critical/optional dependency loss, timeout, process hang, recovery, and alert routing.
