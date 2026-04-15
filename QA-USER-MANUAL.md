# RICTMS Compliance Hub - QA User Manual

> **Release `v0.0.12` (QA Ownership Closure, 2026-04-14, `microservices` branch):** Verify: (1) **Users ownership** — `compliance_hub_users.users` is a BASE TABLE; `compliance_hub_ticketing.users` and `compliance_hub.users` are VIEWs only. (2) **Units ownership** — `compliance_hub.units` is a BASE TABLE; `compliance_hub_ticketing.units` and `compliance_hub_users.units` are VIEWs only. (3) **Attendance ownership** — `compliance_hub_users.attendance` is a BASE TABLE; `compliance_hub_ticketing.attendance` is a VIEW. (4) **No duplicate base tables** — there should be no BASE TABLE copy of `users` in ticketing/compliance, no BASE TABLE copy of `units` in users/ticketing, and no BASE TABLE copy of `attendance` in ticketing/compliance. (5) **Federated users endpoint** — call `GET /api/users/federated` and verify users are returned with `unitIds`/`unitNames`. (6) **Ticketing compatibility** — ticket listing, assignment/reassignment, and attendance pages still work with ownership views in place. (7) **Unavailability output retained** — stop a service and verify gateway/frontend still show service-unavailable messaging. (8) **Regression baseline** — backend tests pass, backend/frontend builds pass.

> **Release `v0.0.11` (QA Follow-up Closure, 2026-04-14, `microservices` branch):** Verify: (1) **Split DB names updated** — localhost DB list includes `compliance_hub`, `compliance_hub_users`, and `compliance_hub_ticketing`. (2) **Attendance table rename applied** — in `compliance_hub_ticketing`, table `attendance` exists and `tech_attendance` is no longer used by runtime flows. (3) **Legacy migration compatibility** — run migration script and confirm legacy attendance data still appears in `attendance` via compatibility copy path. (4) **Gateway availability payload** — call `GET /api/health` on gateway and confirm `services.users`, `services.ticketing`, and `services.compliance` booleans are present. (5) **Unavailable service API response** — stop one microservice and call one of its routes via gateway; response is `503` with `Service currently unavailable` message. (6) **Compliance route fallback UI** — with compliance service down, open compliance pages (`Documents`, `Repository`, `Issuances`, `Metrics`, `KPI`, `Reviews`, `Reports`, `MoV`) and confirm unavailable panel is shown. (7) **Sidebar service filtering** — service-scoped nav items hide automatically when their backing service is offline. (8) **Regression checks** — backend tests pass; backend/frontend builds pass.

> **Release `v0.0.10` (QA Findings Closure, 2026-04-14, `microservices` branch):** Verify: (1) **Legacy role exclusion in attendance** — users with roles `focal`, `technician`, `technician_desktop`, `technician_it_support`, `technician_it_staff`, and `technician_desktop_staff` are not included by attendance role filters. (2) **Centralized category grouping** — attendance categories `IT Support`, `Desktop Support`, `Pantawid ICT Support`, `ITOs`, and default `All (Technicians + ITOs)` return consistent role-grouped results. (3) **Role definitions source enforcement** — attendance lists follow current `role_definitions` entries (`assignable=true`) excluding `user` and `super_admin`. (4) **Attendance role-gated actions** — attendance set/bulk/set office day actions work for current named roles and no longer depend on removed legacy role constants. (5) **Regression baseline** — run backend build, frontend build, backend tests, and smoke suite; all must pass.

> **Release `v0.0.9` (QA Findings Closure, 2026-04-14, `microservices` branch):** Verify: (1) **Attendance default category meaning** — open Attendance tab and confirm default category reads `All (Technicians + ITOs)` and includes both groups. (2) **Category isolation** — switch to `IT Support`, `Desktop Support`, `Pantawid ICT Support`, and `ITOs`; each list must show only matching role group members (no cross-category leakage). (3) **ITO login auto-attendance** — login as an ITO/focal-equivalent account and verify attendance for today auto-creates/updates to `present`. (4) **Escalation dropdown population** — open ticket detail as escalation-capable role, click Escalate, and confirm focal users are listed based on configured escalation focal roles. (5) **No placeholder users in attendance** — verify attendance-facing lists do not show any former demo placeholder identities. (6) **Migration copy + cleanup script behavior** — run `backend/database/microservices-migrate.sql` and confirm destination DBs receive copied data; when `@cleanup_source_tables = 1`, non-compliance tables are removed from source DB. (7) **Regression checks** — backend tests pass, backend/frontend builds pass.

> **Release `v0.0.8` (QA Findings Closure, 2026-04-14, `microservices` branch):** Verify: (1) **Escalate action visibility** — open a ticket as `desktop_jr` or `it_support_jr`; `Escalate Ticket` is visible on non-terminal tickets. (2) **Escalation proof upload discoverability** — open ticket detail escalate dialog; confirm explicit `Upload Proof Photo(s)` button is shown and selected file count appears after selecting images. (3) **Focal escalation queue visibility** — login using focal/senior account, open Tickets page, click `Escalated To Me`; list updates to escalated assignments for the logged-in account. (4) **Escalated queue API behavior** — `GET /api/tickets?escalatedToMe=true` returns escalated tickets for current authenticated user. (5) **Split DB service mapping** — in compose microservices profile, users/ticketing/compliance services point to `ricms_users`/`ricms_ticketing`/`ricms_compliance` respectively. (6) **Legacy data movement** — run `mysql -h <host> -u <user> -p < backend/database/microservices-migrate.sql`; verify existing records appear in target DBs for users/ticketing/compliance. (7) **Rollback readiness** — if needed, revert `v0.0.8` commit and restore single shared DB routing.

> **Release `v0.0.7` (QA Follow-up, 2026-04-14, `microservices` branch):** Verify: (1) **Service DB split env wiring** — in compose microservices profile, users/ticketing/compliance services each use distinct DB names (`ricms_users`, `ricms_ticketing`, `ricms_compliance`). (2) **MariaDB init script** — on fresh DB bootstrap, `backend/database/microservices-init.sql` creates all service DBs and grants access to `ricms_user`. (3) **Users + Ticketing partial runtime** — start users (`4101`), ticketing (`4102`), gateway (`4000`) and confirm login + ticket CRUD + assign/reassign still work. (4) **Escalate button in ticket detail** — open ticket detail as technician on non-terminal ticket and verify `Escalate Ticket` button is visible. (5) **Proof image upload** — in Escalate dialog, attach image files and submit; request succeeds and escalation history shows proof attachment count. (6) **Escalation API multipart** — backend accepts `proofFiles` multipart payload on `POST /tickets/:id/escalate`. (7) **Rollback safety** — if split DB data parity is not ready, switch all services back to one shared DB (`DB_DATABASE`) and retest core flows.

> **Release `v0.0.6` (Compliance service extraction, 2026-04-14, `microservices` branch):** Verify: (1) **Users domain isolation** — `/api/auth`, `/api/users`, `/api/units` succeed through gateway and are served by users service (`4101`). (2) **Ticketing domain isolation** — `/api/tickets`, `/api/attendance`, `/api/ticket-settings` succeed through gateway and are served by ticketing service (`4102`). (3) **Compliance domain isolation** — `/api/documents`, `/api/document-types`, `/api/comparisons`, `/api/issuances`, `/api/metrics`, `/api/incidents`, `/api/cybersecurity`, `/api/kpi`, `/api/mov` succeed through gateway and are served by compliance service (`4103`). (4) **Startup scripts** — `npm run start:users:dev`, `npm run start:ticketing:dev`, `npm run start:compliance:dev`, and `npm run start:gateway:dev` all start successfully. (5) **Compose profile** — `docker compose --profile microservices up users-service ticketing-service compliance-service api-gateway` starts all split services. (6) **No cross-domain fallback dependence** — stopping compliance service should make compliance-domain routes fail while users/ticketing routes remain available.

> **Release `v0.0.5` (QA Implementation, 2026-04-14, `microservices` branch):** Verify: (1) **Reassign excludes unavailable technicians** — mark a technician `absent` or `out_of_office` for today, click Reassign from tickets table, and confirm the technician does not appear. (2) **Server-side safety net** — attempt direct reassignment request to an absent technician; API returns validation error and assignment does not change. (3) **Resolved/closed reassign state in table** — tickets table still shows reassign icon for `resolved`/`closed` rows but button is disabled. (4) **Terminal update-status hiding** — on ticket detail with status `resolved` or `closed`, `Update Status` button is hidden when logged in as technician, section head, compliance officer, or super admin. (5) **Strict microservices route behavior** — with users + ticketing + gateway only, calling unsupported `/api/*` endpoint returns `503` with strict-mode message. (6) **Backward compatibility safety** — users/auth/units/tickets/attendance/ticket-settings endpoints continue working through gateway on `4000`.

