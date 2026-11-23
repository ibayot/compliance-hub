---
id: PLAT-MOB-FCM
status: baseline
scope: "Native Android notifications for profile-enabled Android app targets"
triggers:
  - "Android FCM"
  - "native Android notifications"
  - "Android app alerts"
---

# Native Android FCM Notifications

## Guidelines

Use Firebase Cloud Messaging for a signed Android app when alerts must arrive while its shared web UI is closed. Keep browser Web Push as a separate channel for ordinary browsers and iOS.

## Why

A web page and a native Android package have different background execution and notification permissions. Browser push cannot stand in for the app's native notification service, and an Android package should not claim to support alerts until its server sender is configured.

## Structure

```text
committed in-app notification -> durable row + SSE
                              -> approved Android FCM registrations -> generic OS alert
                              -> approved browser push subscriptions -> generic browser alert
```

## Store Implementation

- The Android app obtains a Firebase Installation ID (FID) through the Firebase client SDK. The native launcher passes a short-lived handoff in the HTTPS URL fragment; frontend startup validates it and removes the fragment before rendering. A FID is a routing identifier, never an authentication credential. Bind it only after JWT authentication and current account approval.
- Ticketing owns the Android registration table and FCM sends. Store a keyed hash for uniqueness and encrypt the FID at rest. Never log the FID, Firebase access token, private service-account data, or complete provider response.
- The Android `google-services.json` contains public client configuration and belongs with that Android application. The server sender requires a distinct Firebase service-account JSON file, mounted read-only into Ticketing outside the repository. Set an explicit Firebase project ID and container-visible file path; do not place service-account contents, Firebase private keys, or signing material in frontend assets or Docker Compose text.
- Recheck current account/unit access before every send. Explicit logout removes the current device registration. Send only a generic title and body; keep ticket numbers, subjects, comments, staff identity, URLs with identifiers, MFA codes, and recovery data out of the OS notification.
- Keep Android app alerts optional and best-effort. A Firebase send failure must not block the durable notification or SSE. When FCM is accepted for a device, suppress browser push only for a browser subscription carrying the same device ID; otherwise preserve browser push as a fallback.
- The Android app must request the Android 13+ notification permission and define a stable notification channel with badges and the default system sound. Respect OS permission/channel settings; the app cannot force a sound or launcher badge if the user or device disables it.
- Test alerts target only the signed-in account and current device, are rate-limited, and do not add a row or unread count. Provider acceptance is not proof that the phone displayed the alert.
- Android FCM depends on Google Play services. Do not describe it as available on every Android device or confuse it with browser Push API support. The Android app uses the approved APK installation flow; Add to Home Screen remains a browser-install option for other supported surfaces, not the Android APK setup path.

## Rules

- **PLAT-MOB-FCM-001** — MUST keep Android app FCM, browser Web Push, and durable in-app notifications as separate delivery channels.
- **PLAT-MOB-FCM-002** — MUST derive registration ownership from the authenticated server request, recheck current account approval on send, and remove the current device registration on explicit logout.
- **PLAT-MOB-FCM-003** — MUST encrypt FIDs at rest, hash them for uniqueness, and keep service-account credentials outside source control and frontend delivery.
- **PLAT-MOB-FCM-004** — MUST use generic lock-screen content and MUST NOT put ticket or personal content in FCM payloads.
- **PLAT-MOB-FCM-005** — MUST preserve the durable notification/SSE path when FCM is missing or unavailable and suppress duplicate Web Push only after FCM accepts a matching device alert.
- **PLAT-MOB-FCM-006** — MUST expose permission, server configuration, provider acceptance, and device delivery as distinct states; never promise sound or badges independently of Android settings.
- **PLAT-MOB-FCM-007** — MUST strip the native handoff fragment before application rendering/navigation and MUST NOT treat its contents as authentication.
- **PLAT-MOB-FCM-008** — MUST verify Firebase client package identity, app label, signing fingerprint, Digital Asset Links, service-account project, and the installed APK independently before distribution.

## Validation

Check approved and denied accounts, permission grant/deny/revoke, current account switching and logout, stale registration cleanup, configured and absent service account, provider failure with notification/SSE still working, generic payload, one test alert without an unread row, matching-device duplicate suppression, browser and iOS Web Push unchanged, and cold/warm APK launches. Verify on a real supported Android device; a successful build or provider acceptance alone is not device-delivery evidence.

## Related

- [Compliance Hub notification contract](../../application/compliance-hub/notifications.md)
- [Web Push](../web/web-push-notifications-pattern.md)
- [Mobile lifecycle and permissions](lifecycle-permission-pattern.md)
- [Mobile navigation and distribution](navigation-distribution-pattern.md)
- [Firebase Android setup](https://firebase.google.com/docs/android/setup)
- [FCM Android receive](https://firebase.google.com/docs/cloud-messaging/android/receive-messages)
- [FCM HTTP v1 send reference](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)
