---
id: CORE-DOMAIN-NOTIFICATION
status: baseline
scope: domain
owner: application-maintainers
---

# Notification Workflow

## Guidelines
DOMAIN-NOTIFY-001 MUST define event trigger, recipients, permitted content, delivery channel, preferences, and duplicate behavior.

## Why
Notifications can disclose data or misrepresent an operation that has not committed.

## Structure
~~~text
committed event -> recipient policy -> channel projection
                -> delivery attempt -> status/retry/reconciliation
~~~

## Implementation
Separate business truth from email/push delivery. Define localization, link authorization, expiry, and unsubscribe/preferences where relevant.

## Rules
DOMAIN-NOTIFY-002 MUST authorize recipients and destination links independently.
DOMAIN-NOTIFY-003 MUST avoid duplicate external effects when retrying.
DOMAIN-NOTIFY-004 MUST not equate message delivery with user acknowledgment.

## Validation
No recipients, unauthorized recipient, changed permissions, provider failure, duplicates, stale/deep links, and safe content.
