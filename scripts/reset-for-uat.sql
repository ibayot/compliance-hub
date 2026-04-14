-- ============================================================
-- reset-for-uat.sql
-- Compliance Hub — v0.6.13
--
-- Clears:
--   • All tickets (comments, ticket data)
--   • All users EXCEPT the super_admin account
--   • ALL role_definitions (including system ones)
--   • Attendance records for deleted users
--   • Tech attendance and related data
--
-- Keeps:
--   • super_admin user
--   • Units, office_days, documents, issuances, KPI configs
--
-- After running this script:
--   1. Restart the backend — system role definitions will be re-seeded automatically.
--   2. Log in as super_admin.
--   3. Add roles via Settings → Role Definitions (or let system ones serve as templates).
--   4. Add users with the real roles.
--
-- Safe to run with backend RUNNING or STOPPED.
-- All FK checks are disabled for the duration.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. Wipe ALL tickets and related data ─────────────────────────────────────
TRUNCATE TABLE ticket_comments;
TRUNCATE TABLE ticket_keyword_rules;

-- Clear FK cols on tickets first so TRUNCATE doesn't choke on self-refs
UPDATE tickets SET duplicate_of_id = NULL WHERE duplicate_of_id IS NOT NULL;
TRUNCATE TABLE tickets;

-- ── 2. Wipe attendance records ───────────────────────────────────────────────
TRUNCATE TABLE attendance;

-- ── 3. Remove all non-super_admin users ─────────────────────────────────────
DELETE FROM users WHERE role != 'super_admin';

-- ── 4. Remove ALL role_definitions (user will re-add after restart) ─────────
-- System roles are re-seeded automatically when the backend starts.
DELETE FROM role_definitions;

-- ── 5. Re-enable FK checks ───────────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 1;

-- ── 6. Sanity check ─────────────────────────────────────────────────────────
SELECT 'users remaining' AS check_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'tickets remaining',             COUNT(*) FROM tickets
UNION ALL
SELECT 'comments remaining',            COUNT(*) FROM ticket_comments
UNION ALL
SELECT 'role_defs remaining',           COUNT(*) FROM role_definitions
UNION ALL
SELECT 'attendance rows remaining',     COUNT(*) FROM attendance;
