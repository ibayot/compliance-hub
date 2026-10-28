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

Define each cohort separately: records created/received in a period, work effectively completed in it, and intervals overlapping it need not be the same population. Where approved corrections exist, document effective event time versus recorded update time and use the intended source consistently without erasing history. State calendar/timezone, cutoff, current versus historical ownership/settings, and any missing historical snapshots.

Operational elapsed time, business working time and credited/capped allowance time are different measures. Capture authoritative interval type/boundaries when required; automatic calendar suspension is not necessarily a user-triggered interruption. Clip intervals to the period and effective endpoint. An episode spanning periods may count in each monthly view without becoming multiple distinct lifetime episodes.

Unknown event count/duration must not become zero. Preserve known history and explicitly classify estimates, incomplete coverage and unavailable values. Exclude unusable observations from defined averages and disclose eligible denominators. A rate with no eligible observations is unavailable unless the approved contract deliberately defines another meaning. Use the [report-builder pattern](report-builder-pattern.md) for selectable fields, templates, scope-specific dimensions and readable exports.

## Rules
DOMAIN-REPORT-002 MUST apply permission scope to both aggregates and detail rows.
DOMAIN-REPORT-003 MUST define missing/zero/unknown values and date boundaries.
DOMAIN-REPORT-004 MUST test formula examples, rounding, and report/export reconciliation.

DOMAIN-REPORT-005 MUST define effective event time, cohort membership, interval clipping and current-versus-historical ownership/settings explicitly; approved corrections must be applied consistently without rewriting recorded history.
DOMAIN-REPORT-006 MUST preserve unknown-versus-zero and estimate/coverage distinctions, disclose eligible denominators and avoid fabricating missing historical intervals or presenting incomplete totals as exact.
DOMAIN-REPORT-007 MUST distinguish operational elapsed, business and credited/capped durations where they differ and prevent one metric from silently substituting for another.

## Validation
Boundary dates, empty period, null inputs, known fixtures, duplicate records, and cross-view totals.
