# Container Change Workflow

1. Identify Dockerfile/Compose files, effective override order, image, service, network, volume, and target environment.
2. Load only the changed container patterns plus security/configuration.
3. Inspect data persistence, build secret exposure, health/readiness, and startup/shutdown.
4. Validate configuration without printing resolved secrets.
5. Build/run only within authorized environment and scope.
6. Verify health, dependent service behavior, persistent data, and rollback.
7. Update container inventory and runbook when contracts changed.

WF-CONTAINER-001 MUST avoid volume removal or broad prune/reset actions during ordinary container validation. WF-CONTAINER-002 MUST separate local overrides from deployable environment definitions.