> **Release `v0.0.4` (Gateway Fix for Separated Services, 2026-04-13, `microservices` branch):** Verify: (1) **Gateway on 4000** — start gateway (`cd backend && npm run start:gateway:dev`) and confirm `http://localhost:4000/api/health` responds. (2) **Users service separated** — start users service (`npm run start:users:dev`) and confirm users/auth routes work through `http://localhost:4000/api/*`. (3) **Ticketing service separated** — start ticketing service (`npm run start:ticketing:dev`) and confirm ticket routes work through `http://localhost:4000/api/*`. (4) **No placeholder confusion** — old `services/users-service` and `services/ticketing-service` stubs are removed; backend app entrypoints are now authoritative. (5) **Manual startup without Docker** — use 3 terminals (users, ticketing, gateway). (6) **Docker startup** — `docker compose --profile microservices up users-service ticketing-service api-gateway`.

> **Stop running instances before restart:** Terminal method: press `Ctrl+C` in each running service terminal. If a port remains occupied, run `Get-NetTCPConnection -LocalPort 3000,4000,4101,4102` then `taskkill /PID <pid> /F` for stale processes.

> **Release `v0.0.3` (Full Users/Ticketing Microservice Runtime Split, 2026-04-13, `microservices` branch):** Verify: (1) **Users service standalone start** — in terminal A run `cd backend && npm run start:users:dev`; confirm service starts on `http://localhost:4101/api`. (2) **Ticketing service standalone start** — in terminal B run `cd backend && npm run start:ticketing:dev`; confirm service starts on `http://localhost:4102/api`. (3) **No forced monolith dependency** — both services can boot without running `npm run start:dev` monolith backend. (4) **Regression baseline** — run existing smoke script against monolith path and confirm pass (ensures no break to current runtime while transition branch is active). (5) **Docker optional** — `docker compose --profile microservices up users-service ticketing-service` starts both services in separate containers. (6) **Shutdown control** — services can be stopped independently per terminal (`Ctrl+C`) or via `docker compose --profile microservices down`.

> **Release `v0.0.2` (Microservices Kickoff, 2026-04-13, `microservices` branch):** Verify: (1) **Monolith baseline unchanged** — run existing smoke test and confirm all current core flows still pass. (2) **Users service boot** — start `services/users-service` and call `GET http://localhost:4101/api/health`; response shows `service=users-service` and `status=ok`. (3) **Ticketing service boot** — start `services/ticketing-service` and call `GET http://localhost:4102/api/health`; response shows `service=ticketing-service` and `status=ok`. (4) **Compose profile isolation** — run `docker compose --profile microservices up users-service ticketing-service`; verify optional services start without replacing monolith backend/frontend containers. (5) **No route cutover yet** — main Compliance Hub APIs continue to respond from monolith backend on port `4000`.

> **Release `v0.6.26` (QA Implementation, 2026-04-13):** Verify: (1) **Tickets page no auto-reminder modal** — with pending satisfaction tickets, navigate directly to Tickets page; reminder modal should not appear automatically. (2) **Dashboard reminder preserved** — login as the same requester and confirm dashboard can still show pending satisfaction reminder behavior. (3) **Unrated row highlighting** — in Tickets list, any requester ticket with `resolved/closed` status and no `satisfactionSubmittedAt` is visually highlighted with warning background. (4) **Unrated badge visibility** — highlighted rows also show an `Unrated` chip beside status. (5) **No regression in ticket actions** — opening details, assigning/escalating (staff), and satisfaction submission still function.

> **Release `v0.6.25` (QA Implementation, 2026-04-13):** Verify: (1) **Unrated reminder on account open** — login as requester with pending satisfaction tickets; dashboard opens with a warning modal (not toast). (2) **Unrated reminder on every new request** — click `New Ticket`; warning modal appears again when pending satisfaction exists. (3) **No new ticket while unclosed exists** — with any requester ticket still `open/assigned/in_progress/resolved/freeze`, submitting a new ticket is blocked with a clear error message. (4) **Timeline tie-order** — for a ticket where `created` and `auto_assigned` share timestamp, timeline shows `Ticket Created` before `Automatic Ticket Assignment`. (5) **Email override rollback target** — `.env` contains `EMAIL_TEST_OVERRIDE=mjdibay@dswd.gov.ph`. (6) **Email halted** — `.env` contains `EMAIL_ENABLED=false`; assignment/resolved/closed/rated actions do not send outbound email. (7) **Regression check** — existing ticket update, assignment, and satisfaction submission flows still complete successfully aside from intentional email suppression.

> **Release `v0.5.0` — IT Help-Desk Ticketing + Role System:** Verify: (1) **`user` role navigation** — sign in as a user with role `user`; sidebar shows only "Dashboard" and "Tickets"; Documents, Repository, Issuances, KPI, Settings, and User Manual are not visible. (2) **User Dashboard** — Dashboard shows 4 ticket-count tiles (Open, In Progress, Resolved, Closed), a "Client Satisfaction" card with a `LinearProgress` fill-rate %, and a "My Tickets" quick-action button. (3) **New Ticket (user)** — click "New Ticket" on Tickets page as `user` role; dialog shows Support Type (Desktop Support / IT Support), Subject, Description, Priority; submit creates a ticket with number TKT-YYYY-NNNN. (4) **Ticket list scoping** — `user` sees only their own tickets; staff (focal, reviewer, super_admin) see all tickets. (5) **Assign Technician** — as focal/super_admin, open a ticket and click "Assign Technician"; dropdown filtered to technicians whose role matches ticket type (`technician_desktop` for Desktop Support tickets). (6) **Satisfaction rating** — requester of a Resolved ticket sees "Rate Resolution" button; clicking opens star-rating dialog; submitting persists rating and removes the button. (7) **Google sign-in → `user` role** — a brand-new Google account that has never existed in the system receives `user` role after sign-in. (8) **Existing Google account** — an existing staff member who signs in via Google preserves their previously assigned role. (9) **Admin-create → `focal` default** — when Super Admin creates a new user without specifying a role, the role defaults to `focal`. (10) **Email autocomplete** — in Settings > User Management > Create New User, typing an email fragment in the Email field shows matching suggestions from registered users. (11) **Ticket detail** — opening a ticket detail page shows Ticket Number (TKT-YYYY-NNNN), Subject, Type, Priority, Status chips, Description, Resolution Notes (if set), Comments with Internal badge, and Assign/Update-Status buttons for staff.

> **Release `v0.6.24` (QA Email Addendum, 2026-04-13):** Verify: (1) **Assignment mail flow** — assign a ticket to a technician; notification is generated for technician. (2) **Resolved mail flow** — mark ticket as resolved; requester notification includes instruction to rate technician. (3) **Closed mail flow** — close a resolved ticket; technician receives closure notification. (4) **Rated mail flow** — requester submits satisfaction rating; technician receives rated notification. (5) **Override routing check** — while `EMAIL_TEST_OVERRIDE` is set, all above emails are received at `ibayatucv@gmail.com` regardless of real recipient address. (6) **Repeated ticket create stability** — create tickets repeatedly in one session; ticket creation should continue without internal-server-error from duplicate ticket number.

> **Release `v1.5.0.1` (QA Fix Checkpoint 22, 2026-03-25):** Verify: (1) **Backend starts cleanly** — `npm run start:dev` in `backend/` reaches `Nest application successfully started` with no `EntityMetadataNotFoundError` in the log. (2) **Port 4000 listening** — `netstat -ano | findstr ":4000"` shows a `LISTENING` entry. (3) **Email/password login works** — POST `http://localhost:4000/api/auth/login` with `{"email":"admin@rictms.gov.ph","password":"password123"}` returns `200` with `accessToken` and `user.role = "super_admin"`. (4) **All accounts use password123** — repeat for `reviewer@rictms.gov.ph` and other seeded accounts; all return valid sessions. (5) **Google sign-in button visible** — load `http://localhost:3000/login`; Google button appears. (6) **Smoke suite green** — run `./smoke-test.ps1` from workspace root; output ends with `--- ALL SMOKE TESTS PASSED ---`.

