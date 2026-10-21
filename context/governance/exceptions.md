# Exception Policy

- GOV-EXC-001 MUST identify the exact rule, bounded scope, rationale, risk, owner, and approval/source of authority.
- GOV-EXC-002 MUST state a review or expiry condition and a removal/migration action for temporary exceptions.
- GOV-EXC-003 MUST record active exceptions in [the register](../exceptions/INDEX.md).
- GOV-EXC-004 SHOULD turn a recurring legitimate exception into a documented variant.
- GOV-EXC-005 MUST NOT use an exception record to grant permissions the task or platform does not provide.

Routine implementation decisions already authorized by the request do not need a new approval ceremony. Material changes to security, product workflows, architecture, or external state require the authority appropriate to that change.

Use [the exception template](../templates/exception-template.md). A historical discrepancy can be recorded as technical debt without pretending it was approved.
