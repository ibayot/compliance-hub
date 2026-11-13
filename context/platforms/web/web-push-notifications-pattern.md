---
id: PLAT-WEB-PUSH
status: baseline
scope: "Explicitly requested browser push notifications for authenticated web applications"
triggers:
  - "web push"
  - "browser push notification"
  - "background web notification"
  - "app icon badge"
---

# Web Push Notifications

## Guidelines

Treat Web Push as a separate, user-opted-in notification transport. It does not follow automatically from PWA installability. The installed application keeps the same authentication, account approval, and authorization boundaries as the ordinary web app.

## Why

Push subscriptions outlive a page session and are routed through browser-vendor push services. They need explicit consent, account ownership, a safe service-worker handler, and disclosure that operating systems control delivery, sound, and icon-badge behavior.

## Structure

```text
signed-in user gesture
  -> request browser permission
  -> browser creates PushSubscription
  -> authenticated API binds it to JWT account
  -> encrypt endpoint and browser keys at rest
  -> notification event rechecks current account eligibility
  -> send minimal encrypted push payload
  -> service worker shows generic alert, updates available badge, opens safe same-origin path
  -> normal login and route authorization apply
```

## Store Implementation

- Keep the service worker at the deployed web root and scoped to its real application base path. It must handle push and notification clicks without adding offline caching or intercepting authenticated API/page requests.
- Request permission only from a direct user gesture. Register a subscription only after permission is granted and bind it to the account from the authenticated server request; never accept a client-supplied owner ID.
- Validate HTTPS push endpoints against supported push-service origins to prevent server-side request forgery. Hash endpoints for lookup and store the endpoint and browser encryption keys only as authenticated ciphertext at rest.
- Recheck current account access/approval before delivery. Unsubscribe and remove the account-owned record on logout or opt-out; remove expired endpoints on push-service 404/410 responses.
- Send generic lock-screen content. Do not include ticket IDs, subjects, comments, employee identifiers, account data, or other sensitive text. Include only a validated same-origin relative destination and the unread count needed for an available badge API.
- Push delivery is best-effort and MUST NOT delay persistence, in-app notifications, or the live event channel. Bound payload size and expiry, avoid logging endpoints or keys, and do not silently retry old notifications as new events.
- Keep VAPID credentials and the separate authenticated-encryption key in the server environment. Generate stable keys once; changing them requires an explicit subscription migration/rotation plan. Never put private keys in the browser build.
- Explain platform limits accurately: desktop/Android browser notifications can work without app-store installation; iOS/iPadOS Web Push requires a Home Screen web app on a supported OS. App-icon badges and sound depend on browser, installation state, OS settings, and user permission; never promise that a browser tab can badge while closed.

## Rules

- **PLAT-WEB-PUSH-001** — MUST require a clear user action and granted browser permission before creating a push subscription.
- **PLAT-WEB-PUSH-002** — MUST derive subscription ownership from the authenticated principal and recheck current account approval before each delivery.
- **PLAT-WEB-PUSH-003** — MUST validate remote endpoints, encrypt subscription secrets at rest with a separately managed key, and never log endpoint/key material.
- **PLAT-WEB-PUSH-004** — MUST keep lock-screen payloads generic and limit click destinations to same-origin paths that still pass normal authentication and authorization.
- **PLAT-WEB-PUSH-005** — MUST treat push as best-effort; delivery failures cannot block the durable notification, SSE, or in-app notification flow.
- **PLAT-WEB-PUSH-006** — MUST clear an opt-out/logged-out device subscription and remove expired endpoints; rebind an existing browser subscription only to the currently authenticated account.
- **PLAT-WEB-PUSH-007** — MUST disclose actual browser/OS constraints and must not imply that sound or app-icon badge behavior is guaranteed.

## Validation

Verify secure-context and feature detection; opt-in and opt-out; denied permission; current account access revocation; generic payload redaction; endpoint/key encryption; notification click origin validation; stale endpoint removal; open-page duplicate-sound behavior; service-worker scope; local localhost and production HTTPS behavior. Validate iOS with a Home Screen web app and Android/desktop in their target browsers. Do not claim closed-app badge or audio parity across platforms.

## Related

- [PWA installability](pwa-installability-pattern.md)
- [Security context](../../security/INDEX.md)
- [Compliance Hub administration and unit approval](../../application/compliance-hub/administration.md)
- [Local schema/runtime workflow](../../data/schema-bootstrap-pattern.md)
