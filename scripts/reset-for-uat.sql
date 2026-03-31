-- ============================================================
-- reset-for-uat.sql
-- Compliance Hub — v0.6.12
--
-- Clears:
--   • All tickets (comments, ticket data)
--   • All users EXCEPT the super_admin account
--   • All non-system custom role_definitions
--   • Attendance records for deleted users
--   • Tech attendance and related data
--
-- Keeps:
--   • super_admin user
--   • System (seeded) role_definitions  <-- re-seeded on backend restart anyway
--   • Units, office_days, documents, issuances, KPI configs
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
TRUNCATE TABLE tech_attendance;

-- ── 3. Remove all non-super_admin users ─────────────────────────────────────
DELETE FROM users WHERE role != 'super_admin';

-- ── 4. Remove all non-system (custom) role_definitions ──────────────────────
-- System roles have is_system = 1; they are re-seeded on backend [re]start.
DELETE FROM role_definitions WHERE is_system = 0 OR is_system IS NULL;

-- ── 5. Re-enable FK checks ───────────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 1;

-- ── 6. Sanity check ─────────────────────────────────────────────────────────
SELECT 'users remaining' AS check_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'tickets remaining',             COUNT(*) FROM tickets
UNION ALL
SELECT 'comments remaining',            COUNT(*) FROM ticket_comments
UNION ALL
SELECT 'custom role_defs remaining',    COUNT(*) FROM role_definitions WHERE is_system = 0
UNION ALL
SELECT 'attendance rows remaining',     COUNT(*) FROM tech_attendance;
