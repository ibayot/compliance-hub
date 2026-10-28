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
- CH-ADMIN-007 MUST restrict changes to the application-wide idle screen-lock duration to Security Settings capability holders. Store whole minutes from 1 to 1440 (one day) with a 15-minute default; zero does not disable locking. Authenticated clients receive only the duration through the session-policy projection. Measure idle time from user activity, never from heartbeat or policy refreshes; applying a changed duration must preserve the last-activity time and must not unlock an already locked session. This setting controls the existing client screen lock, not token expiry or server-session revocation.
- CH-ADMIN-008 MUST recover a valid existing session only within protected application routes. Login, MFA, public pages and explicit sign-out must not silently restore an account. Temporary network/service failures preserve credentials and previously verified state; initial access remains blocked until profile and capabilities are verified. Retry only session reads with capped backoff and at most one renewal per failed request, sharing renewal across concurrent callers and serializing browser-cookie rotation across tabs where supported. Definitive expiry/revocation/account rejection still requires sign-in. Explicit sign-out must cancel pending recovery and remain effective during an outage; only successful interactive sign-in/MFA clears that intent. Preserve idle locks during recovery and wait for API readiness before a new-build page reload.

## Implementation

- CH-ADMIN-009 MUST accept an authenticated account's unchanged, format-valid Staff ID during profile/password-reset completion without requiring a successful external-list lookup. Resolve that account ID from server authentication, never caller-supplied ownership. Changed nonempty Staff IDs retain approved-list validation and duplicate-account protection; enforce self-update validation at the backend as well as the UI. Do not rewrite saved identity, bypass password policy or infer that a different person's ID belongs to the caller. Directory failures must not invalidate an already established unchanged identity (CH-ADMIN-005).

Update detection under CH-ADMIN-008 uses a public static manifest containing only version/build identity. Check every two minutes only while visible, and on focus/online/visibility return. Omit cookies on manifest requests, bound valid build IDs, preserve the in-flight/reload-loop guards and wait for API readiness before refreshing protected app pages. This is frontend update detection, not session renewal or an account-data endpoint.

[RequireCapability](../../../backend/src/common/decorators/require-capability.decorator.ts) declares coarse requirements; [CapabilityGuard](../../../backend/src/common/guards/capability.guard.ts) evaluates known checkers. Its array requirement currently means any matching capability, not all. Services still need record-level predicates. [Frontend auth types](../../../frontend/src/lib/types/auth.ts) support UI visibility.

## Validation

Test no session, missing/unknown capability, changed grants, record scope, pending directory identity, unavailable directory, and direct endpoint access. Do not infer that all endpoints already use the same authorization scheme.
