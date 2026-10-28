# Context Change Workflow

1. Identify the source request, rule gap/conflict, and intended scope.
2. Inspect the owning rule, code evidence, dependencies, and consumers.
3. Classify as editorial, baseline clarification, new candidate, approved variant, exception, or architecture decision.
4. Update the owning file and links; avoid duplicate declarations.
5. Update profile/routing, index, inventory, decisions, or exceptions when affected.
6. Run the context validator and representative routing scenarios.
7. Report context changes and any prospective adoption work.

WF-CONTEXT-001 MUST not modify application behavior while fulfilling a context-only request. WF-CONTEXT-002 MUST not claim that writing a rule remediates existing code. WF-CONTEXT-003 MUST preserve the context library's visibility in repository/agent ignore policies.

## Promoting lessons between repositories

Review the current shared baseline before adding a rule: the lesson may already be covered. Generalize the failed invariant and proving check into its single owning pattern; keep product names, actual identifiers, schemas, timings, role grants, credentials and local evidence in the application's overlay. Record application-specific choices separately from reusable requirements. Update relevant routes, inventories and library versions/locks without claiming that documentation repairs application code.

For a project predating managed adoption, inspect local/shared differences and preserve its profile, domain rules, decisions, evidence policy and existing instructions. A reviewed guidance-only merge is not a verified managed installation: do not fabricate an adoption receipt or silently replace local files with neutral templates. Record source revision, selected coverage and intentional omissions. Library tests, application tests and real runtime acceptance remain separate evidence.
