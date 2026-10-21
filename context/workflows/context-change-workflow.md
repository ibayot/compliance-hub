# Context Change Workflow

1. Identify the source request, rule gap/conflict, and intended scope.
2. Inspect the owning rule, code evidence, dependencies, and consumers.
3. Classify as editorial, baseline clarification, new candidate, approved variant, exception, or architecture decision.
4. Update the owning file and links; avoid duplicate declarations.
5. Update profile/routing, index, inventory, decisions, or exceptions when affected.
6. Run the context validator and representative routing scenarios.
7. Report context changes and any prospective adoption work.

WF-CONTEXT-001 MUST not modify application behavior while fulfilling a context-only request. WF-CONTEXT-002 MUST not claim that writing a rule remediates existing code. WF-CONTEXT-003 MUST preserve the context library's visibility in repository/agent ignore policies.