> **Release `v1.5.0.1` (QA Iteration 26, 2026-03-24):** Verify: (1) **No "Register with Gmail" button** — the login page has no toggle to switch into a registration mode; there is no "Register with Gmail", First Name, or Last Name field. (2) **Google button always visible** — when `VITE_GOOGLE_CLIENT_ID` is set, the Google sign-in button appears on the initial login view (not hidden inside a register mode). (3) **English Google button** — the Google sign-in button label reads "Sign in with Google" in English regardless of browser locale. (4) **Non-gmail Google account accepted** — a valid Google account that is not `@gmail.com` (e.g., a Google Workspace account) can sign in via Google button without a "Only Gmail accounts are allowed" error. (5) **Local account login unchanged** — existing email/password login still works with no regression. (6) **`POST /auth/register-gmail` returns 404** — calling that endpoint from a REST client returns `404 Not Found` (route removed). (7) **Smoke suite green** — run `./smoke-test.ps1`; output ends with `ALL SMOKE TESTS PASSED`.

 — the login page has no toggle to switch into a registration mode; there is no "Register with Gmail", First Name, or Last Name field. (2) **Google button always visible** — when `VITE_GOOGLE_CLIENT_ID` is set, the Google sign-in button appears on the initial login view (not hidden inside a register mode). (3) **English Google button** — the Google sign-in button label reads "Sign in with Google" in English regardless of browser locale. (4) **Non-gmail Google account accepted** — a valid Google account that is not `@gmail.com` (e.g., a Google Workspace account) can sign in via Google button without a "Only Gmail accounts are allowed" error. (5) **Local account login unchanged** — existing email/password login still works with no regression. (6) **`POST /auth/register-gmail` returns 404** — calling that endpoint from a REST client returns `404 Not Found` (route removed). (7) **Smoke suite green** — run `./smoke-test.ps1`; output ends with `ALL SMOKE TESTS PASSED`.

> **Release `v1.5.0.1` (QA Iteration 25, 2026-03-24 — Hotfix):** Verify: (1) **Backend starts without errors** — `npm run start:dev` in `backend/` should reach `Nest application successfully started` with no `DataTypeNotSupportedError` or `EntityMetadataNotFoundError` in the boot log. (2) **Port 4000 is listening** — `netstat -ano | findstr ":4000"` shows a `LISTENING` entry. (3) **Google sign-in button visible** — load the login page (`http://localhost:3000/login`); a Google sign-in button should appear below the email/password form. (4) **Smoke suite** — run `./smoke-test.ps1`; output should end with `ALL SMOKE TESTS PASSED`. (5) **Regression check** — email/password login for an existing local user still works normally.

> **Release `v1.5.0.1` (QA Iteration 24, 2026-03-24):** Verify: (1) **Google sign-in button visibility** — on login page, Google button appears only when `VITE_GOOGLE_CLIENT_ID` is configured. (2) **Google login success path** — sign in using a valid Gmail account via Google; app returns authenticated session and lands on dashboard. (3) **Google verified-email enforcement** — backend rejects Google token payloads without verified email claim. (4) **Gmail-only enforcement for Google login** — non-`@gmail.com` Google accounts are rejected with validation error. (5) **JWT issuer/audience tamper protection** — modify a valid token's `iss` or `aud` and call protected endpoint; request is rejected by JWT strategy. (6) **Refresh-token issuer/audience enforcement** — tampered refresh token fails on `/auth/refresh`. (7) **Provider persistence check** — newly created Google user record stores provider identity (`auth_provider=google`, `google_sub` set), while local users remain `auth_provider=local`. (8) **Backward compatibility** — existing email/password login still works for local accounts.

> **Release `v1.5.0.1` (QA Iteration 23, 2026-03-24):** Verify: (1) **Ticketing visibility** — login as each existing role (`super_admin`, `reviewer`, `focal`, `technician`, `auditor`); `Ticketing / Knowledge Base` is visible in sidebar and page opens without Access Restricted screen. (2) **Everyone can submit** — as non-super-admin role, create a ticket successfully from `/dashboard/tickets`. (3) **Gmail self-registration** — from login page choose registration mode, submit `@gmail.com` email + password + names; success toast appears; sign in with newly created account works. (4) **Gmail-only enforcement** — attempt self-registration with non-gmail address and confirm API returns validation error. (5) **Main focal assignment control** — user without `ticketMainFocal` cannot use assignment/technician-governance endpoints; super admin or main focal can assign ticket via detail page assignment control. (6) **Lower-level technician eligibility** — assigning ticket to user not tagged `ticketTechnician` fails; after toggling user as lower-level technician it succeeds. (7) **Technician roster management** — main focal/super admin can toggle technician switch in ticket detail roster; roster persists after refresh. (8) **Settings role-definition disabled reason** — when all role codes exist, Add Role Definition button is disabled and explanatory text is shown.

> **Release `v1.5.0.1` (QA Iteration 22, 2026-03-24):** Verify: (1) **Separator line margins** — in the printed output, the horizontal separator line above the footer text spans from the left margin to the right margin exactly; it does not overflow past either margin. (2) **h2 title spacing** — the main report title ("INFORMATION SECURITY MANAGEMENT SYSTEM...") has visible space below it before "Period:" or "Summary" text. (3) **Signature block — auto-fill** — open MoV Builder > Report Settings > "Signature Block" section; the "Prepared by" Name/Position/Designation fields should be pre-filled from your logged-in user account. (4) **Signature block — print** — generate any register report and print; the last page should show a "Prepared by / Approved by" block at the bottom of the body content (before the page footer margin); names appear in ALL CAPS bold, position and designation on the line below. (5) **Signature block — preset** — save a preset that includes signature data; reload page; load the preset; signature fields should be restored. (6) **positionFull field** — navigate to Settings > User Management; Create New User and Edit User dialogs should show three fields: "Position (Abbreviated)" (e.g., ITO I), "Full Position Title" (e.g., Information Technology Officer I), and "Designation"; all three should save and persist correctly.

> **Release `v1.5.0.1` (QA Iteration 21, 2026-03-24):**** Verify: (1) **Summary line-height** — in the printed output, "Active register entries", "Marked Compliant", "Readiness", and "Added Entries" lines in the Summary section have compact 1.15 line-height spacing with no extra gaps between items. (2) **No body margin** — report content fills the print content zone edge-to-edge (no 24px indent on all sides from injected `body { margin: 24px }` style). (3) **Table top/bottom spacing** — tables have no extra vertical margin above/below in print; they sit flush against surrounding content. (4) **No regression** — footer placement, header images, presets, page count, and row splitting remain correct.

> **Release `v1.5.0.1` (QA Iterations 18–20, 2026-03-24):** Verify: (1) **Header logos** — DSWD and Bagong Pilipinas logos appear side-by-side on the first printed page; DSWD is visibly shorter (39px vs 45px) and both are vertically centered on the same horizontal axis. (2) **Image upload** — upload a PNG logo; check it appears without black background in print. Upload the same logo again after clearing — it must re-load (same-file re-upload works). (3) **Image compression** — print preview opens quickly (no long pause from large uncompressed base64). (4) **Preset save** — enter a preset name and click Save; success toast appears. Reload the page and use Load Preset dropdown to restore the saved header/footer settings. (5) **Preset delete** — select a preset and click Delete; preset disappears from the dropdown. (6) **Footer separator** — only one separator line (`─` characters) appears after `Page X of Y`, spanning the full footer width; no extra border-top line above pagination. (7) **Line-height** — body paragraphs and heading content in print use compact 1.15 spacing; no extra top/bottom margin on headings or paragraphs.

> **Release `v1.5.0.1` (QA Iteration 17, 2026-03-23):**** Verify: (1) **Footer in correct position** — footer appears at the very bottom of each printed page, consistently, on every page. (2) **Page count correct** — `Page X of Y` shows the actual printed page count (not 46 or other inflated number from prior 0-width iframe reflow). (3) **Footer on every page** — including page 1, page 2, middle pages, and last page. (4) **First-page footer** — if enabled, page 1 shows the separate first-page footer body text; all subsequent pages show the main footer. (5) **Landscape orientation** — all pages are A4 landscape in the print dialog. (6) **Row splitting** — table rows split across pages; no blank whitespace from whole-row pushes.

> **Release `v1.5.0.1` (QA Iteration 16, 2026-03-23):** Verify: (1) **Landscape orientation** — print preview / print dialog shows the document in landscape A4, not portrait. (2) **Footer placement** — footer appears cleanly at the bottom of every printed page (inside the content area, not floating randomly mid-page). (3) **Page count** — `Page X of Y` shows the correct total page count in landscape pagination. (4) **Row splitting** — table rows that are taller than the remaining page space now split across pages rather than pushing entire rows to the next page and leaving whitespace. (5) **No layout regression** — report content (headers, tables, signature blocks) render as expected.

> **Release `v1.5.0.1` (QA Iteration 15, 2026-03-23):** Verify: (1) **Regression rollback** — report content placement matches pre-overreach behavior (no forced container-width/margin distortion). (2) **Page-margin control** — print uses page-level A4 margins (`L/R 0.5in`, `T/B 1in`) rather than extra content padding changes. (3) **Footer-band placement** — footer appears in bottom margin region, anchored from `0.5in` above page bottom baseline. (4) **Multiline footer reserve** — adding extra footer lines expands bottom reserve enough to prevent overlap with report content. (5) **First/subsequent footer sequencing** — separate first-page footer remains on page 1 only; subsequent footer starts on page 2. (6) **No print-flow regressions** — long-table row splitting across pages remains allowed.

