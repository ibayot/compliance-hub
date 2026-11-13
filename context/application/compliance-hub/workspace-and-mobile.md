# Compliance Hub Workspace and Mobile

Use the shared [web UI and UX](../../design-system/page-patterns/web-ui-ux-pattern.md) and [mobile UI and UX](../../design-system/page-patterns/mobile-ui-ux-pattern.md) guides for task-level design and validation.

## Layouts and actions

Operations, Sectioned and Split Pane are presentation presets. Keep the capability-filtered sidebar groups, navigation spacing and type consistent between presets. The shell and breadcrumb surface follow the selected palette and light/dark mode. Use the same permitted actions, filters, data and deep links across presets. Use a side rail for compact filters or expandable Duties Map day details. Keep multi-field Report Builder parameters in the main content area, where they have room to wrap.

On phone widths, use the shared shell Back arrow for nested routes. A direct link falls back to an authorized parent. Page-owned Create/Add and Update controls may register a labelled plus or pencil shortcut with the shell. Show it only when the original is outside the usable viewport and keep its shadow local to the button. Include the fixed navigation, safe area and software keyboard when checking which controls are reachable. [Mobile navigation](../../../frontend/src/contexts/MobileNavigationContext.tsx) and [page action](../../../frontend/src/components/layout/MobilePageAction.tsx) are the shared owners. See DS-APPNAV-005/006 and DS-RESPACTIONS-006/007.

Keep Comments and Timeline in the same equal-height row where the Ticket Details width permits, and make escalation details conditional on an existing escalation. Ticket Details and Staff Directory share the profile-photo viewer. Verify the actual requester photo, the keyboard-accessible enlargement, portrait and landscape aspect ratios, and a usable fallback when no photo is available. Check ticket filters in focal-only and ticket-management accounts, including that Escalated To Me sits with the other filters. Scroll populated tables in each preset, then check a short result, an empty result and mobile Attendance's day view. See [canonical implementations](../../inventory/canonical-implementations.md) and DS-TABLE-006.

## Retest cases from owner feedback

Use these cases when related work is requested. They record places where a broad completion claim missed a visible requirement or interaction. Establish the current result by retesting the affected state.

| What was missed | Check before claiming it is done |
| --- | --- |
| A total revamp was reported while changes were concentrated on a few routes and some presets mainly differed by styling. | Inventory the requested page families, including tickets, duties, reports, documents, directory, settings and administration. Compare the same populated state across relevant presets. Report which families and presets were actually inspected. |
| Duties Map side details and the Ticket Details comment/timeline placement were missed. | Select an occupied day and expand an item in the side panel. Open a populated ticket wide enough for the requested row and inspect Comments and Timeline together. Check the escalation section with and without an escalation. |
| The requester avatar was shown as initials or could not open the full photo. | Open a ticket filed on another person's behalf, verify the displayed photo belongs to the actual requester, open and dismiss the enlarged photo, and check the missing-photo fallback. |
| Escalated To Me appeared in a separate oversized container for an escalation focal. | Render the same preset for focal-only and ticket-management accounts. Check the button placement and size with the filters actually available to each account. |
| The Sectioned ticket header showed overlapping rows while scrolling, and short lists left a large blank area. | Scroll a populated list in its actual container, then filter to one row and to zero. Observe header position, row overlap, scrolling and container height. |
| Floating mobile buttons duplicated visible page controls. | Scroll the original action into and out of view in both directions. Check the shortcut invokes the same action and does not obscure inputs, feedback or navigation. |
| Ticket reporting showed the wrong SLA classification after correction. | Start from a ticket whose effective correction changes its outcome, save via the correction flow, reopen it and check the weekly breakdown, including the relevant pause calculation. |

## Install and preview

- The [web install configuration](../../../frontend/public/manifest.webmanifest) and the [Capacitor wrapper](../../../frontend/capacitor.config.ts) use the shared web UI. The [profile quick menu](../../../frontend/src/components/layout/AppBar.tsx) offers the iOS Web Clip configuration on iOS and a signed Android download on Android when an approved `VITE_ANDROID_APK_URL` is configured. The [Web Clip handler](../../../backend/src/apps/ios-webclip-profile.ts) derives the destination from deployment configuration, with loopback allowed for local use. Verify the installed result on physical devices, including icon, window chrome, sign-in, navigation and notification entry.
- For local phone checks, use the [phone preview script](../../../frontend/scripts/preview-phone.mjs) on the developer-selected private network interface and keep the phone on a network or VPN that can reach it. Android emulator routing and cleartext are debug-only. Use the [Android build script](../../../frontend/scripts/build-android.mjs) for the signed release path. Verify the artifact independently before offering the link to users.
- [Notification policy](notifications.md) owns the web push and badge contract. Verify foreground, background and closed-app delivery, permission denial, account switching, sound and badge behavior on each supported installed/browser surface. Browser viewport checks establish layout evidence. Installed distribution and physical-device delivery need separate checks. See PLAT-MOB-DIST-004 and the [web platform patterns](../../platforms/web/INDEX.md).
