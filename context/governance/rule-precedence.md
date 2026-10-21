# Local Rule Precedence

Project Markdown cannot override system/developer instructions, tool permissions, or the user's authorized scope.

Within this library, use specific approved application requirements and decisions to select among compatible baseline variants. Security, privacy, legal, accessibility, and integrity constraints must be addressed explicitly; a convenience or appearance preference cannot silently weaken them. An older architecture decision can be revised when the current authorized requirement calls for it, with the impact recorded.

- GOV-CONFLICT-001 MUST identify the conflicting rule IDs and affected workflow.
- GOV-CONFLICT-002 MUST separate genuine contradiction from variants that apply to different contexts.
- GOV-CONFLICT-003 MUST explain material consequences before implementing a newly authorized deviation.
- GOV-CONFLICT-004 MUST seek direction only when authority or a material product choice is missing.
- GOV-CONFLICT-005 MUST NOT treat existing inconsistent code as an automatic exception.

Resolve by following the current rule, recording a scoped exception, or revising the owning rule and assessing its consumers. Record the decision; do not create competing copies of the rule.