> **Release `v1.5.0.1` (QA Iteration 14, 2026-03-23):** Verify: (1) **A4 margin baseline** — printed report uses side margins near `0.5in` and top/bottom near `1in`. (2) **Footer-zone placement** — footer appears in bottom margin area, not inside content rows. (3) **Offset rule** — footer starts around `0.5in` above page bottom and grows upward as lines increase. (4) **Dynamic content adjustment** — adding extra footer lines reduces usable content area so text/table does not overlap footer. (5) **Header offset behavior** — first-page header block is shifted toward top margin zone (`~0.5in` down from page top target behavior). (6) **Row break policy** — long table rows can break across pages (no forced whole-row push causing large whitespace).

> **Release `v1.5.0.1` (QA Iteration 13, 2026-03-11):** Verify: (1) **Bulleted automated checks** — returned-document remarks display each automated flagged check as a readable bullet line. (2) **Multiline readability** — line breaks in return remarks are preserved on document detail and archived-document remarks. (3) **Viewer display-title correction** — HTML preview heading shows the document display title instead of raw uploaded filename text (`*.docx`). (4) **MoV footer pagination token parsing** — entering `1` or `Page 1` as first footer line renders `Page X of Y` formatting. (5) **Footer formatting order** — print output shows pagination line, then separator line, then footer body text. (6) **Separate first-page footer parity** — with separate first-page footer enabled, first-page footer note follows the same pagination/separator/content format.

> **Release `v1.5.0.1` (QA Iteration 12, 2026-03-11):** Verify: (1) **Per-keyword number extraction operators** — Number Extraction template accepts one operator per keyword (`>=`, `<=`, `>`, `<`, `=`) with matching expected numbers. (2) **Return remarks brevity** — failed number checks in return remarks show concise entries (`keyword: actual did not satisfy operator expected`) without unrelated detail. (3) **Document detail download** — focal can download current version even for returned documents. (4) **Unit label cleanup** — no empty `()` after Unit when code is absent. (5) **MoV print footer/header layout** — footer is centered in footer area with separator and page-number section; first-page header is left aligned. (6) **Table header color parity** — sky-blue table headers appear both in app preview and printed output.

> **Release `v1.5.0.1` (QA Iteration 11, 2026-03-11):** Verify: (1) **Document detail declutter** — no `Refresh` button and no visible `Version History` panel. (2) **Compliant focal download** — for focal user with compliant document, `Download` appears and downloads the current version. (3) **Return remarks urgency** — returned document shows high-contrast remarks banner in both light and dark themes. (4) **Google Docs import** — Upload Document supports `Google Docs Link` + `Import from Google Docs`; imported doc appears in list and opens in Document Viewer. (5) **Viewer display name** — HTML fallback header in viewer shows display-name labeling rather than filename wording. (6) **MoV print layout** — printed report footer remains attached at page bottom, header remains anchored on first page, and long tables show improved border continuity on page breaks.

> **Release `v1.5.0.1` (QA Iteration 10, 2026-03-10):** Verify: (1) **Upload no-hang behavior** — uploading `cybersecurity_incident_summary_report_202603.docx` must complete quickly (no indefinite "Uploading..."). (2) **Auto-metrics after upload** — without manual reprocess, uploaded doc should auto-generate metrics and transition to `needs_revision` when thresholds fail. (3) **Expected failure check** — for `Users Trained: 1` vs metric `>= 10`, metrics should include at least one failed result and compliance should show returned/needs revision. (4) **Archived tab columns** — in Documents → Archived tab, table shows `Title`, `Type`, `Period`, `Status`, `Return Remarks`, `Archived Date`. (5) **Archived empty state** — when there are no archived docs, tab settles to a clear empty-state message instead of spinner-only behavior.

> **Release `v1.5.0.1` (QA Iteration 9, 2026-03-10):** Verify: (1) **Documents tabs** — focal user sees two tabs in Documents page: `Active Documents` and `Archived Documents`; no separate archived-page navigation is required. (2) **Archived tab data** — archived records appear in the Archived tab and active records remain in Active tab. (3) **Queue-outage fallback** — with Redis unavailable, upload still completes document processing end-to-end (status transitions to `READY` instead of staying `PENDING`). (4) **Metrics auto-check on upload** — upload `cybersecurity_incident_summary_report_202603.docx` and verify metrics execute; `Users Trained: 1` against expected `>= 10` fails and auto-generates a returned/needs-revision outcome. (5) **Manual reprocess fallback** — trigger reprocess on a stuck document and confirm metrics still run even if queue infra is down.

> **Release `v1.4.0` (2026-03-03):** Verify: (1) **Expanded issuance search baseline** — after reseed, Issuances include broader applicable references across laws, IRRs, standards, Executive Orders, DICT/NPC circular references, and NCSP planning context. (2) **Amendment metadata** — Add/Edit form supports `Is Amendment`, `Amended Issuance Number`, and `ICT Related Amendment Notes`. (3) **List column presence** — Issuances table includes `ICT Related Amendments` and correctly displays amendment/non-amendment rows. (4) **Modal completeness** — Applicability/Relevance modal shows amendment status and amendment notes when present. (5) **Build/seed health** — `npm run db:seed`, backend build, and frontend type-check complete successfully.

> **Patch (`v1.4.0`, 2026-03-03):** Verify: (1) **Persistent filter dropdowns** — Authority and Category filters are checkbox multi-select dropdowns; selecting one option does not remove other options from the dropdown list. (2) **Combined filter behavior** — multiple selected authorities/categories apply as OR within each group and AND across groups with Status filter. (3) **Manual upload assessment** — place PDFs under `issuance-file-drop/`, run `python scripts/classify_issuance_drop.py`, confirm output file `issuance-file-drop/classification-results.csv` is generated. (4) **No destructive scope change** — files classified as non-aligned are marked as `MARK_FOR_REMOVAL` or `MARK_FOR_REVIEW` in CSV; existing seeded issuances remain intact. (5) **Traceability update** — `ICT-ISSUANCE-RELEVANCE-MAP.md` contains complete applicable list and explicit exclusion/deferred reasons.

> **Patch 2 (`v1.4.0`, 2026-03-03):** Verify: (1) **AO/MC inclusion policy** — all AO/MC files in `issuance-file-drop/` are classified `INCLUDED` with `policy_group=INTERNAL_POLICY` and category `internal_policy_administrative_order` or `internal_policy_memorandum_circular`. (2) **Deep-dive output fields** — CSV includes `page_count`, `title_guess`, `key_topics`, `relevance_summary`, and `external_context`. (3) **Assessment markdown** — `issuance-file-drop/deepdive-assessment.md` exists and summarizes all processed files. (4) **Review queue precision** — unresolved files remain only under `MARK_FOR_REVIEW` and are listed in `ICT-ISSUANCE-RELEVANCE-MAP.md`.

> **Patch 3 (`v1.4.0`, 2026-03-03):** Verify: (1) **Public-service criterion** — issuance files with explicit public-service/process-improvement/transparency relevance are included by reassessment policy. (2) **RA-9485 handling** — `RA 9485 - Anti-Red Tape Act 2007.pdf` is classified `INCLUDED`. (3) **Sector-specific exception handling** — `DICT - Derpartment Circular No HRA 003 s2025.pdf` is deferred with reason indicating telecom-provider-only applicability. (4) **No pending manual-review residue** — final reassessment output shows zero `MARK_FOR_REVIEW` rows.

> **Patch 5 (`v1.4.0`, 2026-03-03):** Verify: (1) **Issuance attachment storage** — add/edit issuance can upload PDF/DOC/DOCX attachment; metadata persists and backend stores blob in DB. (2) **Title click behavior** — if `source_url` exists, title opens URL; if `source_url` is empty and attachment exists, title opens attached file inline. (3) **Actions overload reduction** — row actions are accessed through an ellipsis menu, preserving mapping/edit/delete/toggle and view applicability actions. (4) **Attachment view action** — when both link and attachment exist, actions menu includes `View Attached File` and `Download Attachment`. (5) **Pagination** — Issuances table displays page controls and changing page/rows-per-page works without breaking filtering.

> **Patch 4 (`v1.4.0`, 2026-03-03):** Verify: (1) **Internal policies in Issuances** — seeded records `issuance-041..050` are visible in Issuances list/filter results. (2) **DPO coverage** — `NPC-CIRCULAR-17-01` exists in Issuances and is filterable under circular category. (3) **Category label display** — category labels in filter chips/options display as readable title text (no underscore formatting). (4) **Reseed/build health** — `npm run db:seed` and frontend `npm run build` complete successfully.

> **Release `v1.3.0.22` (2026-03-03):** Verify: (1) **Dropdown filters** — Issuances filter controls are dropdown-style and include Authority, Category, and Status. (2) **Category filtering** — selecting a category (`law`, `circular`, `memorandum`, `irr`, `standard`, `guideline`) narrows list correctly. (3) **Status filtering** — selecting Active/Inactive/All returns matching issuances without breaking existing table/actions. (4) **Status management** — manage-role users can activate/deactivate an issuance from row action and from Add/Edit form status field; saved value is reflected in Status chip and subsequent fetch. (5) **Deep narrative quality** — applicability and relevance details in modal show expanded, implementation-level narratives after reseed. (6) **No regressions** — document mapping/edit/delete actions remain functional; backend/frontend smoke checks stay green.

