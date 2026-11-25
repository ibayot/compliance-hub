---
id: CH-NOTIFY
status: baseline
scope: "FO2 iCare in-app, live, browser Web Push, and Android app notifications"
triggers:
  - "notification"
  - "web push"
  - "browser alert"
  - "notification badge"
  - "Android FCM"
---

# Compliance Hub Notifications

## Guidelines

Keep in-app notification records as the durable source of truth. SSE updates the open application; Android APK FCM and browser Web Push are separate, optional device alerts that do not replace notification history, email policy, or authorization.

## Why

Background push registrations persist beyond the page and use platform providers. FO2 iCare must keep each registration account-bound, honor current application access approval, minimize lock-screen disclosure, and preserve normal sign-in and record authorization.

## Structure

```text
business event -> ticket_notifications row -> SSE event for open sessions
                                  \-> optional approved Android FCM / browser Web Push
                                      -> generic lock-screen alert
                                      -> ordinary authentication and record access
```

## Store Implementation

- Ticketing owns notification persistence, the authenticated push subscription API, encrypted subscription storage, and delivery. A browser subscription is owned by the account derived from the authenticated request; the client cannot select its owner.
- Push delivery rechecks the current Users account-access decision, including active unit approval and the persisted Security Settings capability exemption. If that decision is denied or unavailable, do not send.
- Push subscription endpoint/key material is encrypted at rest with a dedicated Ticketing environment key. The browser's push provider receives the subscription endpoint and encrypted Web Push traffic/transport metadata; the provider may observe delivery timing and routing metadata. A per-device preview preference may select an allowlisted event summary; it never includes a ticket ID, subject, comment text, staff ID, or personal data.
- Push is independent of SMTP, Test Override Email, outbound-email recipient selection, and MFA/recovery email. Never route OTPs or account-recovery codes through browser push.
- Account opt-out and explicit logout remove the current device subscription. A later sign-in can bind that browser subscription only to the newly authenticated account. Expired push endpoints are removed after provider 404/410 responses.
- Push delivery must not block notification persistence or SSE. A failed push is not silently replayed as a new alert; the in-app notification remains available when the user signs in.
- The signed FO2 iCare Android APK uses native Firebase Cloud Messaging. The Firebase client configuration is public app configuration; the distinct Firebase service-account JSON is a Ticketing-only server secret mounted read-only outside the repository. Ticketing stores an encrypted Firebase Installation ID with a keyed hash and account/device binding. The transient Android launch fragment is removed by frontend startup and is never treated as authentication.
- Recheck current account approval before every FCM send. Explicit logout removes that Android device registration. A per-device preview preference may select an allowlisted event summary and public lock-screen visibility; details remain excluded. When FCM accepts an alert for a device, suppress Web Push only for a subscription carrying that same device ID; otherwise retain browser Web Push fallback.
- Android app alerts use a stable notification channel and Android 13+ permission. Vivo/BBK direct badge updates require the manifest permission `com.vivo.notification.permission.BADGE_ICON` and the background receiver flag on the package-targeted launcher broadcast; preserve the standard notification-number badge path as a fallback. Permission denial, disabled channel sound, and launcher badge behavior remain controlled by Android settings. A provider-accepted test is not proof of device delivery.
- iOS/iPadOS Web Push requires an eligible Home Screen web app and explicit notification permission. Desktop and Android behavior depends on browser support and user permission; sound and icon badges remain controlled by the browser/operating system.

## Rules

