# Application Definition Intake

Use this interview when initializing an application or materially changing its profile. Inspect what the repository already answers, then ask only about unresolved choices that affect design.

1. Purpose, intended outcomes, users, capabilities, and non-goals.
2. Critical workflows, alternate paths, destructive actions, state transitions, and recovery.
3. Data sensitivity, privacy, retention, audit, external legal/compliance requirements, and accountable owners.
4. Languages/framework versions, platforms, architecture constraints, integrations, and data ownership.
5. Visual language, action hierarchy, density, terminology, accessibility, devices, and localization.
6. State persistence, offline behavior, notifications, background work, and concurrent edits.
7. Environment topology, container use, hosting, secrets, backups, restore targets, and release process.
8. Acceptance criteria, testing commands, performance/reliability expectations, and evidence required.

## Capturing later requests

APP-INTAKE-001 MUST classify a new request as a one-off behavior, reusable candidate, approved variant, exception, or deliberate rule change. APP-INTAKE-002 MUST surface a concrete conflict with the original workflow by rule ID. Do not freeze the original design when an authorized requirement legitimately changes it.

Record answers in PROFILE.md and local domain documents. Unknown values stay explicitly unresolved; do not invent organizational policy.
