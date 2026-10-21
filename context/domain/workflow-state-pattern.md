---
id: CORE-DOMAIN-WORKFLOW-STATE
status: baseline
scope: domain
owner: application-maintainers
---

# Business Workflow and State Machine

## Guidelines
DOMAIN-STATE-001 MUST document actors, preconditions, transitions, guards, side effects, and terminal/recovery states.

## Why
A status dropdown is only a view of a business protocol; arbitrary status edits can invalidate its history.

## Structure
~~~text
current state + actor capability + resource facts + command
  -> validate transition -> atomic mutation
  -> audit + notification intent -> next state
~~~

## Store Implementation
The authoritative service owns current state and transition history. The UI stores an unsaved command, not an independent business state.

## Rules
DOMAIN-STATE-002 MUST reject invalid transitions at the backend.
DOMAIN-STATE-003 MUST define retry, cancellation, correction, and concurrent-update behavior.
DOMAIN-STATE-004 MUST distinguish correction of historical facts from a new transition.

## Validation
Transition matrix including denied actors, terminal states, duplicate commands, and concurrent changes.
