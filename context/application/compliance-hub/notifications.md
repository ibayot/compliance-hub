---
id: CH-NOTIFY
status: baseline
scope: "Compliance Hub in-app, live, and browser-push notifications"
triggers:
  - "notification"
  - "web push"
  - "browser alert"
  - "notification badge"
---

# Compliance Hub Notifications

## Guidelines

Keep in-app notification records as the durable source of truth. SSE updates the open application; Web Push is a separate, optional device alert that does not replace notification history, email policy, or authorization.

## Why

Background push subscriptions persist beyond the page and use browser-vendor push services. Compliance Hub must keep the subscription account-bound, honor current application access approval, minimize lock-screen disclosure, and preserve normal sign-in and record authorization.

## Structure

```text
business event -> ticket_notifications row -> SSE event for open sessions
                                  \-> optional user-approved Web Push
                                      -> generic lock-screen alert
                                      -> validated same-origin path
                                      -> ordinary authentication and record access
```

## Store Implementation

- Ticketing owns notification persistence, the authenticated push subscription API, encrypted subscription storage, and delivery. A browser subscription is owned by the account derived from the authenticated request; the client cannot select its owner.
- Push delivery rechecks the current Users account-access decision, including active unit approval and the persisted Security Settings capability exemption. If that decision is denied or unavailable, do not send.
- Push subscription endpoint/key material is encrypted at rest with a dedicated Ticketing environment key. The browser's push provider receives the subscription endpoint and encrypted Web Push traffic/transport metadata; the provider may observe delivery timing and routing metadata. The notification body remains generic, with no ticket ID, subject, comment, staff ID, or personal data.
- Push is independent of SMTP, Test Override Email, outbound-email recipient selection, and MFA/recovery email. Never route OTPs or account-recovery codes through browser push.
- Account opt-out and explicit logout remove the current device subscription. A later sign-in can bind that browser subscription only to the newly authenticated account. Expired push endpoints are removed after provider 404/410 responses.
- Push delivery must not block notification persistence or SSE. A failed push is not silently replayed as a new alert; the in-app notification remains available when the user signs in.
- iOS/iPadOS Web Push requires an eligible Home Screen web app and explicit notification permission. Desktop and Android behavior depends on browser support and user permission; sound and icon badges remain controlled by the browser/operating system.

## Rules

- **CH-NOTIFY-001** — MUST retain the durable `ticket_notifications` row and existing in-app/SSE path independently of Web Push configuration or delivery outcome.
- **CH-NOTIFY-002** — MUST send browser push only to an opted-in subscription bound to the currently authenticated and currently approved account.
- **CH-NOTIFY-003** — MUST keep the push payload generic and must not include ticket content, identifiers, staff identity, MFA codes, or recovery links.
- **CH-NOTIFY-004** — MUST keep browser push separate from email toggles and routes; only ordinary in-app notifications may produce a Web Push alert.
- **CH-NOTIFY-005** — MUST keep push delivery best-effort and remove invalid endpoint records without changing the notification or ticket state.
- **CH-NOTIFY-006** — MUST disclose browser/OS installation, permission, badge, and sound limits accurately; never promise delivery or badges on unsupported contexts.

## Validation

Verify an eligible opt-in, unauthorized/denied account, unavailable approval service, account switch/logout, generic payload, existing notification record/SSE despite push failure, expired endpoint cleanup, safe notification click, SMTP disabled and enabled, and an iOS Home Screen installation on a supported iOS version. Test mobile delivery over the deployed HTTPS origin; a LAN IP over plain HTTP is not a secure service-worker context.

## Related

- [Web Push pattern](../../platforms/web/web-push-notifications-pattern.md)
- [Administration and current unit approval](administration.md)
- [Ticketing notification semantics](ticketing.md)
- [Application access rules](../../security/authorization-pattern.md)
