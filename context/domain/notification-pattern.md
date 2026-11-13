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

Evaluate current account and channel eligibility at dispatch when policy can change after enqueue. Keep the original recipient or account identity separate from any approved delivery override. Classify privileged messages such as authentication codes by trusted producer metadata. Own listener registration separately from transport reconfiguration, and distinguish queue acceptance, provider acceptance and confirmed delivery in status reporting.

## Rules
DOMAIN-NOTIFY-002 MUST authorize recipients and destination links independently.
DOMAIN-NOTIFY-003 MUST avoid duplicate external effects when retrying.
DOMAIN-NOTIFY-004 MUST not equate message delivery with user acknowledgment.

DOMAIN-NOTIFY-005 MUST enforce the applicable eligibility policy on the original account before applying a delivery override. Check destination restrictions separately when policy requires them. An override cannot grant account access.

## Validation
No recipients, unauthorized recipient, changed permissions, provider failure, duplicates, stale/deep links, and safe content. Repeat settings reload and provider reconfiguration, then publish once and verify one intended dispatch. Test permitted and denied accounts, an alternate test destination, and policy changes between enqueue and dispatch.
