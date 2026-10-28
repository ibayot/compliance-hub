---
id: API-CLIENT-UPDATE
status: baseline
scope: client build discovery and session-preserving update refresh
owner: application-maintainers
triggers: [version manifest, frontend update check, build refresh, deployment reload]
---

# Client Update Discovery

## Guidelines

When automatic update discovery is selected, separate the small version/build signal from authentication, dependency readiness and reload policy. A static manifest check is not an account-data API, a session heartbeat or proof that a deployment is usable.

## Why

Unbounded polling wastes requests; an update served before its API is ready can turn a routine deployment into failed navigation or avoidable sign-in. Conversely, treating a public build identifier as a credential confuses what the endpoint actually exposes.

## Structure

~~~text
visible/foreground client + bounded discovery trigger
  -> small validated build signal -> loaded/deployed comparison
  -> readiness and unsaved-work policy -> guarded refresh or actionable notice
session renewal/rejection/logout remains owned by authentication
~~~

## Store Implementation

The client lifecycle owner manages one in-flight check, visibility/online/focus hooks, cancellation, interval and listener cleanup. The application profile chooses the interval and behavior for background, offline and native clients; do not copy one application's timer into every product. Disallow overlapping checks and account for active clients/tabs when assessing request volume. A deterministic test clock must distinguish intended intervals from incidental elapsed startup time.

A public manifest contains only approved release/build metadata. For a public static signal, omit credentials and keep it outside authentication renewal paths. Validate bounded shape/identity and content type; do not treat its data as executable code or an arbitrary navigation destination. Use the selected cache contract so old cached metadata cannot cause endless reloads. Malformed, missing or temporarily unavailable metadata is a bounded retry/notice condition, not a reason to invent a version or clear a session.

Define whether a deployment refresh waits for relevant dependencies, prompts about dirty work, preserves navigation, or requires an explicit owner action. Keep loop guards bounded and tied to the actual target build. Client recovery must respect definitive credential rejection, explicit sign-out and the selected authenticated-route boundary. Do not resurrect an account on a public login screen merely because a new build was found. An installed native bundle may need store/package delivery rather than a web reload; verify its real asset origin and update path.

## Rules

- API-UPDATE-001 MUST define the selected discovery triggers, interval/cache contract, aggregate request budget, background/offline behavior and lifecycle cleanup; avoid overlapping work.
- API-UPDATE-002 MUST restrict a public build signal to approved non-secret metadata, omit credentials for that public static request and validate bounded input without executing it or accepting arbitrary redirect destinations.
- API-UPDATE-003 MUST distinguish metadata retrieval, actual dependency readiness and end-user workflow success; receiving a new build identifier is not release acceptance.
- API-UPDATE-004 MUST define reload-loop prevention, navigation/unsaved-work behavior and recovery for stale assets or temporarily unavailable dependencies before automatic refresh is enabled.
- API-UPDATE-005 MUST preserve the authentication owner's expiry/revocation/sign-out rules; update discovery cannot grant access, unlock an idle session or silently recover an explicitly signed-out account.
- API-UPDATE-006 MUST validate web and packaged/native update behavior separately when both are supported; browser evidence alone does not prove native bundle delivery.

## Validation

Check unchanged/changed/malformed signals, credential omission on public requests, visible/hidden/focus/online behavior, controlled interval assertions, concurrent triggers, unavailable APIs during deployment, stale-cache loops, dirty drafts, navigation and sign-out intent. Inspect manifest fields and actual request behavior rather than assuming either safety or danger from the endpoint's name. Do not load-test a live service or perform a deployment as part of a documentation-only check. Related: [session lifecycle](../security/identity/session-pattern.md), [frontend state](../architecture/frontend-pattern.md) and [validation](../quality/validation-matrix.md).
