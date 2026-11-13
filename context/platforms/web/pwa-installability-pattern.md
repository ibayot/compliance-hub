---
id: PLAT-WEB-PWA
status: baseline
scope: "Web Platform; profile-enabled browser installation"
triggers:
  - "progressive web app"
  - "PWA installation"
  - "add to home screen"
---

# Progressive Web App Installability

## Guidelines

Treat browser installation as a web distribution path with explicit identity, launch behavior, and platform icons. It remains the same authenticated web application and does not replace a native application target.

## Why

Browsers can install a web application with a home-screen identity and a standalone launch. Platform-specific icon metadata prevents iOS from substituting a monogram or screenshot, while accurate manifest metadata makes Chromium installation predictable.

## Structure

```text
secure web origin
  -> HTML manifest link + platform icon links
  -> manifest identity / launch URL / display mode / sized icons
  -> browser installation -> existing web authentication and authorization

installation alone does not imply offline use or background push
```

## Store Implementation

- Keep the manifest at the active frontend's public root and link it from the HTML entry document.
- Provide actual 192x192 and 512x512 PNG icons for Chromium-based installation; add a maskable purpose only for artwork composed within the maskable safe area.
- Provide an explicit Apple touch icon and web-app title for iOS home-screen installation.
- Set `start_url`, `scope`, `id`, and `display` to the deployed application's real base path and launch behavior. Production installation requires HTTPS.
- If an iOS Web Clip profile is offered, include only the Web Clip payload; set `FullScreen` and `IsRemovable` to `true`, include a valid PNG icon, and point it at the configured public frontend URL. Keep `IgnoreManifestScope` false unless an approved workflow requires external navigation to remain fullscreen.
- Serve profile downloads with Apple's `application/x-apple-aspen-config` content type. A Web Clip remains a web shortcut; fullscreen launch does not establish Web Push support.
- A service worker is not needed merely to install the web app. Add one only for an explicitly scoped offline, update, or push feature, with a cache policy that protects authenticated and sensitive responses.
- Keep the web app subject to the same server-side session, authorization, and access policy as browser use.

## Rules

- **PLAT-WEB-PWA-001** — The web entry document MUST reference the manifest and the platform-specific home-screen icon.
- **PLAT-WEB-PWA-002** — Manifest icon declarations MUST match the dimensions and content of their actual image assets.
- **PLAT-WEB-PWA-003** — Manifest launch identity and scope MUST match the deployed application's real base path.
- **PLAT-WEB-PWA-004** — A PWA installability change MUST NOT add offline caching or push behavior implicitly.
- **PLAT-WEB-PWA-005** — Installed-web-app launch MUST continue through the application's existing authentication and authorization boundaries.
- **PLAT-WEB-PWA-006** — A profile-installed iOS Web Clip MUST include its real app icon and launch URL, set `FullScreen` to `true`, and remain removable.
- **PLAT-WEB-PWA-007** — A downloadable iOS configuration profile MUST use Apple's profile MIME type and a deployment-specific public frontend URL; local defaults MUST use `localhost` or `127.0.0.1`.
- **PLAT-WEB-PWA-008** — A fullscreen Web Clip MUST NOT be assumed to support Web Push; validate notifications separately on the installed iOS device.

## Validation

Parse the manifest, verify every icon's MIME type and pixel dimensions, verify entry-document links, and confirm install behavior on the supported iOS and Android browsers over HTTPS. For a profile-installed Web Clip, install the downloaded profile, confirm fullscreen launch and icon, verify in-scope and external navigation behavior, remove the profile, and independently test push support. Test local development using an eligible secure context such as localhost. Validate any separately added service-worker behavior against the explicit cache and push requirements.

## Related

- [Web Platform Pack](INDEX.md)
- [Responsive Layout and Web Assets](responsive-asset-pattern.md)
- [Mobile Navigation and Distribution](../mobile/navigation-distribution-pattern.md)
- [Security context](../../security/INDEX.md)
- [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
