# Emergency Fix Workflow

1. Establish impact, authorized target, and smallest safe intervention.
2. Load the critical boundary rules and inspect evidence.
3. Preserve a rollback/recovery path and required audit trail.
4. Apply a focused fix and minimum meaningful verification.
5. Record skipped checks and a bounded temporary exception when necessary.
6. Verify restoration and schedule remaining validation/context cleanup.

WF-EMERGENCY-001 MUST not interpret urgency as permission to bypass authentication, destroy data, or deploy to an unapproved target. WF-EMERGENCY-002 MUST distinguish immediate restoration from full root-cause resolution.