> **Release `v1.3.0.21` (2026-03-03):** Verify: (1) **Comprehensive inclusion** — Issuances list includes broad ICT references across laws, circulars, memorandums, IRRs, ISO, and NIST entries after reseed. (2) **Table structure** — Issuances columns appear exactly as `Issuance Number | Title | Authority | Issue Date | Status | Mapped Documents | Actions`. (3) **Action parity** — original actions remain functional (link mapping, edit, delete where role-allowed). (4) **New action modal** — clicking the new info action opens a modal showing `issuance_type`, `applicability_scope`, and `relevance_notes` (or fallback details). (5) **Reseed/build health** — `npm run db:seed`, backend build, and frontend type-check complete successfully. (6) **Zero regression** — KPI, Reports, Repository, Documents, and Reviews core flows remain intact.

> **Release `v1.3.0.20` (2026-03-03):** Verify: (1) **Issuance baseline relevance** — Issuances list is limited to ICT-relevant operational/governance/safety items (no standards-only placeholders in default seed). (2) **Authoritative links** — seeded issuance links open valid authoritative sources (Official Gazette for Acts; NPC page for DPA IRR). (3) **Traceability map present** — `ICT-ISSUANCE-RELEVANCE-MAP.md` exists and contains per-issuance rationale + link. (4) **Reseed health** — `npm run db:seed` succeeds without errors. (5) **No regression** — KPI/Reports/Repository workflows remain functional after reseed.

> **Release `v1.3.0.19` (2026-03-03):** Verify: (1) **No forced tilt** — trend arrowheads in KPI and Reports should align to the true end-segment angle (near-flat trends can appear near-flat). (2) **Zigzag non-monthly trend** — for Quarterly/Semestral/Annual, Trend cells in KPI/Reports should show multi-point zigzag movement that reflects visible period points, not a simplified 2-point line. (3) **Monthly trend stability** — monthly Trend remains valid and directional with existing behavior. (4) **Data baseline unchanged** — reseed still returns 12 active metrics, 12 applicability rows, and 10 pending documents. (5) **Repository unaffected** — row-level View/Download and modal Download continue working.

> **Release `v1.3.0.18` (2026-03-03):** Verify: (1) **Subtle trend arrowhead tilt** — in KPI Unit Detail and Reports KPI tables, small score deltas render arrowheads with slight direction (~5°), not steep tilt. (2) **Metrics applicability isolation** — global set (`metric-001..004`) still applies broadly; IT-targeted set (`metric-005..008`) applies only to IT `ICT Security Assessment`; Finance-targeted set (`metric-009..012`) applies only to Finance `Finance Risk Report`. (3) **Seeded monthly queue samples** — `doc-017..022` are `Monthly Report` and remain visible in pending Documents queue. (4) **Repository row actions** — each repository row has View + Download actions side-by-side. (5) **Repository modal download** — opening preview modal shows a Download icon in the title bar and downloads the latest original file.

> **Release `v1.3.0.17` (2026-03-03):** Verify: (1) **Direction labels simplified** — in KPI Unit Detail and Reports single-unit KPI table, Direction shows glyph-only arrows (`↑` for higher-is-better, `↓` for lower-is-better) without text words. (2) **Trend arrowhead visibility** — sparkline arrowheads in KPI/Reports have stronger up/down tilt, visibly directional even when score delta is small. (3) **Seed command health** — run `npm run db:seed` in backend; command must complete successfully and report `Active metric templates: 12` and `Metric applicability rows: 12`. (4) **Metrics completeness** — Administration → Metrics shows 12 templates total (3 per type). (5) **Applicability completeness** — templates `metric-005..008` apply to `ICT Security Assessment`; templates `metric-009..012` apply to `Finance Risk Report`. (6) **Documents queue visibility** — focal-accessible pending queue includes seeded `doc-017..022` Jan/Feb/Mar 2025 unit reports.

> **Release `v1.3.0.16` (2026-03-04):** Verify: (1) **`lower_is_better` formula correction** — open KPI Unit Detail for a lower-is-better KPI (e.g., Incident Resolution Time, actual=3.1, target=4); normalized score must reward lower values (target/actual behavior, capped by scoring rule). (2) **KPI Direction column** — Unit Detail table shows direction indicators (`↑ Higher` or `↓ Lower`) per KPI. (3) **Reports Direction parity** — single-unit KPI table in Reports shows the same direction indicators. (4) **Trend arrowheads** — all trend sparklines in KPI and Reports tables render arrowheads indicating up/down movement. (5) **KPI band pie filter scope** — `KPIs by Performance Band` updates with selected year/frequency/period/unit filters and does not remain all-units when a unit filter is active. (6) **KPI band pie transparent logic** — partial/incomplete-unit KPI counts appear as transparent dashed `PARTIAL` slice (same logic style as unit band distribution). (7) **Repository table simplification** — repository document table no longer shows status/compliance columns; it keeps View and Download actions for compliant-ready records. (8) **Seeded Jan–Mar 2025 unit reports** — Documents data includes monthly January/February/March 2025 samples for both IT and Finance units (`doc-017..022` with versions).

> **Release `v1.3.0.15` (2026-03-04):** Verify: (1) **KPI monthly range basis** — set Year=2025, Frequency=Monthly, Month=March (and repeat on later months). Trend/chart basis must compare **previous month to selected month** only (Mar compares Feb→Mar; Apr compares Mar→Apr; etc.). January must still render from a 0-start baseline. (2) **KPI non-monthly trend basis** — set Quarterly/Semestral views and inspect Trend columns in Unit KPI Scores and Unit Detail tables; direction must be based on **historical average vs current period score** (not first visible point vs last point). (3) **Reports parity** — run the same period filters in Reports; Trend direction and range behavior must match KPI exactly. (4) **Reports legend removal** — KPI charts in Reports must render without Unit/KPI legends. (5) **Documents pending queue** — open Documents page; default list and Reset action must show **pending-only** rows. (6) **Reviews pending queue** — open Reviews page; queue should include pending-only rows consistent with Documents. (7) **Repository compliant output** — open Repository and verify documents are previewed in an inline modal (no route redirect) and list reflects ready/compliant outputs only. (8) **Metrics template count** — Administration → Metrics shows **12 templates total** (3 per type). (9) **Seeded pending 2026 samples** — pending per-unit sample docs appear in Documents/Reviews and are distinct from repository-ready samples. (10) **Issuance seed breadth** — Issuance list includes expanded COA/NPC/DBM/DICT and international standards references.

> **Release `v1.3.0.14` (2026-03-04):** Verify: (1) **Repository layout** — open the Repository page, expand 2026, click any period folder (e.g. "February"); the document list must appear **below** the folder grid at full container width with no horizontal scrollbar. Confirm there is **no "Type" column** in that table. (2) **KPI monthly chart range** — set Year=2025, Monthly=February; the X-axis must show **Jan and Feb** (not a blank label + Feb). IT Unit's line starts at its Jan score; Finance Unit's line starts at 0 for Jan and rises to its Feb score. Not a single floating dot for Finance. (3) **KPI Unit Detail Q3** — select Year=2025, Quarterly=Q3; click Finance Unit. The Unit Detail chart X-axis must show **only Jul, Aug, Sep** (not Jan through Sep). Finance has no Q3 data so the chart area is empty with the "partial period" message. (4) **KPI Unit Detail H2** — select Year=2025, Semestral=H2; click any unit. The Unit Detail chart must show **only Jul–Dec months**, not the full year Jan–Dec. (5) **Metrics — 3 templates per type** — go to Administration → Metrics; there should now be **12 templates** visible (3 section_check, 3 keyword_check, 3 property_check, 3 date_check). Confirm `metric-005` through `metric-012` appear and have the correct applicability filters. (6) **Metrics — applicability isolation** — open `doc-013` (IT Policy Document) on the Document detail page → Metrics tab; it must show results for **metric-001 to 004 only** (the 4 global templates). Open `doc-011` (ICT Security Assessment); it must show results for **metric-001 to 008** (4 global + 4 IT-targeted). Open `doc-012` (Finance Risk Report); it must show **metric-001 to 004 + 009 to 012** (4 global + 4 Finance-targeted). (7) **Repository completeness** — after re-seeding, the Repository page must show docs in both 2025 and 2026 year accordions, with at least February 2026 bucket containing doc-009 through doc-014.

