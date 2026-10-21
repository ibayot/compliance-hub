# Consistency Edit Workflow

1. Audit the target controls/pages against exact pattern IDs.
2. Resolve legitimate variants and existing exceptions.
3. Select the canonical contract and list affected consumers.
4. Plan a bounded adoption pass; identify intended presentation changes.
5. Preserve handlers, capability/ownership guards, state transitions, payloads, and navigation.
6. Validate representative variants and affected behavior.
7. Update the implementation/coverage map with migration status.

WF-CONSISTENCY-001 MUST not silently merge distinct controls, such as action menus and value selectors. WF-CONSISTENCY-002 MUST report partial migration accurately. WF-CONSISTENCY-003 MUST preserve accessible names, keyboard behavior, and visible focus when standardizing appearance.

Use [the audit pattern](../quality/consistency-audit-pattern.md) to avoid rediscovery.
