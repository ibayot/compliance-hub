---
id: CORE-INFRASTRUCTURE-CONFIGURATION
status: baseline
scope: infrastructure
owner: application-maintainers
---

# Environment Configuration

## Guidelines
INFRA-CONFIG-001 MUST identify configuration owner, environment scope, validation, default behavior, and whether a value is public or secret.

## Why
Build-time frontend settings and server runtime settings have different exposure and rollout behavior.

## Structure
~~~text
documented name -> environment source -> startup validation
                -> typed application config -> bounded consumer
~~~

## Implementation
Centralize validation where practical. Use explicit environment file/Compose sets. Record names and safe examples, never real secrets. Frontend-bundled variables are public.

For an initial application, distinguish values required to start locally, values required only by a feature, and optional presentation settings. Provide safe development defaults where possible and document the framework's local environment filename and application working directory. Exercise startup with the documented values and missing required values. The [application build workflow](../workflows/application-build-workflow.md) governs creating safe local configuration and handing off an actual preview; preserve existing environment files and leave owner-supplied secrets explicitly unresolved.

## Rules
INFRA-CONFIG-002 MUST reject missing/invalid security-critical configuration rather than silently use a development fallback in managed production.
INFRA-CONFIG-003 MUST distinguish build-time and runtime changes in deployment instructions.
INFRA-CONFIG-004 MUST avoid printing fully resolved secret-bearing configuration.
INFRA-CONFIG-005 MUST not infer production values from local defaults.

## Validation
Missing/invalid values, wrong environment, client bundle exposure, reload/restart needs, and rollback.
