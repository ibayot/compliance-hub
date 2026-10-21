---
id: DS-DASHBOARD
status: baseline
scope: design-system
triggers:
  - "dashboard"
  - "summary metrics"
  - "overview"
---

# Dashboard Page Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Organize summaries around user tasks, with explicit metric meaning, scope, freshness, and drill-down.

## Why

Visual consistency is insufficient when different tiles silently use different time windows or populations.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Dashboard(scope, period)
Metric(label, value, unit, sourceTime, drillDown?)
Section(relatedMetrics, status)
```

## Store Implementation

Query owners manage independent metric freshness/errors. Shared period/scope state is explicit; derive presentation from source values.

## Rules

- **DS-DASHBOARD-001** — Each metric MUST define population, unit, period, and relevant freshness.
- **DS-DASHBOARD-002** — Loading, failed, zero, unavailable, and restricted values MUST remain distinguishable.
- **DS-DASHBOARD-003** — Drill-down MUST preserve compatible scope/filter meaning.
- **DS-DASHBOARD-004** — Partial dashboard failure MUST not make successful independent regions appear failed.
- **DS-DASHBOARD-005** — Charts MUST use documented aggregation and accessible alternatives.

## Accessibility

Provide text equivalents for key metrics/charts, meaningful headings, readable formats, and non-color distinctions.

## Security and Permissions

Aggregate results and counts require authorized scope; aggregation is not automatic anonymization.

## Validation

Compare metrics to source queries; test partial failure, empty/zero, changed period, permissions, and responsive order.

## Related Patterns

- [card-pattern ](../components/data-display/card-pattern.md)
- [date-and-number-format-pattern ](../content-patterns/date-and-number-format-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
