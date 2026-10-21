# Governance Records Overlay

## Guidelines

Issuances, their source evidence and relationships, compliance applicability, incidents, and cybersecurity records require distinct status and provenance semantics.

## Rules

- CH-GOVREC-001 MUST preserve primary source, lifecycle history, applicability decision, and responsible party when changing issuance workflows.
- CH-GOVREC-002 MUST distinguish legal/regulatory, standards, internal issuance, and operational registers using the existing data contract.
- CH-GOVREC-003 MUST NOT present AI-generated or inferred obligations as verified legal determinations.
- CH-GOVREC-004 MUST preserve date precision where the source does not establish an exact date.
- CH-GOVREC-005 MUST scope sensitive incident/cybersecurity records and exports to authorized capabilities.
- CH-GOVREC-006 MUST preserve reporting snapshot and period semantics when changing record displays.

## Structure and validation

Source -> evidence -> assessment -> accountable decision -> action/status -> audit. Inspect [issuance contract](../../../frontend/src/app/api/references.ts) and the owning service before editing fields. Test missing/uncertain dates, excluded records, amended relationships, unauthorized exports, and retained history.