> **Release `v1.3.0.13` (2026-03-04):** Verify: (1) **KPI — Unit Detail partial period** — select Year=2025, Quarterly Q3 2025; click the **Finance Unit** row in the unit scores table. The Unit Detail line chart must show Finance's Q1–Q2 trend data (not a blank "No trend data" message). (2) **KPI — Chart 0-anchor** — open any unit detail or all-units chart for any period; all trend lines must *start at 0* (bottom-left), not at the first data value. (3) **KPI — KPI detail X-axis** — in Unit Detail, the per-KPI line chart x-axis must show month abbreviations (Jan, Feb, Mar…), not quarterly-relative labels. (4) **KPI — KPI detail table name** — KPI detail table first column must show the full **KPI name** in bold with the **code** below it in grey caption text (not just the code). (5) **Reports — Matching layout** — open Consolidated Reports, same period; the KPI Scores section all-units table must have **Color / Score / Trend / # KPIs** columns (matching the KPI module). Single-unit table must have Color, KPI name+code, and Trend columns. (6) **Reports — KPIs Requiring Attention** — select a period where any KPI has a Red or Amber band; a highlighted "KPIs Requiring Attention" table must appear between the KPI Scores section and the Document Submissions section, listing the affected KPIs with score, band, and actual value. (7) **Repository — sample docs** — with the seeded database, open `GET /api/documents/repository`; years 2025 and 2026 must each be present with at least Q1/Q2 and monthly buckets populated. (8) **User Manual** — log in as any reviewer/super_admin; navigate to `/dashboard/user-manual`; "Consolidated Reports" and "Report Repository" cards must appear in the module list and open detail dialogs with correct field descriptions.

> **Release `v1.3.0.12` (2026-03-03):** Verify: (1) **Score fix** — set Year=2025, Month=6, unit=IT, open Unit Detail for any `lower_is_better` KPI (e.g. KPI-IT-002 "Incident Resolution Time", actual=3.1, target=4); normalized score must show **77.5** (not 100). (2) **Unit Detail header** — composite score is displayed as a **colored Chip** (green/amber/red background with white bold text), no "• Band: X" text. (3) **Unit Detail incomplete period** — select Q3 2025, unit=Finance; the KPI table should show *"No KPI data available for this unit/period (partial period)"* instead of an empty table. (4) **January monthly chart** — set Month=1 (January) with any year/unit that has data; the trend line must start from 0 and go up to the January score (not a lone isolated dot). (5) **Trend arrows Q/S** — set Quarterly Q2 2025 and click any unit; the Trend column sparklines must reflect the actual H1 slope (not a flat line). (6) **KPIs by Performance Band** second pie chart appears alongside "Units by performance band" in a side-by-side layout. (7) **Reports "All Units" card** — generate a report with no unit selected; Card 2 must read "All Units / Reporting Scope" (no raw count number). (8) **Reports section title** — when a unit is selected, the KPI section heading reads "KPI Scores"; when "All Units", it reads "KPI Scores by Unit".

> **Release `v1.3.0.5` (2026-02-27):** Verify: (1) KPI Detail table Trend column sparklines are **diagonal** — when previous period has no data, the line goes from bottom-left (0) to the current score at top-right; when both periods have data and values differ, the slope reflects actual change. (2) A KPI with the same score in both periods (no change) correctly shows a **flat horizontal line** (expected). (3) Band Distribution pie chart shows **bold white numbers inside each colored slice** — no callout label text outside the pie. Legend below the pie is unchanged.

> Update (`v1.1.0-dev`, 2026-02-24): QA checks now include blob persistence validation and DOCX-to-PDF preview generation checks.

> **Release `v1.3.0.2` (2026-02-27):** Verify: (1) Dashboard → KPI opens directly to the **KPI Dashboard tab** (graphs visible on first load, no tab switching needed). (2) Unit score bar chart renders with color-coded bars (green/amber/red). (3) Overall KPI scorecard shows a colored progress bar and band label. (4) Clicking a unit row in the table populates the Unit Detail panel on the right. (5) Band Distribution pie chart shows with legend. (6) All charts show an empty-state message (not blank containers) when no data exists for the selected period. (7) KPI Master and KPI Monitoring tabs are only visible to super_admin, reviewer, section_head roles. (8) Focal users see the dashboard directly as the only tab.

> **Release `v1.2.0.4` (2026-02-26):** Verify: (1) Settings → Existing Users: name/unit/role/position/designation can be edited. (2) Staff ID is immutable — PATCH with `staffId` is rejected and Settings edit dialog keeps Staff ID disabled. (3) Settings → System Role Definitions supports add/edit role metadata (label/description/assignable). (4) Dashboard → KPI is visible; KPI Master uses `unit_id` from Units table. (5) KPI Monitoring records `entered_by_staff_id` and `entered_by_name`, and supports status `draft/locked` only. (6) KPI Dashboard enforces unit visibility for focal users and consolidated visibility for compliance/super-admin roles.

> **Release `v1.2.0.3` (2026-02-26):** Verify: (1) Documents pagination shows "Page 1 of 1" (not "Page 1-1 of 1"). (2) Login with a unit-assigned account → Settings → Account Information shows the assigned unit(s) as chips. (3) Login as focal user → Upload Document → unit auto-populates from assigned unit. (4) Settings → Create New User: error messages appear inside the modal (not below the card). (5) Unit multi-select in create user dialog shows checkboxes for each option. (6) Dashboard incident response section shows the full date (e.g., "Wednesday, February 26, 2026"). (7) All action success/error notifications are toast messages in top-right corner. (8) Creating a user with non-focal role (e.g., Reviewer) results in correct role in users table.

> **Release `v1.2.0.1` (2026-02-26):** Verify: (1) Units page shows accordion; click unit to expand and see Reportorial Document Types section with Add button. (2) Upload Document page: focal user's unit is auto-filled; selecting a doc type shows the expected filename. (3) Uploading a file with wrong name shows a validation error before submit. (4) Metrics page: "Reportorial Document Type" dropdown replaces Unit+DocType. (5) Settings → "Create New User" opens a dialog with unit multi-select. (6) Deactivate user in Settings now works (no more "Failed to update user status"). (7) Navigating to /dashboard/documents no longer highlights Dashboard in sidebar. (8) GET /api/metrics returns 16 templates.

> **Hotfix `v1.1.2.3` (2026-02-25):** DOCX document viewer fix verified — upload a `.docx` file, open Document Detail, click the viewer; it should render styled HTML inline. Verify security: `GET /api/auth/me` response must NOT contain `passwordHash`. Verify 4 metric templates at `GET /api/metrics`: section_check, keyword_check, property_check, date_check.

> Local QA tracking document (kept out of `v1.0.0` release push package).

## Purpose
This manual is for business and QA users who need to verify if core workflows are functioning correctly without reading code.

## Scope Covered
- Metrics template setup (Section, Keyword, Number Extraction, Date/Deadline)
- Submission frequency-based deadline checks
- Review workspace with inline digital document viewer and decision tagging
- Ticket issue documentation fields (`issue_type`, `resolution_steps`, `resolution_date`)
- Security baseline verification (rate limiting and protected action logging)
- CI/baseline validation checkpoints for release readiness
- Document return-for-revision workflow (remarks-required, audit-preserving)
- Super-admin management of dynamic ticket issue types and categories
- KPI Master, KPI Monitoring, KPI Dashboard, and KPI lookup table behavior (see **Section I**)

## Test Environment Prep
1. Start backend (`backend`): `npm run start:dev`
2. Start frontend (`frontend`): `npm run dev`
3. Login using a super admin or reviewer account.
4. Confirm API docs are reachable at `/api/docs`.

## Test Data Recommendation
Use one unit and one document type consistently during QA to reduce noise.

- Unit: `IT Unit` (or any existing unit)
- Document Type: `Report`
- Sample Periods:
  - Monthly: `2026-01`
  - Quarterly: `Q1`
  - Annual: `2026`

---

## A. Metrics Template Builder - How to Use

### A1. Section Rule Template
1. Go to Administration → Metrics.
2. Click `Create Template`.
3. Metric Type: `Section Rules`.
4. Add required sections (one per line), e.g. `Introduction`, `Findings`, `Recommendations`.
5. Assign Unit + Document Type.
6. Save.

Expected:
- Template appears in list.
- Type label shows `Section Rules`.

### A2. Keyword Rule Template
1. Create template with type `Keyword Rules`.
2. Enter keywords (comma/newline separated).
3. Set `Minimum Matches`.
4. Optional: enable `Case sensitive` and `Match whole words only`.
5. Save.

Expected:
- Template stores and edits correctly.
- Keyword options persist after reopening template.

### A3. Number Extraction Template
1. Create template with type `Number Extraction`.
2. Enter one or more keywords (comma/newline separated), e.g., `total incidents`, `resolved incidents`.
3. Set `Comparison` and one or more expected numbers.
4. Save.

Expected:
- Template stores and edits correctly.
- Comparison and expected number persist.

### A4. Date / Deadline Template with Submission Frequency
1. Create template with type `Date / Deadline Check`.
2. Choose submission frequency:
   - `Monthly`
   - `Quarterly`
   - `Annual` (requires Submission Month)
   - `Custom Period`
