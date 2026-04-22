-- =============================================================================
-- v0.0.32 Migration: Add is_ticket_settings_focal to role_capabilities
-- Database: compliance_hub_users (BASE TABLE) — VIEWs auto-inherit via SELECT *
-- Date: 2026-04-16
--
-- Changes:
--   1. Adds is_ticket_settings_focal column to role_capabilities
--   2. Seeds per-role values (1 for senior staff/focal/compliance/section_head/super_admin)
--
-- VIEWs in compliance_hub_ticketing and compliance_hub automatically expose
-- the new column because they are SELECT * views. No VIEW changes needed.
--
-- Idempotent: ALTER TABLE uses IF NOT EXISTS semantics via ADD COLUMN IF NOT EXISTS
-- =============================================================================

ALTER TABLE `compliance_hub_users`.`role_capabilities`
  ADD COLUMN IF NOT EXISTS `is_ticket_settings_focal` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Can access and manage full ticket settings/reports (vs. own-data-only view)'
    AFTER `is_escalation_focal`;

-- Seed: grant ticket-settings-focal to roles that manage tickets/reports at system level
UPDATE `compliance_hub_users`.`role_capabilities`
   SET `is_ticket_settings_focal` = 1
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

-- Verification query (run manually):
-- SELECT role_value, is_focal, is_ticket_settings_focal
--   FROM compliance_hub_users.role_capabilities
--  ORDER BY is_ticket_settings_focal DESC, role_value;
