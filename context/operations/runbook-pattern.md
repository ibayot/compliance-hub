---
id: CORE-OPERATIONS-RUNBOOK
status: baseline
scope: operations
owner: application-maintainers
---

# Runbook and Diagnostics

## Guidelines
OPS-RUNBOOK-001 MUST state symptom, scope, prerequisites, read-only checks, bounded remediation, verification, and escalation.

## Why
A reproducible runbook lowers investigation cost while keeping risky commands deliberate.

## Structure
~~~text
symptom -> evidence -> likely cause -> authorized action
        -> exact target -> expected output -> verification
~~~

## Implementation
Use safe variables/placeholders, explicit working directories, and environment selection. Mark mutating/destructive commands and recovery requirements. Do not embed credentials or broad cleanup commands.

## Rules
OPS-RUNBOOK-002 MUST keep diagnostic requests read-only unless change is authorized.
OPS-RUNBOOK-003 MUST redact exported logs/configuration.
OPS-RUNBOOK-004 MUST update a runbook when a repeated incident reveals an invalid assumption.

## Validation
Review commands against actual scripts and a safe environment; record observed outcomes and unresolved steps.
