---
id: PLAT-INDEX
status: baseline
scope: "Execution target and distribution context routing"
triggers:
  - "web, mobile, desktop, API, worker, or CLI behavior"
---

# Platform Context

## Guidelines

Load only the execution targets enabled in [the application profile](../application/PROFILE.md) and affected by the request. A hybrid mobile app may require both web and mobile guidance plus its framework bridge; using one shared UI does not make all runtime behavior identical.

## Why

Lifecycle, permissions, storage, navigation, packaging, and recovery depend on where software runs. These concerns are separate from programming-language style.

## Structure

- [Web Platform](web/INDEX.md) — `web`
- [Mobile Platform](mobile/INDEX.md) — `mobile`
- [Desktop Platform](desktop/INDEX.md) — `desktop`
- [API Platform](api/INDEX.md) — `api`
- [Worker Platform](worker/INDEX.md) — `worker`
- [CLI Platform](cli/INDEX.md) — `cli`

## Implementation

Determine the real target artifacts and supported OS/browser versions. For a shared feature, evaluate each affected target's differences rather than assuming a successful web test proves mobile/desktop behavior. Backend API/worker packs describe contracts and lifecycles, not a mandate to add services.

For Compliance Hub, desktop-native guidance is inactive. Mobile guidance follows the actual Capacitor/native targets in the profile; Android build scripts do not establish tested iOS distribution.

## Rules

- `PLAT-ROUTE-001` MUST select supported targets from the profile and actual deployment/build evidence.
- `PLAT-ROUTE-002` MUST validate target-specific behavior when a shared change can affect lifecycle, storage, permissions, navigation, or distribution.
- `PLAT-ROUTE-003` MUST NOT infer support for a platform solely from a dependency or documentation folder.

## Validation

State which targets were checked and any supported target that could not be exercised. Validate links/profile routing for documentation work; use representative target artifacts/devices for implementation changes.

## Related

[Technology packs](../technology/INDEX.md), [application profile](../application/PROFILE.md), [security](../security/INDEX.md), [validation matrix](../quality/validation-matrix.md).
