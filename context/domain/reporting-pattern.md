---
id: CORE-DOMAIN-REPORTING
status: baseline
scope: domain
owner: application-maintainers
---

# Reporting and Calculation

## Guidelines
DOMAIN-REPORT-001 MUST state authoritative inputs, scope, period/timezone, formula, rounding, exclusions, and snapshot/live semantics.

## Why
Consistent appearance does not guarantee that two dashboards calculate the same measure.

## Structure
~~~text
authorized scoped source -> normalized period
                        -> explicit formula
                        -> labeled result + provenance
~~~

## Implementation
Share calculation logic where semantics are identical. Preserve distinctions when two metrics intentionally differ. Treat exports and charts as consumers of the same defined measure.

## Rules
DOMAIN-REPORT-002 MUST apply permission scope to both aggregates and detail rows.
DOMAIN-REPORT-003 MUST define missing/zero/unknown values and date boundaries.
DOMAIN-REPORT-004 MUST test formula examples, rounding, and report/export reconciliation.

## Validation
Boundary dates, empty period, null inputs, known fixtures, duplicate records, and cross-view totals.