- **CH-NOTIFY-001** — MUST retain the durable `ticket_notifications` row and existing in-app/SSE path independently of Web Push configuration or delivery outcome.
- **CH-NOTIFY-002** — MUST send browser push only to an opted-in subscription bound to the currently authenticated and currently approved account.
- **CH-NOTIFY-003** — MUST keep the push payload generic and must not include ticket content, identifiers, staff identity, MFA codes, or recovery links.
- **CH-NOTIFY-004** — MUST keep browser push separate from email toggles and routes. Send routine Web Push for ordinary in-app notifications. A user-initiated device test follows CH-NOTIFY-007.
- **CH-NOTIFY-005** — MUST keep push delivery best-effort and remove invalid endpoint records without changing the notification or ticket state.
- **CH-NOTIFY-006** — MUST disclose browser/OS installation, permission, badge, and sound limits accurately; never promise delivery or badges on unsupported contexts.
- **CH-NOTIFY-007** — MUST restrict a test alert to the currently signed-in account and that device's saved subscription. Rate-limit tests, keep them outside notification history and unread counts, and distinguish provider acceptance from actual device delivery. Use the existing push transport and generic lock-screen content.
- **CH-NOTIFY-008** — MUST keep Android APK FCM separate from browser Web Push and retain durable in-app notification/SSE delivery if either external provider is unavailable.
- **CH-NOTIFY-009** — MUST bind encrypted Android FCM installation registrations to the authenticated account, recheck current account approval on every send, and remove the device registration on explicit logout.
- **CH-NOTIFY-010** — MUST keep FCM test alerts device-scoped, rate-limited, generic, and outside notification history/unread counts; label provider acceptance separately from device delivery.
- **CH-NOTIFY-011** — MUST tell users when their installed Android launcher needs an update before it can register with Firebase Messaging. When a test fails without a confirmed expired registration, keep the user's saved Android alert setting.
- **CH-NOTIFY-012** — MUST emit scheduled SLA sounds separately from the bell, unread count, notification history and email. Target the current assignee and active ticket administrators with current account approval. Start at the existing Nearing SLA threshold, repeat at 30%, 20%, and 10% remaining, then sound at breach and each five elapsed SLA working minutes. Skip paused, frozen, waiting, resolved and completed work. Do not replay missed sounds in a burst. Coalesce sounds in each pass per recipient, with overdue taking priority.
- **CH-NOTIFY-013** — MUST use the authoritative unread count for Android's badge-bearing summary and update or clear it after reading, without adding test alerts or SLA sounds to the count. Android may display a dot or number depending on the launcher and settings. Use the shared web chime for ordinary native alerts, dedicated Android channels for the SLA sounds, and the OS notification sound when closed Web Push cannot select an audio asset.
- **CH-NOTIFY-014** — MUST surface the active Android delivery mode and refresh the native badge on cold launch, warm resume, and reconnect after the device is registered. Reconcile against the signed-in account's existing unread count without requiring a new notification. Restore the native unread notification silently using an ungrouped channel and clear it at zero. Preserve Android channel settings and use stable, readable sound URIs. Verify the badge with preexisting unread notifications, and verify sound and delivery with a real new alert.
- **CH-NOTIFY-015** — MUST require app notification permission in the signed Android APK setup before opening the application. Android owns the permission prompt and settings; if permission is denied, show how to grant it before continuing. After the user allows it and signs in, register automatically for the current authenticated account. Keep Android registration subject to the existing approval and logout rules. Do not present an additional enable switch or test button in the APK. Browser and iOS Web Push retain their consent and setup controls.
- **CH-NOTIFY-016** — MUST keep standard Android badging and apply any manufacturer-specific update only to a supported active system launcher. Use the same authoritative and ordered unread count, clear with zero, and honor notification/channel badge settings. Send only the app component and count. Launcher restrictions must leave standard notifications and in-app counts usable. Verify numeric badges on physical devices before claiming manufacturer or model support.
  - The Vivo V2427 has been observed reporting `com.android.launcher3`. Route that shared package name to the Vivo update only when the active launcher is a system app and Android reports Vivo as the manufacturer or brand. Keep the Vivo permission check.
- **CH-NOTIFY-017** — The existing Android alert details MUST show the active system launcher's package, whether Android has a counted ticket alert, and whether a direct launcher update was requested or blocked. Refresh on launch. Keep this status device-local, omit the unread count and personal data, and distinguish a request to the launcher from a visible icon badge.
- **CH-NOTIFY-018** — MUST store the notification-preview preference per device for Android and browser/Home Screen push. When enabled, send only a short allowlisted event summary; never use notification messages, ticket data, identifiers, staff identity, or comments as preview text. When disabled, retain the generic body. Explain that device lock-screen privacy settings may still hide previews.
- **CH-NOTIFY-019** — MUST evaluate ticket SLA percentage alerts every working minute using the saved deadline and business calendar. Send only the current unsent milestone. If the first scan occurs at or after the deadline, suppress the expired 75% warning. These bell and email milestones are separate from the SLA sounds in CH-NOTIFY-012.
- **CH-NOTIFY-020** — MUST retain the current preview policy when refreshing the Android unread notification. Refresh using the latest unread event's allowlisted summary when enabled and generic text when disabled. Native delivery status may expose whether the active summary contains a preview, without exposing the content or unread count.

The Android launcher keeps delegated browser push as a fallback channel, while the signed APK uses native FCM for installed-app alerts. Keep these subscriptions separate and avoid duplicate sends on the same device. Device notification permission, browser site permission, app channel settings, and authenticated device registration are separate checks.

Validate that the Ticketing VAPID public/private keys are a matching pair. A test alert reports a safe reason for DNS, TLS, timeout, connection, or provider HTTP failures. Endpoint URLs, provider response bodies, signing keys, and proxy credentials stay server-side. Ticketing may use `WEB_PUSH_PROXY_URL` for an authorized outbound proxy. Direct HTTPS remains the default (PLAT-WEB-PUSH-003, INFRA-CONFIG-004).

## Validation

Verify an eligible opt-in, unauthorized/denied account, unavailable approval service, account switch/logout, generic payload, existing notification record/SSE despite push failure, expired endpoint cleanup, safe notification click, SMTP disabled and enabled, and an iOS Home Screen installation on a supported iOS version. Test mobile delivery over the deployed HTTPS origin; a LAN IP over plain HTTP is not a secure service-worker context.

## Related

- [Web Push pattern](../../platforms/web/web-push-notifications-pattern.md)
- [Native Android FCM pattern](../../platforms/mobile/native-fcm-notifications-pattern.md)
- [Administration and current unit approval](administration.md)
- [Ticketing notification semantics](ticketing.md)
- [Application access rules](../../security/authorization-pattern.md)