3. Set:
   - `Deadline Day` (1-28)
   - `Deadline Month Offset`
   - `Max Allowed Days Late`
4. Save.

Expected:
- Template stores and edits correctly.
- Frequency and timing values persist.

---

## B. Date/Deadline Behavior QA Matrix

Use this matrix to verify expected due-date logic:

| Frequency | Document Period Example | Meaning | Expected Baseline |
|---|---|---|---|
| Monthly | `2026-01` | January submission period | January end + offset month |
| Quarterly | `Q1` or `2026-Q1` | Quarter 1 period | March end + offset month |
| Annual | `2026` | Annual submission period | Configured submission month in year |
| Custom | Any custom string | Regex/group parsing + fallback handling | Rule-based fallback behavior using configured regex and month fallback |

Pass criteria:
- On-time documents show pass and non-negative compliance score.
- Late documents beyond configured allowance fail.

---

## C. Review Workspace QA (Inline Viewer + Decision Tagging)

1. Go to Dashboard → Reviews.
2. Pick a document in `ready` state.
3. Click `Review`.
4. Confirm inline PDF preview is visible in dialog.
5. Click each decision button once:
   - `Mark Compliant`
   - `Mark Non-Compliant`
   - `Mark Needs Revision`
6. Add remarks and submit one final decision.

Expected:
- Dialog shows digital preview without download.
- Review is submitted successfully.
- Latest review badge updates in table.

---

## C1. Document Return Workflow QA

1. Login as `super_admin` or `reviewer`.
2. Go to **Documents** and locate a `pending` document.
3. Click **Return**.
4. Attempt submit without remarks and confirm validation blocks action.
5. Enter remarks and submit.

Expected:
- Document is returned without deletion.
- Return action creates auditable review history (`needs_revision`).
- Returned document is hidden from super-admin/reviewer list views.
- Returned document remains visible to focal user for revision/update.

---

## D. Tickets QA (Issue Documentation)

### D0. Super Admin Metadata Management
1. Login as `super_admin`.
2. Open **Issues** page.
3. Create, edit, deactivate/activate, and soft-delete at least one Issue Type.
4. Repeat for Category entries.

Expected:
- New options are immediately available in ticket forms.
- Deactivated options do not appear in active-only selectors.
- Soft-delete is blocked when option is in use by an existing ticket.

### D1. Create Ticket
1. Go to Dashboard → Tickets.
2. Create ticket with fields:
   - Subject
   - Description
   - Issue Type
   - Category
   - Priority
   - Optional Resolution Steps
3. Save.

Expected:
- Ticket appears in list with Issue Type column.

### D2. Update Issue Documentation
1. Open ticket details.
2. Change `Issue Type`.
3. Set `Resolution Date`.
4. Add/modify `Resolution Steps`.
5. Save.

Expected:
- Changes persist after refresh.
- Status and resolution metadata remain consistent.

## E. Issuance Mapping QA

### E1. Link Document to Issuance
1. Login as `super_admin` or `reviewer`.
2. Go to **Issuances**.
3. Click the link icon on an issuance row.
4. Search for a document and click **Link**.

Expected:
- Document appears under **Linked Documents**.
- Issuance mapping persists after closing/reopening dialog.

### E2. Unlink Document from Issuance
1. In the same mapping dialog, click **Unlink** on a mapped document.

Expected:
- Document is removed from **Linked Documents**.
- Link is removed from `document_issuances` mapping.

---

## F. Quick Regression Checklist

- [ ] Backend and frontend both start without port conflicts.
- [ ] Metrics templates can be created, edited, and deleted.
- [ ] Date/deadline templates support monthly/quarterly/annual/custom frequencies.
- [ ] Reviews page shows inline digital viewer for ready documents.
- [ ] Manual review decisions persist and display correctly.
- [ ] Tickets support issue documentation fields end-to-end.
- [ ] No 500 errors on ticket create/update and review submit.
- [ ] Issuance link/unlink mapping works for compliance/super-admin roles.
- [ ] Return-to-focal workflow works with mandatory remarks and preserved audit trail.
- [ ] Dynamic issue type/category metadata CRUD works for super_admin only.

## G. Known Validation Constraints

- `Deadline Day` must be between 1 and 28.
- `Max Allowed Days Late` cannot be negative.
- For annual frequency, submission month must be 1–12.
- Inline preview requires processed preview availability (`ready` status).
- Issuance mapping actions are role-gated to compliance/super-admin users.

## H. Release Readiness QA Gate (v1.0.0)

- Backend build passes.
- Frontend build passes.
- Backend metric-engine tests pass.
- API smoke checks pass for login, metric template create/update, ticket create/update, and review submit.
- No blocking runtime 500 errors in tickets/reviews/metrics core paths.

---

## I. KPI Module - User Manual & QA Guide (v1.3.0.3)

### I.1 What Is a KPI Band?

A **KPI Band** is a color-coded performance classification applied to a unit or an individual KPI based on its **Normalized Score** (0-100 scale).

| Band  | Color  | Default Score Range | Meaning                                    |
|-------|--------|---------------------|--------------------------------------------|
| Green | Green  | 90 - 100            | Target met or exceeded - Performing well   |
| Amber | Amber  | 75 - 89.99          | Near target - Needs attention              |
| Red   | Red    | 0 - 74.99           | Below threshold - Immediate action needed  |

**How normalized score is calculated:**
- For *higher-is-better* KPIs: `(Actual / Target) * 100`, capped at 100.
- For *lower-is-better* KPIs: when `Actual ≤ Target` (on-track) → `(Actual / Target) * 100`; when `Actual > Target` (exceeds threshold) → `(Target / Actual) * 100`. Result capped at 100.  
  *Example: Incident Resolution Time, actual=3.1 h, target=4 h → score = 3.1/4×100 = **77.5**.*
- For *Yes/No* KPIs: `100` if actual = 1 (Yes), `0` if actual = 0 (No).

**Composite Unit Score** = Weighted average of all KPI normalized scores for a unit in a period.  
Where multiple KPIs have different weights, higher-weight KPIs influence the unit score more.

> **Example (seeded data, June 2025 Q2):**
> - IT Unit: avg score ~98.8 (GREEN) - all KPIs met target
> - Finance Unit: avg score ~95.9 (GREEN) - one KPI near amber
> - July 2025: Finance drops to RED (72.4) due to a Yes/No KPI miss (actual=0)
> - August 2025: IT drops to RED (72.0) due to a Yes/No KPI miss (actual=0)

---

### I.2 KPI Master - CRUD Steps

> Role required: `super_admin`, `reviewer`, or `section_head`

#### Create a KPI Master
1. Navigate to **KPI Monitoring & Dashboard** page.
2. Click the **KPI Master** tab (visible only to `super_admin`, `reviewer`, `section_head`).
3. Click **Add KPI**.
4. Fill the form:
   - **Code**: Unique identifier (e.g., `KPI-IT-001`). Cannot be changed after creation.
   - **KPI Name**: Descriptive name.
   - **Description**: Optional but recommended.
   - **Unit**: Select the organizational unit this KPI belongs to.
   - **Type**: `Measurement` (numeric) or `Yes/No` (binary).
   - **Unit of Measure**: e.g., `percent`, `hours`, `yes/no`.
   - **Direction**: `Higher is better` or `Lower is better`.
   - **Target Value**: Numeric goal (e.g., `99.9` for 99.9% uptime).
   - **Weight**: Relative importance within the unit's composite score (default: `1`).
   - **Frequency**: `Monthly`, `Quarterly`, `Semestral`, or `Annual`.
5. Click **Save**.

#### Edit a KPI Master
- Click **Edit** on any KPI row.
- Modify allowed fields (Code is locked).
- Click **Save**.

#### Delete a KPI Master
- Click **Delete** (restricted to `super_admin`).
- Also deletes associated monitoring records.

---

### I.3 KPI Monitoring - Encoding Periodic Values

> Role required: `super_admin`, `reviewer`, or `section_head`

#### Encode a KPI Monitoring Value
1. Navigate to **KPI Monitoring & Dashboard** > **KPI Monitoring** tab.
2. Click **Encode KPI**.
3. Select the **KPI** from the dropdown.
4. Select the **Unit**.
5. Set **Period Year** and **Period Month**.
6. Enter the **Actual Value**:
   - For `Measurement` type: enter the numeric result (e.g., `98.7`).
   - For `Yes/No` type: enter `1` for Yes, `0` for No.
7. Add optional **Remarks**.
8. Leave **Status** as `Draft` unless ready to finalize.
9. Click **Save**.

#### Lock a Monitoring Row
- Click **Lock** button on any `Draft` row to prevent further edits.
- Locked rows show a green `LOCKED` badge.
- Only `super_admin`, `reviewer`, `section_head` can lock.

---

### I.4 KPI Dashboard - Reading the Dashboard

