---
id: CORE-INFRASTRUCTURE-DEPLOYMENT
status: baseline
scope: infrastructure
owner: application-maintainers
---

# Deployment

## Guidelines
INFRA-DEPLOY-001 MUST specify revision/artifact, target environment, configuration, schema compatibility, health checks, and rollback strategy.

## Why
A build passing locally does not establish deployability with existing data or another environment.

## Structure
~~~text
verified artifact -> preflight -> backup/migration if needed
                  -> rollout -> readiness + smoke -> observe
failure -> bounded rollback/recovery
~~~

## Implementation
Promote immutable artifacts where supported. Keep local overrides separate from managed environments. Define order for mutually dependent services/schema and any downtime.

## Rules
INFRA-DEPLOY-002 MUST verify exact target and authorized deployment scope.
INFRA-DEPLOY-003 MUST not reuse local test transport or debug settings silently.
INFRA-DEPLOY-004 MUST check schema rollback compatibility before reverting an application image.

## Validation
Fresh and upgrade paths, health, login/critical workflow, retained files, version consistency, and rollback rehearsal appropriate to risk.
