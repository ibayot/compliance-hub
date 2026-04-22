-- =============================================================================
-- v0.0.33 Migration: Add is_all_tickets and is_ticket_focal to role_capabilities
-- Database: compliance_hub_users (BASE TABLE) — VIEWs auto-inherit via SELECT *
-- Date: 2026-04-17
--
-- Changes:
--   1. Adds is_all_tickets column  — DB-driven replacement for canSeeAllTickets() derived logic
--   2. Adds is_ticket_focal column — DB-driven replacement for canAssignTickets() derived logic
--
-- Seeded roles for both columns:
--   super_admin, section_head, compliance_officer, cybersec, infosec,
--   desktop_sr, it_support_sr, pantawid_ict
--
-- VIEWs in compliance_hub_ticketing and compliance_hub automatically expose
-- new columns because they are SELECT * views. No VIEW changes needed.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS semantics
-- =============================================================================

ALTER TABLE `compliance_hub_users`.`role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_all_tickets` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Can see all tickets in the system (not restricted to own-submitted / own-assigned)'
    AFTER `is_ticket_settings_focal`,
  ADD COLUMN IF NOT EXISTS `is_ticket_focal` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Can manually assign/reassign tickets to any technician'
    AFTER `is_all_tickets`;

-- Seed: roles that see all tickets (management + senior technician level)
UPDATE `compliance_hub_users`.`role_capabilities`
   SET `is_all_tickets` = 1
 WHERE `role_value` IN (
   'super_admin',
   'section_head',
   'compliance_officer',
   'cybersec',
   'infosec',
   'desktop_sr',
   'it_support_sr',
   'pantawid_ict'
 );

-- Seed: roles that can manually assign/reassign tickets
UPDATE `compliance_hub_users`.`role_capabilities`
   SET `is_ticket_focal` = 1
 WHERE `role_value` IN (
   'super_admin',
   'section_head',
   'compliance_officer',
   'cybersec',
   'infosec',
   'desktop_sr',
   'it_support_sr',
   'pantawid_ict'
 );

-- Verification query (run manually after migration):
-- SELECT role_value, is_all_tickets, is_ticket_focal, is_ticket_settings_focal
--   FROM compliance_hub_users.role_capabilities
--  ORDER BY is_all_tickets DESC, role_value;
