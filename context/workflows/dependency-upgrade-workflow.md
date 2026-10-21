# Dependency Upgrade Workflow

1. Identify installed/locked/runtime versions and affected packs.
2. Read official migration/release guidance for the exact target.
3. Assess API, configuration, native/container, security, and build compatibility.
4. Upgrade the smallest coherent dependency set.
5. Validate affected builds and behavioral tests.
6. Update profile version evidence, patterns, and examples where semantics changed.
7. Record rollback and remaining incompatibilities.

WF-UPGRADE-001 MUST not apply the latest documentation's API blindly to an older installed major version. WF-UPGRADE-002 MUST distinguish dependency changes from application release/version policy.
