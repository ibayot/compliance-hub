# Administration and Capability Overlay

## Guidelines and structure

Capability definitions and grants -> backend route checks -> record/unit policies -> frontend discoverability. Staff-directory identities, pending identities, and active accounts are separate states.

## Rules

- CH-ADMIN-001 MUST define new privileged actions through the existing capability model where applicable.
- CH-ADMIN-002 MUST enforce backend checks even when the UI hides the action.
- CH-ADMIN-003 MUST preserve resource ownership and unit scope beyond a broad capability check.
- CH-ADMIN-004 MUST update capability storage/bootstrap, checker/decorator use, frontend type/admin controls, and tests together when adding a capability.
- CH-ADMIN-005 MUST treat staff-directory failure as an explicit failure state; do not silently remove already valid active accounts.
- CH-ADMIN-006 MUST avoid granting privileges based on a display role label alone.

## Implementation

[RequireCapability](../../../backend/src/common/decorators/require-capability.decorator.ts) declares coarse requirements; [CapabilityGuard](../../../backend/src/common/guards/capability.guard.ts) evaluates known checkers. Its array requirement currently means any matching capability, not all. Services still need record-level predicates. [Frontend auth types](../../../frontend/src/lib/types/auth.ts) support UI visibility.

## Validation

Test no session, missing/unknown capability, changed grants, record scope, pending directory identity, unavailable directory, and direct endpoint access. Do not infer that all endpoints already use the same authorization scheme.