The **KPI Dashboard** tab is visible to all roles.

#### Period Filter Controls
- **Period Year**: Select the reporting year.
- **Frequency**: Choose `Monthly`, `Quarterly`, `Semestral`, or `Annual`.
  - Monthly: select a specific month (1-12).
  - Quarterly: select Q1 (Jan-Mar, month 3), Q2 (Apr-Jun, month 6), Q3 (Jul-Sep, month 9), Q4 (Oct-Dec, month 12).
  - Semestral: select H1 (Jan-Jun, month 6) or H2 (Jul-Dec, month 12).
  - Annual: shows full-year data (uses December, month 12, as the reference month).
- Click **Refresh** to reload data after changing filters.

> **Seeded test data tip:** Set Year = `2025`, Frequency = `Monthly`, then pick
> Month `6` (June), `7` (July), or `8` (August) to see pre-loaded data.
> For quarterly simulation, set Frequency = `Quarterly` and select `Q2` - this
> maps to June 2025 and shows: IT Unit GREEN (~98.8), Finance Unit GREEN (~95.9).

#### Scorecard Row (Top)
| Scorecard           | Shows                                           |
|---------------------|-------------------------------------------------|
| Overall KPI Score   | Weighted average across all reporting units     |
| Units in Dashboard  | Count of units with at least one KPI entry      |
| Monitoring Rows     | Total KPI entries for the selected period       |

The **KPI Band Scale** legend below the scorecards shows current threshold ranges with color-coded chips.

#### Unit KPI Scores (Bar Chart)
- Each bar represents a unit's composite KPI score for the period.
- Bar color indicates the performance band (green/amber/red).
- Long unit names are truncated with `...` and shown at an angle for readability.
- Click a unit row in the table below the chart to drill into KPI details.

#### Unit Detail Panel
- Shows the selected unit's name and a **colored Chip** for the composite score (green/amber/red background). No `"• Band: X"` text displayed.
- When the unit has no KPI data for the period (partial period), shows a *"No KPI data available for this unit/period"* message instead of a table.
- Line chart displays trend of each individual KPI over the period.
- Table lists KPI code, actual value, target value, normalized score, and trend sparkline.
- Trend sparklines now use the **first** and **last** `hasData` timeseries points as prev/curr, showing correct directional slopes for multi-point periods (Q/S/Annual).

#### Band Distribution (Pie Charts)
- **Units by performance band** (left): proportion of *units* in each performance band.
- **KPIs by Performance Band** (right, new in v1.3.0.12): count of *individual KPIs* (across all units) per band, based on the last `hasData` point for each unit.
- Both pies show bold white count numbers inside colored slices.

---

### I.5 Role-Scoped Visibility Rules

| Role           | Can View Dashboard | Can Drill Unit Detail | Can Manage KPI Master | Can Encode Monitoring |
|----------------|--------------------|-----------------------|-----------------------|-----------------------|
| `super_admin`  | All units          | All units             | Yes                   | Yes                   |
| `reviewer`     | All units          | All units             | Yes                   | Yes                   |
| `section_head` | Own unit only      | Own unit only         | Yes                   | Yes                   |
| `focal`        | Own unit only      | Own unit only         | No                    | No                    |
| `auditor`      | Own unit only      | Own unit only         | No                    | No                    |
| `technician`   | Own unit only      | Own unit only         | No                    | No                    |

---

### I.7 KPI Module Smoke Checks (v1.3.0.12)

> Tests for the v1.3.0.12 bug-fix release. Run in addition to all I.6 checks.

| #  | Test Step                                                                                                             | Expected Result                                                                                        |
|----|-----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| 1  | Year=2025, Month=6, click unit=IT, open Unit Detail, find KPI-IT-002 (Incident Resolution Time, actual=3.1, target=4) | Normalized score shows **77.5**, NOT 100                                                               |
| 2  | Same unit detail view: inspect the CardHeader subheader                                                               | Colored Chip with score value (e.g. "88.3" on green background); NO "• Band: green" text               |
| 3  | Set Quarterly Q3 2025, click Finance Unit → Unit Detail                                                               | "No KPI data available for this unit/period (partial period)" message instead of empty table            |
| 4  | Set Monthly, Month=January, any year with data → check all-units chart                                                | Chart line starts from 0 at the left anchor point and rises to the January score — no isolated dot      |
| 5  | Set Quarterly Q2 2025, click IT Unit → Unit Detail → Trend column                                                     | Sparklines are **diagonal** reflecting Jan→Jun slope, not flat/null lines                              |
| 6  | Scroll to Band Distribution section (any period with data)                                                            | Two pies side-by-side: "Units by performance band" (left) and "KPIs by Performance Band" (right)       |
| 7  | Open Reports page, generate report with **no unit selected**                                                          | Card 2 shows "All Units" + "Reporting Scope" label; no numeric count                                   |
| 8  | Generate report with a specific unit selected                                                                         | KPI Scores section header reads "KPI Scores" (not "KPI Scores by Unit")                                |
| 9  | Open KPI Dashboard → Unit KPI Scores table, set Quarterly Q2 2025                                                     | Trend column sparklines show directional slope (IT improved Q1→Q2, Finance dropped)                    |

---

### I.6 KPI Module Smoke Checks (v1.3.0.5)

> **Seeded data reference:** 10 KPI masters (5 for IT Unit, 5 for Finance Unit), 30 monitoring rows
> for year 2025 months 6 (June), 7 (July), 8 (August). Default dashboard period is current date
> so you must manually set Year=2025 and pick a month with data.

| #  | Test Step                                                                              | Expected Result                                         |
|----|----------------------------------------------------------------------------------------|---------------------------------------------------------|
| 1  | Load KPI page as `admin@rictms.gov.ph`                                                | No NaN SQL errors in backend; dashboard loads           |
| 2  | Set Year=2025, Frequency=Monthly, Month=6 (June), click Refresh                        | 10 monitoring rows; IT ~98.8 GREEN, Finance ~95.9 GREEN |
| 3  | Set Year=2025, Frequency=Quarterly, Q2, click Refresh                                  | Same June data shown; both units GREEN                  |
| 4  | Set Month=7 (July), Frequency=Monthly, click Refresh                                   | IT AMBER (~86.4), Finance RED (~72.4) due to Yes/No miss|
| 5  | Set Month=8 (August), click Refresh                                                    | IT RED (~72.0), Finance AMBER (~89.4) - band reversal   |
| 6  | Switch frequency to Annual, click Refresh                                              | Uses December (month 12) - no data shown (expected)     |
| 7  | Click a unit row, Month=7 (July), open Unit Detail; inspect Trend column sparklines    | Lines are diagonal: KPI-IT-002 steep drop (100→61.54); each KPI shows correct slope |
| 8  | Still in Unit Detail Month=6 (June, no May data): check sparklines                    | Sparklines start from bottom-left (0) and ascend diagonally to the June score |
| 9  | Band Distribution pie chart (any month with data)                                      | Bold white count numbers inside each colored slice; no callout text outside the pie; legend below unchanged |
| 10 | KPI Master tab: Create new KPI for any unit                                            | Saved successfully, appears in table                    |
| 11 | KPI Monitoring tab: Encode actual value for the new KPI                                | Saved as Draft                                          |
| 12 | Lock the encoded row                                                                   | Status shows LOCKED; Edit/Lock buttons hidden           |
| 13 | Login as a focal-role user, open KPI Dashboard                                    | Can view own unit only; no Master/Monitoring tabs        |
| 14 | Call `GET /api/kpi/dashboard/summary?periodYear=0&periodMonth=2` directly             | Returns HTTP 400 Bad Request (not 500 NaN SQL error)    |

---

### I.7 QA Checks - Documents/Repository/Knowledge Base/MoV (v1.3.0.13)

| #  | Test Step | Expected Result |
|----|-----------|-----------------|
| 1 | Open a document detail page with HTML preview fallback | Viewer header uses document display title (not raw uploaded filename). |
| 2 | View document period where `year=2026` and `period=202603` | Period displays as `2026-03` (no redundant `2026-202603`). |
| 3 | Upload file with wrong base filename | Toast shows concise instruction: `Invalid filename. Use "<expected>.docx" or "<expected>.pdf".` |
| 4 | Open upload form and inspect helper text under file picker | Guidance shows Google Docs flow: download as `.docx`/`.pdf` first, then upload. |
| 5 | Run metrics for files using compact period formats like `202602` | Date checks compute deadline using correct monthly period interpretation. |
| 6 | Trigger failing keyword/number metric | Result message includes explicit actual vs expected values and missing keyword/number details. |
| 7 | Open Repository page with mixed compliance states in source documents | Only compliant documents are listed. |
| 8 | Login as non-super-admin and inspect sidebar/modules | Knowledge Base menu is hidden and direct route access is restricted. |
| 9 | Open MoV generated report preview in dark mode | Generated report text remains dark/readable on white report background. |

