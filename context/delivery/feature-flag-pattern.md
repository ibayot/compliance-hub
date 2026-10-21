---
id: CORE-DELIVERY-FEATURE-FLAG
status: baseline
scope: delivery
owner: application-maintainers
---

# Feature Flags

## Guidelines
DELIVERY-FLAG-001 MUST state owner, default, environment/audience, removal condition, and fallback behavior.

## Why
Unowned flags multiply combinations and can accidentally bypass security or leave incomplete code active.

## Structure
~~~text
validated flag + permitted audience -> feature branch
disabled -> known supported behavior
~~~

## Implementation
Keep flags distinct from authorization. Server decisions remain authoritative. Classify build-time versus runtime flags and cache/reload implications.

## Rules
DELIVERY-FLAG-002 MUST not use a flag as the sole permission check.
DELIVERY-FLAG-003 MUST test enabled, disabled, and failure-to-load behavior.
DELIVERY-FLAG-004 SHOULD remove expired flags and obsolete branches.

## Validation
Audience isolation, defaults, rollback, stale cache, and cleanup plan.
